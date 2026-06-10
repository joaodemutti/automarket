'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import type { VeiculoItem } from '@/hooks/useVeiculos'

export default function MinhasComprasPage() {
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const wsResp = await api.get('/auth/ws-token')
        const parts = wsResp.data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

        const resp = await api.get('/veiculos', { params: { idComprador: payload.id, limit: 48 } })
        setVeiculos(resp.data.data)
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Minhas Compras</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border animate-pulse bg-card" />
            ))}
          </div>
        ) : veiculos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Você ainda não comprou nenhum veículo.</p>
            <Link href="/" className="mt-3 inline-block text-primary hover:underline">
              Ver veículos disponíveis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {veiculos.map((v) => {
              const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v.valor))
              return (
                <div key={v.id} className="flex items-center justify-between border border-border rounded-xl p-4 bg-card">
                  <div className="flex items-center gap-4">
                    {v.imagemCapa && (
                      <img
                        src={`data:image/jpeg;base64,${v.imagemCapa}`}
                        alt={`${v.marca} ${v.modelo}`}
                        className="w-16 h-12 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-medium">{v.ano} {v.marca} {v.modelo}</p>
                      <p className="text-sm text-muted-foreground">{valor} · {v.quilometragem.toLocaleString('pt-BR')} km</p>
                      <span className="text-xs text-red-600 font-medium">Comprado</span>
                    </div>
                  </div>
                  <Link
                    href={`/veiculos/${v.id}`}
                    className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted"
                  >
                    Ver
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
