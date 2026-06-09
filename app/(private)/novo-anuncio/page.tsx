'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'

export default function NovoAnuncioPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    ano: '',
    cor: '',
    valor: '',
    descricao: '',
    motorizacao: '',
    quilometragem: '',
  })
  const [imagens, setImagens] = useState<File[]>([])

  function handle(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (imagens.length === 0) {
      setError('Ao menos uma imagem é obrigatória')
      return
    }
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      imagens.forEach((img) => fd.append('imagens', img))

      await api.post('/veiculos', fd)
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      router.push('/meus-anuncios')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao criar anúncio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-40">
        <Link href="/" className="font-bold text-lg">AutoMarket</Link>
        <Link href="/meus-anuncios" className="text-sm text-muted-foreground hover:text-foreground">← Meus anúncios</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-6">Novo Anúncio</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'marca', label: 'Marca', type: 'text' },
              { key: 'modelo', label: 'Modelo', type: 'text' },
              { key: 'ano', label: 'Ano', type: 'number' },
              { key: 'cor', label: 'Cor', type: 'text' },
              { key: 'valor', label: 'Valor (R$)', type: 'number' },
              { key: 'motorizacao', label: 'Motorização', type: 'text' },
              { key: 'quilometragem', label: 'Quilometragem (km)', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <input
                  type={type}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => handle(key as keyof typeof form, e.target.value)}
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
              onChange={(e) => handle('descricao', e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Imagens <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
              onChange={(e) => setImagens(Array.from(e.target.files ?? []))}
            />
            {imagens.length > 0 && (
              <p className="text-xs text-muted-foreground">{imagens.length} arquivo(s) selecionado(s)</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Publicando…' : 'Publicar anúncio'}
          </button>
        </form>
      </div>
    </div>
  )
}
