'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useNotificationCount } from '@/components/NotificationProvider'

export function Navbar() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { count: notifCount, clearCount } = useNotificationCount()

  const { data: me } = useQuery<{ id: string; nome: string } | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/ws-token')
        const parts = data.token.split('.')
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        return { id: payload.id, nome: payload.nome }
      } catch {
        return null
      }
    },
    retry: false,
  })

  async function logout() {
    await api.post('/auth/logout')
    queryClient.clear()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight shrink-0">
          <span className="text-white">Auto</span>
          <span className="text-blue-400">Market</span>
        </Link>

        <div className="flex items-center gap-1">
          {me ? (
            <>
              <span className="hidden md:inline text-sm text-slate-400 mr-2 truncate max-w-32">
                {me.nome}
              </span>

              <Link
                href="/mensagens"
                onClick={clearCount}
                className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Mensagens
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </Link>

              <Link
                href="/meus-anuncios"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Meus Anúncios
              </Link>

              <Link
                href="/minhas-compras"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Minhas Compras
              </Link>

              <Link
                href="/novo-anuncio"
                className="ml-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                + Anunciar
              </Link>

              <button
                onClick={logout}
                className="ml-1 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
