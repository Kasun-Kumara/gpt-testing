"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

const SpeechWhiteboard = dynamic(
  () =>
    import("@/components/speech-whiteboard").then((mod) => mod.SpeechWhiteboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-svh w-full" />
      </div>
    ),
  }
)

export default function Home() {
  return <SpeechWhiteboard />
}
