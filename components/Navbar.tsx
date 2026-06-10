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
    <nav className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-40">
      <Link href="/" className="font-bold text-lg">AutoMarket</Link>
      <div className="flex items-center gap-3">
        {me ? (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline">{me.nome}</span>
            <Link
              href="/mensagens"
              onClick={clearCount}
              className="relative text-sm text-muted-foreground hover:text-foreground"
            >
              Mensagens
              {notifCount > 0 && (
                <span className="absolute -top-2 -right-3 min-w-4.5 h-4.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <Link href="/meus-anuncios" className="text-sm text-muted-foreground hover:text-foreground">
              Meus Anúncios
            </Link>
            <Link href="/minhas-compras" className="text-sm text-muted-foreground hover:text-foreground">
              Minhas Compras
            </Link>
            <Link href="/novo-anuncio" className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90">
              + Anunciar
            </Link>
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">
              Sair
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
        )}
      </div>
    </nav>
  )
}
