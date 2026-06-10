'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useVeiculo } from '@/hooks/useVeiculo'
import { AnuncioForm, initialAnuncioForm, type AnuncioFormValues, type ImagemExistente } from '@/components/AnuncioForm'

interface Me { id: string; nome: string }

export default function EditarAnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: veiculo, isLoading } = useVeiculo(id)
  const [me, setMe] = useState<Me | null>(null)
  const [form, setForm] = useState<AnuncioFormValues>(initialAnuncioForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [novasImagens, setNovasImagens] = useState<File[]>([])

  const { data: imagens = [], refetch: refetchImagens } = useQuery<ImagemExistente[]>({
    queryKey: ['imagens', id],
    queryFn: () => api.get(`/veiculos/${id}/imagens`).then((r) => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    async function loadMe() {
      try {
        const wsResp = await api.get('/auth/ws-token')
        const parts = wsResp.data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        setMe({ id: payload.id, nome: payload.nome })
      } catch {
        setMe(null)
      }
    }
    loadMe()
  }, [])

  useEffect(() => {
    if (!veiculo) return
    setForm({
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: String(veiculo.ano),
      cor: veiculo.cor,
      valor: String(veiculo.valor),
      descricao: veiculo.descricao,
      motorizacao: veiculo.motorizacao,
      quilometragem: String(veiculo.quilometragem),
    })
  }, [veiculo])

  function handle(key: keyof AnuncioFormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/veiculos/${id}`, {
        ...form,
        valor: Number(form.valor),
        ano: Number.parseInt(form.ano, 10),
        quilometragem: Number.parseInt(form.quilometragem, 10),
      })

      if (novasImagens.length > 0) {
        const fd = new FormData()
        novasImagens.forEach((img) => fd.append('imagens', img))
        await api.post(`/veiculos/${id}/imagens`, fd)
        setNovasImagens([])
        refetchImagens()
      }

      queryClient.invalidateQueries({ queryKey: ['veiculo', id] })
      queryClient.invalidateQueries({ queryKey: ['veiculos'] })
      router.push('/meus-anuncios')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao salvar anúncio')
    } finally {
      setSaving(false)
    }
  }

  async function removerImagem(imagemId: string) {
    await api.delete(`/veiculos/${id}/imagens/${imagemId}`)
    refetchImagens()
  }

  const isOwner = !!me && !!veiculo && veiculo.idVendedor === me.id

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Link href="/meus-anuncios" className="text-sm text-muted-foreground hover:text-foreground">← Meus anúncios</Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-6">Editar anúncio</h1>

        {isLoading ? (
          <div className="h-80 rounded-xl border border-border animate-pulse bg-card" />
        ) : !veiculo ? (
          <p className="text-sm text-muted-foreground">Anúncio não encontrado.</p>
        ) : veiculo.vendidoEm ? (
          <p className="text-sm text-muted-foreground">Anúncios vendidos não podem ser editados.</p>
        ) : me && !isOwner ? (
          <p className="text-sm text-muted-foreground">Você não pode editar este anúncio.</p>
        ) : (
          <AnuncioForm
            form={form}
            onChange={handle}
            onSubmit={handleSubmit}
            loading={saving}
            error={error}
            submitLabel="Salvar alterações"
            disabled={!isOwner}
            imagensExistentes={imagens}
            onRemoverImagem={removerImagem}
            novasImagens={novasImagens}
            onNovasImagens={setNovasImagens}
          />
        )}
      </div>
    </div>
  )
}
