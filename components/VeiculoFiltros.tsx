'use client'
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
    <form onSubmit={submit} className="bg-card border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-slate-50">
        <h2 className="font-bold text-sm text-foreground">Filtrar veículos</h2>
      </div>

      <div className="px-5 py-4 space-y-5">
        <input
          className="input-field"
          placeholder="Buscar por marca, modelo, cor…"
          value={f.buscar ?? ''}
          onChange={(e) => handle('buscar', e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Veículo</p>
          <input
            className="input-field"
            placeholder="Marca (ex: Toyota)"
            value={f.marca ?? ''}
            onChange={(e) => handle('marca', e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Modelo (ex: Corolla)"
            value={f.modelo ?? ''}
            onChange={(e) => handle('modelo', e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Cor"
            value={f.cor ?? ''}
            onChange={(e) => handle('cor', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Ano</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field"
              type="number"
              placeholder="De"
              value={f.anoMin ?? ''}
              onChange={(e) => handle('anoMin', e.target.value)}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Até"
              value={f.anoMax ?? ''}
              onChange={(e) => handle('anoMax', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Preço</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field"
              type="number"
              placeholder="R$ Mín."
              value={f.valorMin ?? ''}
              onChange={(e) => handle('valorMin', e.target.value)}
            />
            <input
              className="input-field"
              type="number"
              placeholder="R$ Máx."
              value={f.valorMax ?? ''}
              onChange={(e) => handle('valorMax', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Quilometragem</p>
          <input
            className="input-field"
            type="number"
            placeholder="Km máximo"
            value={f.quilometragemMax ?? ''}
            onChange={(e) => handle('quilometragemMax', e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none text-foreground">
          <input
            type="checkbox"
            className="rounded border-border w-4 h-4 accent-primary"
            checked={!!f.incluirVendidos}
            onChange={(e) => setF((prev) => ({ ...prev, incluirVendidos: e.target.checked || undefined }))}
          />
          Mostrar vendidos
        </label>
      </div>

      <div className="px-5 pb-5 space-y-2">
        <button type="submit" className="btn-primary w-full py-2.5">Aplicar filtros</button>
        <button type="button" onClick={limpar} className="btn-secondary w-full py-2.5">Limpar</button>
      </div>
    </form>
  )
}
