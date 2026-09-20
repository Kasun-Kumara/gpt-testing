"use client"

import { useEffect, useRef, useState } from "react"
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type Status = "idle" | "connecting" | "listening" | "ending" | "error"

type LiveSessionResponse = {
  session?: { id: string }
  transport?: { sdp?: string }
  error?: string
}

function waitForIce(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", onState)
      reject(new Error("Timed out while gathering ICE candidates."))
    }, 10_000)

    function onState() {
      if (connection.iceGatheringState !== "complete") {
        return
      }
      window.clearTimeout(timeout)
      connection.removeEventListener("icegatheringstatechange", onState)
      resolve()
    }

    connection.addEventListener("icegatheringstatechange", onState)
    onState()
  })
}

export function VoiceLive() {
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [you, setYou] = useState("")
  const [assistant, setAssistant] = useState("")
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const eventsRef = useRef<RTCDataChannel | null>(null)
  const microphoneRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const finalizedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const response = await fetch("/api/live/session")
        const data = (await response.json()) as { configured?: boolean }
        if (!cancelled) {
          setConfigured(Boolean(data.configured))
        }
      } catch {
        if (!cancelled) {
          setConfigured(false)
        }
      }
    }

    void loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cleanup() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    microphoneRef.current?.getTracks().forEach((track) => track.stop())
    microphoneRef.current = null
    eventsRef.current?.close()
    eventsRef.current = null
    peerRef.current?.close()
    peerRef.current = null
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
  }

  async function startTalking() {
    if (status === "connecting" || status === "listening" || status === "ending") {
      return
    }

    setError(null)
    setYou("")
    setAssistant("")
    setStatus("connecting")
    finalizedRef.current = false

    try {
      const connection = new RTCPeerConnection()
      peerRef.current = connection

      connection.addEventListener("track", (event) => {
        if (!audioRef.current) {
          return
        }
        audioRef.current.srcObject = new MediaStream([event.track])
        void audioRef.current.play().catch(() => {
          setError("Allow audio playback to hear the assistant.")
        })
      })

      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphoneRef.current = microphone
      for (const track of microphone.getAudioTracks()) {
        connection.addTrack(track, microphone)
      }

      const events = connection.createDataChannel("oai-events")
      eventsRef.current = events

      events.addEventListener("message", ({ data }) => {
        const event = JSON.parse(String(data)) as {
          type?: string
          delta?: string
          session?: { id?: string }
          error?: { message?: string }
        }

        if (event.type === "session.started") {
          setStatus("listening")
          return
        }

        if (event.type === "session.input_transcript.delta" && event.delta) {
          setYou((current) => `${current}${event.delta}`)
          return
        }

        if (event.type === "session.output_transcript.delta" && event.delta) {
          setAssistant((current) => `${current}${event.delta}`)
          return
        }

        if (event.type === "error") {
          setError(event.error?.message || "GPT Live returned an error.")
          setStatus("error")
          return
        }

        if (event.type === "session.closed") {
          finalizedRef.current = true
          cleanup()
          setStatus("idle")
        }
      })

      events.addEventListener("close", () => {
        if (finalizedRef.current) {
          return
        }
        cleanup()
        setStatus("idle")
      })

      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await waitForIce(connection)

      const sdp = connection.localDescription?.sdp
      if (!sdp) {
        throw new Error("Missing local SDP offer.")
      }

      const response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp }),
      })
      const result = (await response.json()) as LiveSessionResponse

      if (!response.ok || !result.transport?.sdp) {
        throw new Error(result.error || "Failed to start GPT Live.")
      }

      await connection.setRemoteDescription({
        type: "answer",
        sdp: result.transport.sdp,
      })
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not start the voice session."
      cleanup()
      setError(message)
      setStatus("error")
    }
  }

  function stopTalking() {
    const events = eventsRef.current
    if (!events || events.readyState !== "open") {
      cleanup()
      setStatus("idle")
      return
    }

    setStatus("ending")
    events.send(JSON.stringify({ type: "session.close" }))
    closeTimerRef.current = window.setTimeout(() => {
      cleanup()
      setStatus("idle")
    }, 8_000)
  }

  const isLive = status === "listening"
  const isBusy = status === "connecting" || status === "ending"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4">
      <audio ref={audioRef} autoPlay />

      <div className="flex flex-col items-center gap-3 text-center">
        <Badge variant={isLive ? "secondary" : "outline"}>
          {status === "listening"
            ? "Listening"
            : status === "connecting"
              ? "Connecting"
              : status === "ending"
                ? "Ending"
                : "Ready"}
        </Badge>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          GPT Live
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Speak a command. The model answers out loud.
        </p>
      </div>

      {configured === false ? (
        <Alert>
          <MicOffIcon />
          <AlertTitle>Connect Azure Foundry</AlertTitle>
          <AlertDescription>
            Add your endpoint, API key, and `gpt-live-1` deployment to `.env.local`,
            then restart the app.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Voice session failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        size="icon-lg"
        variant={isLive ? "destructive" : "default"}
        className="size-24 rounded-full"
        disabled={isBusy || configured === false}
        onClick={() => {
          if (isLive) {
            stopTalking()
            return
          }
          void startTalking()
        }}
        aria-label={isLive ? "Stop talking" : "Start talking"}
      >
        {isBusy ? (
          <Spinner />
        ) : isLive ? (
          <PhoneOffIcon />
        ) : (
          <MicIcon />
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        {status === "connecting"
          ? "Connecting to GPT Live…"
          : status === "listening"
            ? "Listening. Speak now."
            : status === "ending"
              ? "Ending the conversation…"
              : "Tap the microphone to start"}
      </p>

      {(you || assistant) && (
        <div className="flex w-full max-w-md flex-col gap-3 text-sm">
          {you ? (
            <p>
              <span className="text-muted-foreground">You: </span>
              {you}
            </p>
          ) : null}
          {assistant ? (
            <p>
              <span className="text-muted-foreground">GPT Live: </span>
              {assistant}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
