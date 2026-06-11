import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface VeiculoFiltros {
  buscar?: string
  marca?: string
  modelo?: string
  cor?: string
  anoMin?: number
  anoMax?: number
  valorMin?: number
  valorMax?: number
  quilometragemMax?: number
  incluirVendidos?: boolean
  idVendedor?: string
}

export interface VeiculoMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface VeiculoItem {
  id: string
  idVendedor: string
  idComprador?: string
  valor: number
  descricao: string
  modelo: string
  ano: number
  cor: string
  marca: string
  motorizacao: string
  quilometragem: number
  vendidoEm?: string
  criadoEm: string
  imagemCapa?: string | null
  interessadosCount?: number
}

export function useVeiculos(filtros: VeiculoFiltros = {}) {
  return useInfiniteQuery<{ data: VeiculoItem[]; meta: VeiculoMeta }>({
    queryKey: ['veiculos', filtros],
    queryFn: ({ pageParam = 1 }) =>
      api
        .get('/veiculos', { params: { ...filtros, page: pageParam, limit: 12 } })
        .then((r) => r.data),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
  })
}
