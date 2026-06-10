'use client'
import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = (error.config?.url as string | undefined)?.includes('ws-token')
    const onAuthPage = typeof window !== 'undefined' && (
      window.location.pathname === '/login' || window.location.pathname === '/register'
    )
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isAuthCheck && !onAuthPage) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
