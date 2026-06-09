'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface MensagemItem {
  id: string
  mensagem: string
  idRemetente: string
  idDestinatario: string
  idVeiculo: string
  criadoEm: string
  remetente: { id: string; nome: string } | null
}

export function useChat(idVeiculo: string, idDestinatario: string) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [hasNotification, setHasNotification] = useState(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(1000)
  const mountedRef = useRef(true)

  const historyQuery = useQuery<MensagemItem[]>({
    queryKey: ['mensagens', idVeiculo],
    queryFn: () => api.get(`/veiculos/${idVeiculo}/mensagens`).then((r) => r.data),
    enabled: !!idVeiculo,
  })

  const connect = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      const { data } = await api.get('/auth/ws-token')
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080'
      const ws = new WebSocket(wsUrl, ['auth', data.token])
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'message') {
            queryClient.setQueryData<MensagemItem[]>(
              ['mensagens', idVeiculo],
              (prev = []) => {
                const exists = prev.some((m) => m.id === msg.data.id)
                return exists ? prev : [...prev, msg.data]
              }
            )
          } else if (msg.type === 'notification') {
            setHasNotification(true)
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        const delay = Math.min(backoffRef.current, 10_000)
        backoffRef.current = Math.min(backoffRef.current * 2, 10_000)
        reconnectTimeoutRef.current = setTimeout(() => connect(), delay)
      }
    } catch {
      if (!mountedRef.current) return
      const delay = Math.min(backoffRef.current, 10_000)
      backoffRef.current = Math.min(backoffRef.current * 2, 10_000)
      reconnectTimeoutRef.current = setTimeout(() => connect(), delay)
    }
  }, [idVeiculo, queryClient])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback(
    (mensagem: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ idDestinatario, idVeiculo, mensagem })
        )
      }
    },
    [idDestinatario, idVeiculo]
  )

  const clearNotification = useCallback(() => setHasNotification(false), [])

  return { historyQuery, sendMessage, hasNotification, clearNotification }
}
