import { useCallback, useEffect, useRef } from 'react'

export function useNotificationSound(enabled: boolean) {
  const audioContext = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) return

    const unlock = () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      const context = audioContext.current ?? new window.AudioContext()
      audioContext.current = context
      if (context.state === 'suspended') void context.resume().catch(() => undefined)
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [enabled])

  useEffect(() => () => {
    void audioContext.current?.close()
    audioContext.current = null
  }, [])

  const play = useCallback(() => {
    const context = audioContext.current
    if (!enabled || !context || context.state !== 'running') return

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.setValueAtTime(1174, now + 0.12)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.35)
  }, [enabled])

  return { play }
}
