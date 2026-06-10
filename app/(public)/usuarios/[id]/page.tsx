'use client'
import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useVeiculos } from '@/hooks/useVeiculos'
import { VeiculoCard } from '@/components/VeiculoCard'

interface Vendedor {
  id: string
  nome: string
  login: string
  criadoEm: string
}

export default function PerfilVendedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: vendedor, isLoading: loadingVendedor } = useQuery<Vendedor>({
    queryKey: ['usuario', id],
    queryFn: () => api.get(`/usuarios/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data, isLoading: loadingVeiculos } = useVeiculos({ idVendedor: id })
  const veiculos = data?.pages.flatMap((p) => p.data) ?? []

  if (loadingVendedor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Carregando…</span>
      </div>
    )
  }

  if (!vendedor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Vendedor não encontrado.</span>
      </div>
    )
  }

  const membro = new Date(vendedor.criadoEm).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8 p-6 border border-border rounded-xl bg-card">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
            {vendedor.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{vendedor.nome}</h1>
            <p className="text-sm text-muted-foreground">Membro desde {membro}</p>
          </div>
        </div>

        <h2 className="text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-sm">
          Anúncios ativos ({veiculos.length})
        </h2>

        {loadingVeiculos ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card animate-pulse aspect-4/3" />
            ))}
          </div>
        ) : veiculos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum anúncio ativo no momento.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {veiculos.map((v) => (
              <VeiculoCard key={v.id} veiculo={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
