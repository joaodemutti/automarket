'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { VeiculoFiltros as Filtros } from '@/hooks/useVeiculos'

interface Props {
  onFiltrar: (f: Filtros) => void
  inicial?: Filtros
}

export function VeiculoFiltros({ onFiltrar, inicial = {} }: Props) {
  const [f, setF] = useState<Filtros>(inicial)

  function handle(key: keyof Filtros, value: string) {
    setF((prev) => ({ ...prev, [key]: value || undefined }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onFiltrar(f)
  }

  function limpar() {
    setF({})
    onFiltrar({})
  }

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Filtros</h2>

      <div className="grid grid-cols-2 gap-2">
        <input
          className="input-field"
          placeholder="Marca"
          value={f.marca ?? ''}
          onChange={(e) => handle('marca', e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Modelo"
          value={f.modelo ?? ''}
          onChange={(e) => handle('modelo', e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Cor"
          value={f.cor ?? ''}
          onChange={(e) => handle('cor', e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Ano mín."
          value={f.anoMin ?? ''}
          onChange={(e) => handle('anoMin', e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Ano máx."
          value={f.anoMax ?? ''}
          onChange={(e) => handle('anoMax', e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Valor mín."
          value={f.valorMin ?? ''}
          onChange={(e) => handle('valorMin', e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Valor máx."
          value={f.valorMax ?? ''}
          onChange={(e) => handle('valorMax', e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Km máx."
          value={f.quilometragemMax ?? ''}
          onChange={(e) => handle('quilometragemMax', e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={!!f.incluirVendidos}
          onChange={(e) => setF((prev) => ({ ...prev, incluirVendidos: e.target.checked || undefined }))}
        />
        Mostrar vendidos
      </label>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">Filtrar</button>
        <button type="button" onClick={limpar} className="btn-secondary flex-1">Limpar</button>
      </div>
    </form>
  )
}
