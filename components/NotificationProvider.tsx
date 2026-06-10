'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

interface Toast {
  id: number
  text: string
}

interface NotificationCtx {
  count: number
  clearCount: () => void
  refresh: () => void
}

const Ctx = createContext<NotificationCtx>({ count: 0, clearCount: () => {}, refresh: () => {} })

export function useNotificationCount() {
  return useContext(Ctx)
}

async function playSound() {
  try {
    const ctx = new AudioContext()
    await ctx.resume()

    function chime(freq: number, startAt: number, duration: number) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(0.18, startAt + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)
      osc.start(startAt)
      osc.stop(startAt + duration)
    }

    const now = ctx.currentTime
    chime(1046, now, 0.6)
    chime(1318, now + 0.1, 0.6)
  } catch {
    // audio blocked or unavailable
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [count, setCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(1000)
  const toastIdRef = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/mensagens/nao-lidas')
      if (mountedRef.current) setCount(data.count)
    } catch {
      // not logged in
    }
  }, [])

  function addToast(text: string) {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  const connect = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get('/auth/ws-token')
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080'
      const ws = new WebSocket(wsUrl, ['auth', data.token])
      wsRef.current = ws

      ws.onopen = () => { backoffRef.current = 1000 }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'notification') {
            setCount((prev) => prev + 1)
            queryClient.invalidateQueries({ queryKey: ['mensagens'] })
            queryClient.invalidateQueries({ queryKey: ['mensagens-vendedor'] })
            queryClient.invalidateQueries({ queryKey: ['conversas'] })
            playSound()
            addToast('Nova mensagem recebida')
          }
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        const delay = Math.min(backoffRef.current, 10_000)
        backoffRef.current = Math.min(backoffRef.current * 2, 10_000)
        reconnectRef.current = setTimeout(connect, delay)
      }
    } catch {
      // not logged in or WS unavailable — don't reconnect aggressively
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect, refresh])

  const clearCount = useCallback(() => setCount(0), [])

  return (
    <Ctx.Provider value={{ count, clearCount, refresh }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-foreground text-background text-sm px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-200"
          >
            💬 {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
