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
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-slate-900 to-blue-900 text-white px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Encontre seu próximo veículo</h1>
          <p className="text-slate-300 text-sm mt-1">Anúncios com chat direto com o vendedor</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6 items-start">
        <aside className="w-72 shrink-0 sticky top-20">
          <FiltrosComponent onFiltrar={setFiltros} />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">Veículos disponíveis</h2>
            {data?.pages[0]?.meta && (
              <span className="text-sm text-muted-foreground bg-card border border-border px-3 py-1 rounded-full shadow-sm">
                {data.pages[0].meta.total} resultado{data.pages[0].meta.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200/80 bg-card animate-pulse aspect-video" />
              ))}
            </div>
          ) : veiculos.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-slate-200/80">
              <svg className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <p className="text-muted-foreground font-medium">Nenhum veículo encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {veiculos.map((v) => (
                  <VeiculoCard key={v.id} veiculo={v} />
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-8 py-2.5 border border-border bg-card rounded-xl text-sm font-medium hover:bg-muted hover:shadow-sm transition-all disabled:opacity-50 shadow-sm"
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
