'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import type { VeiculoItem } from '@/hooks/useVeiculos'

interface Me {
  id: string
  nome: string
}

export default function MeusAnunciosPage() {
  const queryClient = useQueryClient()
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [interessados, setInteressados] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      try {
        const wsResp = await api.get('/auth/ws-token')
        const parts = wsResp.data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        setMe({ id: payload.id, nome: payload.nome })

        const resp = await api.get('/veiculos', { params: { idVendedor: payload.id, limit: 48 } })
        const lista: VeiculoItem[] = resp.data.data
        setVeiculos(lista)

        const counts = await Promise.all(
          lista.map((v) =>
            api
              .get<{ count: number }>(`/veiculos/${v.id}/interessados`)
              .then((r) => ({ id: v.id, count: r.data.count }))
              .catch(() => ({ id: v.id, count: 0 }))
          )
        )
        setInteressados(Object.fromEntries(counts.map(({ id, count }) => [id, count])))
      } catch {
        // not logged in
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function deletar(id: string) {
    if (!window.confirm('Remover anúncio?')) return
    await api.delete(`/veiculos/${id}`)
    setVeiculos((prev) => prev.filter((v) => v.id !== id))
    queryClient.invalidateQueries({ queryKey: ['veiculos'] })
  }

  async function cancelarVenda(id: string) {
    if (!window.confirm('Cancelar a venda? O veículo voltará a aparecer como disponível.')) return
    await api.delete(`/veiculos/${id}/compra`)
    setVeiculos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, vendidoEm: undefined, idComprador: undefined } : v))
    )
    queryClient.invalidateQueries({ queryKey: ['veiculos'] })
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Meus Anúncios</h1>
            {me && <p className="text-sm text-muted-foreground mt-0.5">{me.nome}</p>}
          </div>
          <Link
            href="/novo-anuncio"
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            + Novo anúncio
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-slate-200/80 animate-pulse bg-card" />
            ))}
          </div>
        ) : veiculos.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-slate-200/80 shadow-sm">
            <svg className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-muted-foreground font-medium">Você não tem anúncios ainda</p>
            <Link
              href="/novo-anuncio"
              className="mt-4 inline-block px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Criar primeiro anúncio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {veiculos.map((v) => {
              const valor = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(v.valor))

              return (
                <div
                  key={v.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-4 border border-slate-200/80 rounded-2xl p-4 bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {v.imagemCapa ? (
                      <img
                        src={`data:image/jpeg;base64,${v.imagemCapa}`}
                        alt={`${v.marca} ${v.modelo}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {v.ano} {v.marca} {v.modelo}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{valor} · {v.quilometragem.toLocaleString('pt-BR')} km</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {v.vendidoEm ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Vendido
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Disponível
                        </span>
                      )}
                      {interessados[v.id] !== undefined && (
                        <span
                          title="Usuários diferentes que enviaram mensagens sobre este anúncio"
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            interessados[v.id] > 0
                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                              : 'text-muted-foreground bg-muted border-border'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {interessados[v.id]} interessado{interessados[v.id] !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Link
                      href={`/veiculos/${v.id}`}
                      className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Ver
                    </Link>
                    {v.vendidoEm ? (
                      <button
                        onClick={() => cancelarVenda(v.id)}
                        className="text-sm px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        Cancelar venda
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/meus-anuncios/${v.id}/editar`}
                          className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => deletar(v.id)}
                          className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
