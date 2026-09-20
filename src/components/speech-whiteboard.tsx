"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MicIcon, PhoneOffIcon } from "lucide-react"
import type { Editor } from "tldraw"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { HighlightOverlay } from "@/components/HighlightOverlay"
import { LaserPointer } from "@/components/LaserPointer"
import { TutorCanvas } from "@/components/TutorCanvas"
import { describeAction } from "@/lib/tutor/actions"
import { delay, revealDrawnContent, statusForAction } from "@/lib/tutor/animation"
import { submitTutorInput } from "@/lib/tutor/client"
import { buildCanvasContext } from "@/lib/tutor/context"
import { executeTutorActions } from "@/lib/tutor/executor"
import type {
  ActionLogEntry,
  ConversationMessage,
  HighlightOverlayState,
  LaserOverlayState,
  TutorStatus,
} from "@/types/tutor"

type VoiceStatus = "idle" | "connecting" | "listening" | "ending" | "error"

type LiveSessionResponse = {
  transport?: { sdp?: string }
  error?: string
}

type LiveEvent = {
  type?: string
  delta?: string
  delegation?: { id?: string; target?: string }
  error?: { message?: string }
}

const SPEECH_PAUSE_MS = 1400
const DELEGATION_FLUSH_MS = 450
const MIN_COMMAND_LENGTH = 6
const UNMUTE_IDLE_MS = 1600
const UNMUTE_MAX_MS = 8000

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

function sendLiveEvent(channel: RTCDataChannel | null, payload: unknown) {
  if (!channel || channel.readyState !== "open") {
    return
  }
  channel.send(JSON.stringify(payload))
}

export function SpeechWhiteboard() {
  const editorRef = useRef<Editor | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const eventsRef = useRef<RTCDataChannel | null>(null)
  const microphoneRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const speechTimerRef = useRef<number | null>(null)
  const unmuteTimerRef = useRef<number | null>(null)
  const unmuteDeadlineRef = useRef<number | null>(null)
  const speechBufferRef = useRef("")
  const lastCommandRef = useRef("")
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  const conversationRef = useRef<ConversationMessage[]>([])
  const recentActionsRef = useRef<string[]>([])
  const finalizedRef = useRef(false)
  const pendingDelegationRef = useRef<string | null>(null)
  const handleLiveEventRef = useRef<(event: LiveEvent) => void>(() => {})

  const [editor, setEditor] = useState<Editor | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle")
  const [drawStatus, setDrawStatus] = useState<TutorStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [you, setYou] = useState("")
  const [assistant, setAssistant] = useState("")
  const [liveConfigured, setLiveConfigured] = useState<boolean | null>(null)
  const [tutorConfigured, setTutorConfigured] = useState<boolean | null>(null)
  const [laser, setLaser] = useState<LaserOverlayState | null>(null)
  const [highlight, setHighlight] = useState<HighlightOverlayState | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const [live, tutor] = await Promise.all([
          fetch("/api/live/session").then((response) => response.json()),
          fetch("/api/tutor").then((response) => response.json()),
        ])
        if (cancelled) {
          return
        }
        setLiveConfigured(Boolean(live.configured))
        setTutorConfigured(Boolean(tutor.configured))
      } catch {
        if (!cancelled) {
          setLiveConfigured(false)
          setTutorConfigured(false)
        }
      }
    }

    void loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const handleEditorMount = useCallback((mounted: Editor) => {
    editorRef.current = mounted
    setEditor(mounted)
  }, [])

  const setMicrophoneEnabled = useCallback((enabled: boolean) => {
    microphoneRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }, [])

  const clearUnmuteTimers = useCallback(() => {
    if (unmuteTimerRef.current) {
      window.clearTimeout(unmuteTimerRef.current)
      unmuteTimerRef.current = null
    }
    unmuteDeadlineRef.current = null
  }, [])

  const unmuteInput = useCallback(() => {
    clearUnmuteTimers()
    mutedRef.current = false
    busyRef.current = false
    setMicrophoneEnabled(true)
    sendLiveEvent(eventsRef.current, { type: "session.input_audio.unmute" })
  }, [clearUnmuteTimers, setMicrophoneEnabled])

  const muteInput = useCallback(() => {
    mutedRef.current = true
    setMicrophoneEnabled(false)
    sendLiveEvent(eventsRef.current, { type: "session.input_audio.mute" })
  }, [setMicrophoneEnabled])

  const scheduleUnmute = useCallback(() => {
    clearUnmuteTimers()
    unmuteDeadlineRef.current = Date.now() + UNMUTE_MAX_MS
    unmuteTimerRef.current = window.setTimeout(() => {
      unmuteInput()
    }, UNMUTE_IDLE_MS)
  }, [clearUnmuteTimers, unmuteInput])

  const bumpUnmuteIdle = useCallback(() => {
    if (!unmuteDeadlineRef.current) {
      return
    }
    if (Date.now() >= unmuteDeadlineRef.current) {
      unmuteInput()
      return
    }
    if (unmuteTimerRef.current) {
      window.clearTimeout(unmuteTimerRef.current)
    }
    unmuteTimerRef.current = window.setTimeout(() => {
      unmuteInput()
    }, UNMUTE_IDLE_MS)
  }, [unmuteInput])

  const executeActionsSequentially = useCallback(async (actions: ActionLogEntry["action"][]) => {
    const currentEditor = editorRef.current
    if (!currentEditor) {
      throw new Error("Whiteboard is not ready yet.")
    }

    const descriptions: string[] = []

    for (const action of actions) {
      if (action.type === "message") {
        continue
      }

      setDrawStatus(statusForAction(action))
      await delay(120)

      const [result] = executeTutorActions(currentEditor, [action], {
        stopOnFailure: true,
      })

      if (result.laser) {
        setLaser(result.laser)
      }
      if (result.highlight) {
        setHighlight(result.highlight)
      }

      descriptions.push(describeAction(action))

      if (!result.success) {
        recentActionsRef.current = [...recentActionsRef.current, ...descriptions].slice(-20)
        throw new Error(result.error ?? "A whiteboard action failed.")
      }
    }

    revealDrawnContent(currentEditor)
    recentActionsRef.current = [...recentActionsRef.current, ...descriptions].slice(-20)
  }, [])

  const drawFromSpeech = useCallback(
    async (spoken: string) => {
      const command = spoken.replace(/\s+/g, " ").trim()
      const currentEditor = editorRef.current
      if (
        !command ||
        command.length < MIN_COMMAND_LENGTH ||
        command === lastCommandRef.current ||
        busyRef.current ||
        !currentEditor
      ) {
        return
      }

      lastCommandRef.current = command
      busyRef.current = true
      muteInput()
      setDrawStatus("thinking")
      setError(null)
      setAssistant("")

      const nextConversation: ConversationMessage[] = [
        ...conversationRef.current,
        { role: "user", content: command },
      ]
      conversationRef.current = nextConversation

      const delegationId = pendingDelegationRef.current
      pendingDelegationRef.current = null

      try {
        const result = await submitTutorInput({
          message: command,
          context: buildCanvasContext(
            currentEditor,
            nextConversation,
            recentActionsRef.current
          ),
        })

        if (result.error) {
          throw new Error(result.error)
        }

        await executeActionsSequentially(result.actions)

        const spokenReply =
          result.assistantMessage.trim() || "Done. The whiteboard is updated."

        conversationRef.current = [
          ...conversationRef.current,
          { role: "assistant", content: spokenReply },
        ]
        setAssistant(spokenReply)
        sendLiveEvent(eventsRef.current, {
          type: "session.commentary.append",
          event_id: crypto.randomUUID(),
          delegation_id: delegationId,
          content: spokenReply.slice(0, 1500),
        })

        setDrawStatus("idle")
        scheduleUnmute()
      } catch (caught) {
        setDrawStatus("error")
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not draw from that voice command."
        )
        if (delegationId) {
          sendLiveEvent(eventsRef.current, {
            type: "session.thinking.append",
            event_id: crypto.randomUUID(),
            delegation_id: delegationId,
            content: "The whiteboard request failed. Ask the user to try again.",
          })
        }
        scheduleUnmute()
      }
    },
    [executeActionsSequentially, muteInput, scheduleUnmute]
  )

  const flushSpokenCommand = useCallback(
    (delayMs: number) => {
      if (speechTimerRef.current) {
        window.clearTimeout(speechTimerRef.current)
      }

      speechTimerRef.current = window.setTimeout(() => {
        const spoken = speechBufferRef.current
        speechBufferRef.current = ""
        void drawFromSpeech(spoken)
      }, delayMs)
    },
    [drawFromSpeech]
  )

  const queueSpokenCommand = useCallback(
    (delta: string) => {
      if (mutedRef.current || busyRef.current) {
        return
      }

      speechBufferRef.current += delta
      setYou(speechBufferRef.current.replace(/\s+/g, " ").trim())
      flushSpokenCommand(SPEECH_PAUSE_MS)
    },
    [flushSpokenCommand]
  )

  function cleanupVoice() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (speechTimerRef.current) {
      window.clearTimeout(speechTimerRef.current)
      speechTimerRef.current = null
    }
    clearUnmuteTimers()
    speechBufferRef.current = ""
    pendingDelegationRef.current = null
    mutedRef.current = false
    busyRef.current = false
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

  useEffect(() => {
    return () => {
      cleanupVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    handleLiveEventRef.current = (event: LiveEvent) => {
      if (event.type === "session.started") {
        setVoiceStatus("listening")
        return
      }

      if (event.type === "session.input_transcript.delta" && event.delta) {
        queueSpokenCommand(event.delta)
        return
      }

      if (event.type === "session.output_transcript.delta" && event.delta) {
        setAssistant((current) => `${current}${event.delta}`.replace(/\s+/g, " ").trim())
        bumpUnmuteIdle()
        return
      }

      if (event.type === "session.delegation.created" && event.delegation?.id) {
        pendingDelegationRef.current = event.delegation.id
        if (speechBufferRef.current.trim().length >= MIN_COMMAND_LENGTH) {
          flushSpokenCommand(DELEGATION_FLUSH_MS)
        }
        return
      }

      if (event.type === "error") {
        setError(event.error?.message || "GPT Live returned an error.")
        setVoiceStatus("error")
        return
      }

      if (event.type === "session.closed") {
        finalizedRef.current = true
        cleanupVoice()
        setVoiceStatus("idle")
      }
    }
  })

  async function startTalking() {
    if (voiceStatus === "connecting" || voiceStatus === "listening" || voiceStatus === "ending") {
      return
    }

    setError(null)
    setYou("")
    setAssistant("")
    speechBufferRef.current = ""
    lastCommandRef.current = ""
    pendingDelegationRef.current = null
    setVoiceStatus("connecting")
    finalizedRef.current = false

    try {
      const connection = new RTCPeerConnection()
      peerRef.current = connection

      connection.addEventListener("track", (event) => {
        if (event.track.kind !== "audio") {
          event.track.enabled = false
          event.track.stop()
          return
        }

        const audio = audioRef.current
        if (!audio) {
          return
        }

        audio.setAttribute("playsinline", "true")
        audio.srcObject = new MediaStream([event.track])
        void audio.play().catch(() => {
          setError("Allow audio playback to hear the tutor.")
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
        handleLiveEventRef.current(JSON.parse(String(data)) as LiveEvent)
      })

      events.addEventListener("close", () => {
        if (finalizedRef.current) {
          return
        }
        cleanupVoice()
        setVoiceStatus("idle")
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
      cleanupVoice()
      setVoiceStatus("error")
      setError(
        caught instanceof Error ? caught.message : "Could not start the voice session."
      )
    }
  }

  function stopTalking() {
    const events = eventsRef.current
    if (!events || events.readyState !== "open") {
      cleanupVoice()
      setVoiceStatus("idle")
      return
    }

    setVoiceStatus("ending")
    sendLiveEvent(events, { type: "session.close" })
    closeTimerRef.current = window.setTimeout(() => {
      cleanupVoice()
      setVoiceStatus("idle")
    }, 8_000)
  }

  const isLive = voiceStatus === "listening"
  const isBusy = voiceStatus === "connecting" || voiceStatus === "ending"
  const canStart = liveConfigured !== false && tutorConfigured !== false

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      <audio ref={audioRef} autoPlay playsInline className="tutor-voice-audio" />

      <div className="tutor-stage min-h-0 flex-1">
        <TutorCanvas onMount={handleEditorMount} />
        <LaserPointer editor={editor} laser={laser} onComplete={() => setLaser(null)} />
        <HighlightOverlay
          editor={editor}
          highlight={highlight}
          onComplete={() => setHighlight(null)}
        />
      </div>

      <div className="relative z-20 max-h-[40svh] shrink-0 overflow-y-auto border-t bg-card/95 p-4 text-card-foreground shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-sm font-medium">Speech to whiteboard</p>
                <Badge variant={isLive ? "secondary" : "outline"}>
                  {voiceStatus === "listening"
                    ? "Listening"
                    : voiceStatus === "connecting"
                      ? "Connecting"
                      : voiceStatus === "ending"
                        ? "Ending"
                        : "Ready"}
                </Badge>
                {drawStatus !== "idle" ? (
                  <Badge variant="outline">{drawStatus}</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Tap the mic, then say a command like “draw a green circle, then an arrow to a rectangle.”
              </p>
            </div>
            <Button
              type="button"
              size="icon-lg"
              variant={isLive ? "destructive" : "default"}
              className="size-14 rounded-full"
              disabled={isBusy || !canStart}
              onClick={() => {
                if (isLive) {
                  stopTalking()
                  return
                }
                void startTalking()
              }}
              aria-label={isLive ? "Stop talking" : "Start talking"}
            >
              {isBusy ? <Spinner /> : isLive ? <PhoneOffIcon /> : <MicIcon />}
            </Button>
          </div>

          {liveConfigured === false ? (
            <Alert>
              <AlertTitle>GPT Live is not configured</AlertTitle>
              <AlertDescription>
                Add AZURE_FOUNDRY_ENDPOINT, AZURE_FOUNDRY_API_KEY, and AZURE_FOUNDRY_MODEL=gpt-live-1.
              </AlertDescription>
            </Alert>
          ) : null}

          {tutorConfigured === false ? (
            <Alert>
              <AlertTitle>Whiteboard model missing</AlertTitle>
              <AlertDescription>
                Set AZURE_FOUNDRY_TUTOR_MODEL to a chat deployment such as gpt-4o. GPT Live cannot emit drawing actions by itself.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Something failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {(you || assistant) && (
            <div className="flex flex-col gap-1 text-sm">
              {you ? (
                <p>
                  <span className="text-muted-foreground">You: </span>
                  {you}
                </p>
              ) : null}
              {assistant ? (
                <p>
                  <span className="text-muted-foreground">Tutor: </span>
                  {assistant}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
