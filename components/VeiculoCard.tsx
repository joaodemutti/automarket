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
      className="group block rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-sm">
        <span>Sem imagem</span>
      </div>
      <div className="p-4 space-y-1">
        <p className="font-semibold text-card-foreground truncate">
          {veiculo.ano} {veiculo.marca} {veiculo.modelo}
        </p>
        <p className="text-sm text-muted-foreground">{veiculo.cor} · {veiculo.quilometragem.toLocaleString('pt-BR')} km</p>
        <p className="text-lg font-bold text-primary">{valor}</p>
      </div>
    </Link>
  )
}
