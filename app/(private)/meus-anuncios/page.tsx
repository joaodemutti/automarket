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

  useEffect(() => {
    async function load() {
      try {
        // identify user via ws-token payload isn't possible here;
        // fetch all available vehicles and filter by idVendedor using the cookie session
        // Since we don't have a /me endpoint, use the ws-token approach to get the user id
        const wsResp = await api.get('/auth/ws-token')
        // parse the jwt payload (base64)
        const parts = wsResp.data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        setMe({ id: payload.id, nome: payload.nome })

        const resp = await api.get('/veiculos', { params: { idVendedor: payload.id, limit: 48 } })
        setVeiculos(resp.data.data)
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
    setVeiculos((prev) => prev.map((v) => v.id === id ? { ...v, vendidoEm: undefined, idComprador: undefined } : v))
    queryClient.invalidateQueries({ queryKey: ['veiculos'] })
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Meus Anúncios</h1>
          <Link href="/novo-anuncio" className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90">
            + Novo anúncio
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border animate-pulse bg-card" />
            ))}
          </div>
        ) : veiculos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Você não tem anúncios ativos.</p>
            <Link href="/novo-anuncio" className="mt-3 inline-block text-primary hover:underline">
              Criar primeiro anúncio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {veiculos.map((v) => {
              const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v.valor))
              return (
                <div key={v.id} className="flex items-center justify-between border border-border rounded-xl p-4 bg-card">
                  <div>
                    <p className="font-medium">{v.ano} {v.marca} {v.modelo}</p>
                    <p className="text-sm text-muted-foreground">{valor} · {v.quilometragem.toLocaleString('pt-BR')} km</p>
                    {v.vendidoEm && (
                      <span className="text-xs text-red-600">Vendido</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/veiculos/${v.id}`}
                      className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted"
                    >
                      Ver
                    </Link>
                    {v.vendidoEm ? (
                      <button
                        onClick={() => cancelarVenda(v.id)}
                        className="text-sm px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50"
                      >
                        Cancelar venda
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/meus-anuncios/${v.id}/editar`}
                          className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => deletar(v.id)}
                          className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
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
