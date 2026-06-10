'use client'
import { useRef, useEffect, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { useNotificationCount } from '@/components/NotificationProvider'
import { api } from '@/lib/axios'

interface Props {
  idVeiculo: string
  idDestinatario: string
  usuarioLogadoId: string
  isVendedor?: boolean
  onConfirmarVenda?: (idComprador: string) => void
  vendido?: boolean
}

export function ChatPanel({ idVeiculo, idDestinatario, usuarioLogadoId, isVendedor, onConfirmarVenda, vendido }: Props) {
  const { historyQuery, sendMessage, hasNotification, clearNotification } = useChat(
    idVeiculo,
    idDestinatario
  )
  const { refresh: refreshNotifications } = useNotificationCount()
  const [texto, setTexto] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historyQuery.data])

  useEffect(() => {
    if (hasNotification) clearNotification()
  }, [hasNotification, clearNotification])

  // Mark messages as read when chat opens, and whenever new messages arrive
  useEffect(() => {
    api.patch(`/veiculos/${idVeiculo}/mensagens`, null, { params: { participanteId: idDestinatario } }).then(() => refreshNotifications()).catch(() => {})
  }, [idVeiculo, historyQuery.data, refreshNotifications])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    sendMessage(texto.trim())
    setTexto('')
  }

  const mensagens = historyQuery.data ?? []

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden h-120">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
        <span className="font-semibold text-sm">Chat</span>
        {hasNotification && (
          <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5">Nova mensagem</span>
        )}
        {isVendedor && !vendido && (
          <button
            type="button"
            onClick={() => onConfirmarVenda?.(idDestinatario)}
            className="ml-auto text-xs bg-green-600 text-white rounded-lg px-3 py-1 hover:bg-green-700 font-medium"
          >
            Confirmar Venda
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyQuery.isLoading && (
          <p className="text-center text-muted-foreground text-sm">Carregando…</p>
        )}
        {mensagens.map((m) => {
          const isOwn = m.idRemetente === usuarioLogadoId
          return (
            <div key={m.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-3 py-2 rounded-xl text-sm max-w-[75%] ${
                  isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {m.mensagem}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {m.remetente?.nome ?? 'Você'} ·{' '}
                {new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
        <input
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Digite uma mensagem…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button
          type="submit"
          disabled={!texto.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
