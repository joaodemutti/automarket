'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import { AnuncioForm, initialAnuncioForm, type AnuncioFormValues } from '@/components/AnuncioForm'

export default function NovoAnuncioPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<AnuncioFormValues>(initialAnuncioForm)
  const [imagens, setImagens] = useState<File[]>([])

  function handle(key: keyof AnuncioFormValues, value: string) {
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/meus-anuncios" className="text-sm text-muted-foreground hover:text-foreground">← Meus anúncios</Link>
          <h1 className="text-xl font-semibold">Novo Anúncio</h1>
        </div>

        <AnuncioForm
          form={form}
          onChange={handle}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel="Publicar anúncio"
          novasImagens={imagens}
          onNovasImagens={setImagens}
          imagemObrigatoria
        />
      </div>
    </div>
  )
}
