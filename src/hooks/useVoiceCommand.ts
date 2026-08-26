import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

export function useVoiceCommand() {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setStatus('unsupported')
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setStatus('listening')
      setErrorMessage(null)
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setStatus('error')
      setErrorMessage(event.error === 'not-allowed' ? 'Microphone access was denied.' : `Speech error: ${event.error}`)
    }
    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'processing' : prev))
    }

    recognitionRef.current = recognition
    return () => {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setErrorMessage(null)
    try {
      recognitionRef.current.start()
    } catch {
      // Ignore "already started" errors from rapid double-clicks.
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  return { status, transcript, errorMessage, start, stop, reset, setStatus }
}
