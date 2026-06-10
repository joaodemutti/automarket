'use client'
import Link from 'next/link'
import type { VeiculoItem } from '@/hooks/useVeiculos'

interface Props {
  veiculo: VeiculoItem
}

export function VeiculoCard({ veiculo }: Props) {
  const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(veiculo.valor)
  )

  return (
    <Link
      href={`/veiculos/${veiculo.id}`}
      className="group block rounded-2xl bg-card shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden border border-slate-200/80"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {veiculo.imagemCapa ? (
          <>
            <img
              src={`data:image/jpeg;base64,${veiculo.imagemCapa}`}
              alt={`${veiculo.marca} ${veiculo.modelo}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l2-5h14l2 5M3 9h18M3 9v9a1 1 0 001 1h1m14-10v9a1 1 0 01-1 1h-1M7 19h10M5 19a2 2 0 01-2-2v-1m16 1a2 2 0 002-2v-1" />
            </svg>
            <span className="text-xs">Sem imagem</span>
          </div>
        )}

        {veiculo.vendidoEm && (
          <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            Vendido
          </span>
        )}

        <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {veiculo.ano}
        </span>
      </div>

      <div className="p-4">
        <p className="font-semibold text-card-foreground truncate">
          {veiculo.marca} {veiculo.modelo}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{veiculo.cor}</span>
          {!!veiculo.interessadosCount && veiculo.interessadosCount > 0 && (
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {veiculo.interessadosCount} interessados
            </span>
          )}
          <span className="text-xs text-muted-foreground">{veiculo.quilometragem.toLocaleString('pt-BR')} km</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xl font-bold text-primary">{valor}</p>
        </div>
      </div>
    </Link>
  )
}
