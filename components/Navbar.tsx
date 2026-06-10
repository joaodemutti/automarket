'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useNotificationCount } from '@/components/NotificationProvider'

export function Navbar() {
  const queryClient = useQueryClient()
  const { count: notifCount } = useNotificationCount()
  const [menuOpen, setMenuOpen] = useState(false)

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
    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight shrink-0">
          <span className="text-white">Auto</span>
          <span className="text-blue-400">Market</span>
        </Link>

        {/* Desktop nav */}
        {me ? (
          <div className="hidden md:flex items-center gap-1">
            <span className="text-sm text-slate-400 mr-2 truncate max-w-32">{me.nome}</span>

            <Link href="/mensagens" className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Mensagens
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <Link href="/meus-anuncios" className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Meus Anúncios</Link>
            <Link href="/minhas-compras" className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Minhas Compras</Link>
            <Link href="/novo-anuncio" className="ml-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">+ Anunciar</Link>
            <button onClick={logout} className="ml-1 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Sair</button>
          </div>
        ) : (
          <Link href="/login" className="hidden md:block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Entrar</Link>
        )}

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-2">
          {me && (
            <Link href="/mensagens" className="relative p-2 text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
          )}
          {!me && (
            <Link href="/login" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Entrar</Link>
          )}
          {me && (
            <button onClick={() => setMenuOpen((o) => !o)} className="p-2 text-slate-300 hover:text-white" aria-label="Menu">
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && me && (
        <div className="md:hidden bg-slate-900 border-t border-slate-700/50 px-4 py-3 space-y-1">
          <p className="text-xs text-slate-500 px-3 pb-1">{me.nome}</p>
          <Link href="/novo-anuncio" onClick={() => setMenuOpen(false)} className="flex items-center px-3 py-2.5 text-sm font-semibold text-orange-400 hover:bg-slate-800 rounded-lg transition-colors">+ Anunciar</Link>
          <Link href="/meus-anuncios" onClick={() => setMenuOpen(false)} className="flex items-center px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">Meus Anúncios</Link>
          <Link href="/minhas-compras" onClick={() => setMenuOpen(false)} className="flex items-center px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">Minhas Compras</Link>
          <button onClick={() => { setMenuOpen(false); logout() }} className="flex w-full items-center px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">Sair</button>
        </div>
      )}
    </nav>
  )
}
