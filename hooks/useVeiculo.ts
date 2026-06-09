import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { VeiculoItem } from './useVeiculos'

export function useVeiculo(id: string) {
  return useQuery<VeiculoItem>({
    queryKey: ['veiculo', id],
    queryFn: () => api.get(`/veiculos/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}
