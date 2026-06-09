'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import type { MensagemItem } from '@/hooks/useChat'

interface Conversa {
  idVeiculo: string
  idOutroUsuario: string
  nomeOutroUsuario: string
  ultimaMensagem: MensagemItem
}

export default function MensagensPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const wsResp = await api.get('/auth/ws-token')
        const parts = wsResp.data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        setMeId(payload.id)

        // Get all vehicles that have messages involving this user
        // We fetch the vehicles listing and for each try to get messages
        // This is a simplified approach - in production you'd have a dedicated endpoint
        const veiculosResp = await api.get('/veiculos', { params: { limit: 48 } })
        const veiculos = veiculosResp.data.data

        const conversaMap = new Map<string, Conversa>()

        await Promise.all(
          veiculos.map(async (v: { id: string; idVendedor: string }) => {
            try {
              const msgsResp = await api.get(`/veiculos/${v.id}/mensagens`)
              const msgs: MensagemItem[] = msgsResp.data
              if (msgs.length === 0) return

              const ultima = msgs[msgs.length - 1]
              const idOutro = ultima.idRemetente === payload.id ? ultima.idDestinatario : ultima.idRemetente
              const nomeOutro = ultima.remetente?.id !== payload.id
                ? ultima.remetente?.nome ?? 'Usuário'
                : 'Usuário'

              const key = `${v.id}:${idOutro}`
              if (!conversaMap.has(key)) {
                conversaMap.set(key, {
                  idVeiculo: v.id,
                  idOutroUsuario: idOutro,
                  nomeOutroUsuario: nomeOutro,
                  ultimaMensagem: ultima,
                })
              }
            } catch {
              // vehicle may not have messages
            }
          })
        )

        setConversas(Array.from(conversaMap.values()))
      } catch {
        // not logged in
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-40">
        <Link href="/" className="font-bold text-lg">AutoMarket</Link>
        <span className="text-sm text-muted-foreground">Mensagens</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Conversas</h1>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-border animate-pulse bg-card" />
            ))}
          </div>
        ) : conversas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma conversa ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {conversas.map((c) => (
              <Link
                key={`${c.idVeiculo}:${c.idOutroUsuario}`}
                href={`/veiculos/${c.idVeiculo}`}
                className="flex items-center gap-3 border border-border rounded-xl p-4 bg-card hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {c.nomeOutroUsuario.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.nomeOutroUsuario}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.ultimaMensagem.mensagem}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(c.ultimaMensagem.criadoEm).toLocaleDateString('pt-BR')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
