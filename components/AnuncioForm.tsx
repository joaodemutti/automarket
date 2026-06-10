'use client'
import React from 'react'

export const FORM_FIELDS = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'ano', label: 'Ano', type: 'number' },
  { key: 'cor', label: 'Cor', type: 'text' },
  { key: 'valor', label: 'Valor (R$)', type: 'number' },
  { key: 'motorizacao', label: 'Motorização', type: 'text' },
  { key: 'quilometragem', label: 'Quilometragem (km)', type: 'number' },
] as const

export type AnuncioFormValues = {
  marca: string
  modelo: string
  ano: string
  cor: string
  valor: string
  descricao: string
  motorizacao: string
  quilometragem: string
}

export const initialAnuncioForm: AnuncioFormValues = {
  marca: '',
  modelo: '',
  ano: '',
  cor: '',
  valor: '',
  descricao: '',
  motorizacao: '',
  quilometragem: '',
}

export interface ImagemExistente {
  id: string
  conteudo: string
}

interface AnuncioFormProps {
  form: AnuncioFormValues
  onChange: (key: keyof AnuncioFormValues, value: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string
  submitLabel: string
  disabled?: boolean
  // image props
  imagensExistentes?: ImagemExistente[]
  onRemoverImagem?: (id: string) => void
  novasImagens: File[]
  onNovasImagens: (files: File[]) => void
  imagemObrigatoria?: boolean
}

export function AnuncioForm({
  form,
  onChange,
  onSubmit,
  loading,
  error,
  submitLabel,
  disabled = false,
  imagensExistentes = [],
  onRemoverImagem,
  novasImagens,
  onNovasImagens,
  imagemObrigatoria = false,
}: AnuncioFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {FORM_FIELDS.map(({ key, label, type }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            <input
              type={type}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              required
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Descrição</label>
        <textarea
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          value={form.descricao}
          onChange={(e) => onChange('descricao', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Imagens {imagemObrigatoria && <span className="text-red-500">*</span>}
        </label>

        {imagensExistentes.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {imagensExistentes.map((img) => (
              <div key={img.id} className="relative group aspect-square">
                <img
                  src={`data:image/jpeg;base64,${img.conteudo}`}
                  alt=""
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
                {onRemoverImagem && (
                  <button
                    type="button"
                    onClick={() => onRemoverImagem(img.id)}
                    className="absolute top-1 right-1 hidden group-hover:flex w-5 h-5 items-center justify-center bg-black/60 text-white rounded-full text-xs leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
          onChange={(e) => onNovasImagens(Array.from(e.target.files ?? []))}
        />

        {novasImagens.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {novasImagens.map((file, i) => {
              const url = URL.createObjectURL(file)
              return (
                <div key={i} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-lg border border-dashed border-primary"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    type="button"
                    onClick={() => onNovasImagens(novasImagens.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 hidden group-hover:flex w-5 h-5 items-center justify-center bg-black/60 text-white rounded-full text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Aguarde…' : submitLabel}
      </button>
    </form>
  )
}
