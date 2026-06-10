import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Mensagem } from '@/src/entity/mensagem.entity'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const ds = await getDataSource()

  const count = await ds
    .getRepository(Mensagem)
    .createQueryBuilder('m')
    .where('m.idDestinatario = :uid', { uid: user.id })
    .andWhere('m.lidoEm IS NULL')
    .getCount()

  return Response.json({ count })
}
