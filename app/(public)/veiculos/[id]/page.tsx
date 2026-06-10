'use client'
import { use, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useVeiculo } from '@/hooks/useVeiculo'
import { Galeria } from '@/components/Galeria'
import { ChatPanel } from '@/components/ChatPanel'
import type { MensagemItem } from '@/hooks/useChat'

interface Imagem {
  id: string
  conteudo: string
  criadoEm: string
}

interface Me {
  id: string
  nome: string
  login: string
}

export default function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const compradorId = searchParams.get('compradorId')
  const queryClient = useQueryClient()
  const [chatAberto, setChatAberto] = useState(!!compradorId)
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(compradorId)

  const { data: veiculo, isLoading } = useVeiculo(id)

  const { data: imagens = [] } = useQuery<Imagem[]>({
    queryKey: ['imagens', id],
    queryFn: () => api.get(`/veiculos/${id}/imagens`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: vendedor } = useQuery<{ id: string; nome: string } | null>({
    queryKey: ['usuario', veiculo?.idVendedor],
    queryFn: () =>
      veiculo ? api.get(`/usuarios/${veiculo.idVendedor}`).then((r) => r.data) : null,
    enabled: !!veiculo,
  })

  const { data: me } = useQuery<Me | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/ws-token')
        const parts = data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        return { id: payload.id, nome: payload.nome, login: '' }
      } catch {
        return null
      }
    },
    retry: false,
  })

  const compraMutation = useMutation({
    mutationFn: (idComprador: string | null) =>
      api.post(`/veiculos/${id}/compra`, idComprador ? { idComprador } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculo', id] })
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
    },
  })

  const cancelarMutation = useMutation({
    mutationFn: () => api.delete(`/veiculos/${id}/compra`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculo', id] })
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
    },
  })

  const isVendedor = !!me && !!veiculo && me.id === veiculo.idVendedor

  const { data: todasMensagens = [] } = useQuery<MensagemItem[]>({
    queryKey: ['mensagens-vendedor', id],
    queryFn: () => api.get(`/veiculos/${id}/mensagens`).then((r) => r.data),
    enabled: isVendedor,
  })

  const interessados = useMemo(() => {
    if (!me) return []
    const byBuyer = new Map<string, { id: string; nome: string; lastMessage: string; unreadCount: number }>()
    for (const msg of todasMensagens) {
      const buyerId = msg.idRemetente === me.id ? msg.idDestinatario : msg.idRemetente
      const existing = byBuyer.get(buyerId)
      const nome = msg.remetente?.id !== me.id ? (msg.remetente?.nome ?? 'Usuário') : (existing?.nome ?? 'Usuário')
      const isUnread = msg.idDestinatario === me.id && !msg.lidoEm
      byBuyer.set(buyerId, {
        id: buyerId,
        nome,
        lastMessage: msg.mensagem,
        unreadCount: (existing?.unreadCount ?? 0) + (isUnread ? 1 : 0),
      })
    }
    return Array.from(byBuyer.values())
  }, [todasMensagens, me])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Carregando…</span>
      </div>
    )
  }

  if (!veiculo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Veículo não encontrado.</span>
      </div>
    )
  }

  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(veiculo.valor)
  )
  const vendido = !!veiculo.vendidoEm

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar aos anúncios
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <Galeria imagens={imagens} />
        </div>

        {/* Details */}
        <div className="space-y-5">
          {/* Title & price */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight">
                {veiculo.ano} {veiculo.marca} {veiculo.modelo}
              </h1>
              {vendido && (
                <span className="shrink-0 mt-1 text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1 font-semibold">
                  Vendido
                </span>
              )}
            </div>
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-3xl font-bold text-primary">{valor}</p>
              {!!veiculo.interessadosCount && veiculo.interessadosCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {veiculo.interessadosCount} interessado{veiculo.interessadosCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Specs */}
          <div className="bg-card border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Especificações</p>
            </div>
            <dl className="divide-y divide-border">
              {[
                { label: 'Cor', value: veiculo.cor },
                { label: 'Ano', value: veiculo.ano },
                { label: 'Quilometragem', value: `${veiculo.quilometragem.toLocaleString('pt-BR')} km` },
                { label: 'Motorização', value: veiculo.motorizacao },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Description */}
          {veiculo.descricao && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Descrição</p>
              <p className="text-sm leading-relaxed text-foreground/80">{veiculo.descricao}</p>
            </div>
          )}

          {/* Seller */}
          {vendedor && (
            <Link
              href={`/usuarios/${vendedor.id}`}
              className="flex items-center gap-3 border border-slate-200/80 rounded-xl p-3.5 hover:bg-muted/60 transition-colors bg-card shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {vendedor.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Vendedor</p>
                <p className="text-sm font-semibold truncate">{vendedor.nome}</p>
              </div>
              <svg className="ml-auto w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Actions */}
          {vendido && isVendedor && (
            <button
              onClick={() => cancelarMutation.mutate()}
              disabled={cancelarMutation.isPending}
              className="w-full border border-orange-200 text-orange-600 rounded-xl py-2.5 text-sm font-medium hover:bg-orange-50 disabled:opacity-50 transition-colors"
            >
              {cancelarMutation.isPending ? 'Cancelando…' : 'Cancelar venda'}
            </button>
          )}

          {compraMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {(compraMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao confirmar venda'}
            </p>
          )}

          {!isVendedor && (
            <button
              onClick={() => {
                if (!me) {
                  sessionStorage.setItem('redirect', window.location.pathname)
                  router.push('/login')
                  return
                }
                setChatAberto((p) => !p)
              }}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all shadow-sm ${
                chatAberto
                  ? 'border border-border bg-card hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
              }`}
            >
              {chatAberto ? 'Fechar chat' : 'Falar com o vendedor'}
            </button>
          )}

          {/* buyer chat */}
          {chatAberto && me && !isVendedor && (
            <ChatPanel
              idVeiculo={id}
              idDestinatario={veiculo.idVendedor}
              usuarioLogadoId={me.id}
              vendido={vendido}
            />
          )}

          {/* seller: list of interested buyers */}
          {isVendedor && interessados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Interessados ({interessados.length})
              </p>
              {interessados.map((buyer) => (
                <div key={buyer.id}>
                  <button
                    onClick={() => setSelectedBuyerId((prev) => prev === buyer.id ? null : buyer.id)}
                    className={`w-full flex items-center gap-3 border rounded-xl p-3.5 transition-colors text-left ${
                      selectedBuyerId === buyer.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {buyer.nome.charAt(0).toUpperCase()}
                      </div>
                      {buyer.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                          {buyer.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{buyer.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{buyer.lastMessage}</p>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {selectedBuyerId === buyer.id && me && (
                    <div className="mt-2">
                      <ChatPanel
                        idVeiculo={id}
                        idDestinatario={buyer.id}
                        usuarioLogadoId={me.id}
                        isVendedor
                        vendido={vendido}
                        onConfirmarVenda={(idComprador) => compraMutation.mutate(idComprador)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
