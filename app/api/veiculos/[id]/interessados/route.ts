import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Mensagem } from '@/src/entity/mensagem.entity'
import { Veiculo } from '@/src/entity/veiculo.entity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id: idVeiculo } = await params
  const ds = await getDataSource()

  const veiculo = await ds.getRepository(Veiculo).findOne({ where: { id: idVeiculo } })
  if (!veiculo || veiculo.deletadoEm || veiculo.idVendedor !== user.id) {
    return Response.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const result = await ds
    .getRepository(Mensagem)
    .createQueryBuilder('m')
    .select('COUNT(DISTINCT m."IdRemetente")', 'count')
    .where('m.idVeiculo = :idVeiculo', { idVeiculo })
    .andWhere('m.idRemetente != :uid', { uid: user.id })
    .getRawOne<{ count: string }>()

  return Response.json({ count: Number(result?.count ?? 0) })
}
