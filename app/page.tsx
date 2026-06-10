'use client'
import { useState } from 'react'
import { useVeiculos } from '@/hooks/useVeiculos'
import type { VeiculoFiltros } from '@/hooks/useVeiculos'
import { VeiculoCard } from '@/components/VeiculoCard'
import { VeiculoFiltros as FiltrosComponent } from '@/components/VeiculoFiltros'

export default function HomePage() {
  const [filtros, setFiltros] = useState<VeiculoFiltros>({})
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useVeiculos(filtros)

  const veiculos = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <aside className="w-64 shrink-0">
          <FiltrosComponent onFiltrar={setFiltros} />
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Veículos disponíveis</h1>
            {data?.pages[0]?.meta && (
              <span className="text-sm text-muted-foreground">
                {data.pages[0].meta.total} resultados
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card animate-pulse aspect-4/3" />
              ))}
            </div>
          ) : veiculos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum veículo encontrado com esses filtros.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {veiculos.map((v) => (
                  <VeiculoCard key={v.id} veiculo={v} />
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
