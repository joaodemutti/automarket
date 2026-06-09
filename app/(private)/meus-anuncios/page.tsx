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

        const resp = await api.get('/veiculos', { params: { limit: 48 } })
        const all: VeiculoItem[] = resp.data.data
        setVeiculos(all.filter((v) => v.idVendedor === payload.id))
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

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-40">
        <Link href="/" className="font-bold text-lg">AutoMarket</Link>
        <Link href="/novo-anuncio" className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90">
          + Novo anúncio
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Meus Anúncios</h1>

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
                    {!v.vendidoEm && (
                      <button
                        onClick={() => deletar(v.id)}
                        className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Remover
                      </button>
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
