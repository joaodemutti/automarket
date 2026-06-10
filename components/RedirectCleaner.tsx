'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const AUTH_PAGES = ['/login', '/register']

export function RedirectCleaner() {
  const pathname = usePathname()

  useEffect(() => {
    if (!AUTH_PAGES.includes(pathname)) {
      sessionStorage.removeItem('redirect')
    }
  }, [pathname])

  return null
}
