'use client'
import { use, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useVeiculo } from '@/hooks/useVeiculo'
import { Galeria } from '@/components/Galeria'
import { ChatPanel } from '@/components/ChatPanel'

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
  const searchParams = useSearchParams()
  const compradorId = searchParams.get('compradorId')
  const queryClient = useQueryClient()
  const [chatAberto, setChatAberto] = useState(!!compradorId)

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
  const isVendedor = !!me && me.id === veiculo.idVendedor

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Galeria imagens={imagens} />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              {veiculo.ano} {veiculo.marca} {veiculo.modelo}
            </h1>
            <p className="text-3xl font-bold text-primary mt-2">{valor}</p>
            {vendido && (
              <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1">
                Vendido
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cor</dt>
            <dd className="font-medium">{veiculo.cor}</dd>
            <dt className="text-muted-foreground">Ano</dt>
            <dd className="font-medium">{veiculo.ano}</dd>
            <dt className="text-muted-foreground">Quilometragem</dt>
            <dd className="font-medium">{veiculo.quilometragem.toLocaleString('pt-BR')} km</dd>
            <dt className="text-muted-foreground">Motorização</dt>
            <dd className="font-medium">{veiculo.motorizacao}</dd>
          </dl>

          <div>
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-1">Descrição</h2>
            <p className="text-sm leading-relaxed">{veiculo.descricao}</p>
          </div>

          {vendedor && (
            <Link
              href={`/usuarios/${vendedor.id}`}
              className="flex items-center gap-3 border border-border rounded-xl p-3 hover:bg-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {vendedor.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vendedor</p>
                <p className="text-sm font-medium truncate">{vendedor.nome}</p>
              </div>
              <span className="ml-auto text-muted-foreground text-xs">→</span>
            </Link>
          )}

          {vendido && isVendedor && (
            <button
              onClick={() => cancelarMutation.mutate()}
              disabled={cancelarMutation.isPending}
              className="w-full border border-orange-200 text-orange-600 rounded-lg py-2 text-sm hover:bg-orange-50 disabled:opacity-50"
            >
              {cancelarMutation.isPending ? 'Cancelando…' : 'Cancelar venda'}
            </button>
          )}

          {compraMutation.isError && (
            <p className="text-sm text-red-500">
              {(compraMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao confirmar venda'}
            </p>
          )}

          {!vendido && me && !isVendedor && (
            <button
              onClick={() => setChatAberto((p) => !p)}
              className="w-full border border-border rounded-lg py-2 text-sm hover:bg-muted"
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

          {/* seller chat with a specific buyer (arrived via ?compradorId=) */}
          {chatAberto && me && isVendedor && compradorId && (
            <ChatPanel
              idVeiculo={id}
              idDestinatario={compradorId}
              usuarioLogadoId={me.id}
              isVendedor
              vendido={vendido}
              onConfirmarVenda={(idComprador) => compraMutation.mutate(idComprador)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
