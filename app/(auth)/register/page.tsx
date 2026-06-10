'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export default function RegisterPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ login: '', senha: '', nome: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handle(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      await api.post('/auth/login', { login: form.login, senha: form.senha })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      const redirect = sessionStorage.getItem('redirect')
      if (redirect) {
        sessionStorage.removeItem('redirect')
        router.push(redirect)
      } else {
        router.push('/')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">AutoMarket</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-6">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.nome}
              onChange={(e) => handle('nome', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="login">Login</label>
            <input
              id="login"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.login}
              onChange={(e) => handle('login', e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.senha}
              onChange={(e) => handle('senha', e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
