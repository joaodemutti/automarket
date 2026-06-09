'use client'
import { use, useState } from 'react'
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
  const queryClient = useQueryClient()
  const [chatAberto, setChatAberto] = useState(false)

  const { data: veiculo, isLoading } = useVeiculo(id)

  const { data: imagens = [] } = useQuery<Imagem[]>({
    queryKey: ['imagens', id],
    queryFn: () => api.get(`/veiculos/${id}/imagens`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: me } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/ws-token').then(() => null).catch(() => null) as Promise<Me>,
    retry: false,
  })

  const compraMutation = useMutation({
    mutationFn: () => api.post(`/veiculos/${id}/compra`),
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

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-40">
        <Link href="/" className="font-bold text-lg">AutoMarket</Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </nav>

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

          {!vendido && me && veiculo.idVendedor !== me.id && (
            <div className="space-y-3">
              <button
                onClick={() => compraMutation.mutate()}
                disabled={compraMutation.isPending}
                className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {compraMutation.isPending ? 'Processando…' : 'Confirmar Compra'}
              </button>
              {compraMutation.isError && (
                <p className="text-sm text-red-500">
                  {(compraMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao comprar'}
                </p>
              )}
              <button
                onClick={() => setChatAberto((p) => !p)}
                className="w-full border border-border rounded-lg py-2 text-sm hover:bg-muted"
              >
                {chatAberto ? 'Fechar chat' : 'Falar com o vendedor'}
              </button>
            </div>
          )}

          {chatAberto && me && (
            <ChatPanel
              idVeiculo={id}
              idDestinatario={veiculo.idVendedor}
              usuarioLogadoId={me.id}
            />
          )}
        </div>
      </div>
    </div>
  )
}
