'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { MensagemItem } from '@/hooks/useChat'

interface Conversa {
  idVeiculo: string
  veiculo: string
  vendido: boolean
  idOutroUsuario: string
  nomeOutroUsuario: string
  ultimaMensagem: MensagemItem
  unreadCount: number
}

async function fetchConversas(): Promise<Conversa[]> {
  const wsResp = await api.get('/auth/ws-token')
  const parts = wsResp.data.token.split('.')
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

  const veiculosResp = await api.get('/veiculos', { params: { limit: 48, incluirVendidos: 'true' } })
  const veiculos: { id: string; marca: string; modelo: string; ano: number; vendidoEm?: string }[] = veiculosResp.data.data

  const conversaMap = new Map<string, Conversa>()

  await Promise.all(
    veiculos.map(async (v) => {
      try {
        const msgs: MensagemItem[] = (await api.get(`/veiculos/${v.id}/mensagens`)).data
        if (msgs.length === 0) return

        const byOtherUser = new Map<string, MensagemItem[]>()
        for (const msg of msgs) {
          const idOutro = msg.idRemetente === payload.id ? msg.idDestinatario : msg.idRemetente
          if (!byOtherUser.has(idOutro)) byOtherUser.set(idOutro, [])
          byOtherUser.get(idOutro)!.push(msg)
        }

        for (const [idOutro, userMsgs] of byOtherUser) {
          const ultima = userMsgs[userMsgs.length - 1]
          const nomeOutro =
            userMsgs.find((m) => m.remetente?.id === idOutro)?.remetente?.nome ??
            userMsgs.find((m) => m.destinatario?.id === idOutro)?.destinatario?.nome ??
            'Usuário'
          const unreadCount = userMsgs.filter((m) => m.idDestinatario === payload.id && !m.lidoEm).length

          conversaMap.set(`${v.id}:${idOutro}`, {
            idVeiculo: v.id,
            veiculo: `${v.ano} ${v.marca} ${v.modelo}`,
            vendido: !!v.vendidoEm,
            idOutroUsuario: idOutro,
            nomeOutroUsuario: nomeOutro,
            ultimaMensagem: ultima,
            unreadCount,
          })
        }
      } catch {
        // vehicle may not have messages
      }
    })
  )

  return Array.from(conversaMap.values()).sort(
    (a, b) => new Date(b.ultimaMensagem.criadoEm).getTime() - new Date(a.ultimaMensagem.criadoEm).getTime()
  )
}

export default function MensagensPage() {
  const { data: conversas = [], isLoading: loading } = useQuery({
    queryKey: ['conversas'],
    queryFn: fetchConversas,
  })

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Conversas</h1>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border animate-pulse bg-card" />
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
                href={`/veiculos/${c.idVeiculo}?compradorId=${c.idOutroUsuario}`}
                className="flex items-center gap-3 border border-border rounded-xl p-4 bg-card hover:bg-muted transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {c.nomeOutroUsuario.charAt(0).toUpperCase()}
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{c.nomeOutroUsuario}</p>
                    {c.vendido && (
                      <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5 shrink-0">
                        Vendido
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary font-medium truncate">{c.veiculo}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.ultimaMensagem.mensagem}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
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
