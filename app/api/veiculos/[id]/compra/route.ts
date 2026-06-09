import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'

/**
 * @swagger
 * /api/veiculos/{id}/compra:
 *   post:
 *     summary: Confirma compra do veículo (auth, transação atômica)
 *     tags: [Veículos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Compra confirmada
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Veículo não encontrado
 *       409:
 *         description: Veículo já vendido
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const ds = await getDataSource()

  try {
    const veiculo = await ds.transaction(async (manager) => {
      const repo = manager.getRepository(Veiculo)
      const v = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })

      if (!v || v.deletadoEm) {
        throw { status: 404, message: 'Veículo não encontrado' }
      }
      if (v.vendidoEm || v.idComprador) {
        throw { status: 409, message: 'Veículo já vendido' }
      }
      if (v.idVendedor === user.id) {
        throw { status: 400, message: 'Vendedor não pode comprar o próprio veículo' }
      }

      v.idComprador = user.id
      v.vendidoEm = new Date()
      return repo.save(v)
    })

    return Response.json(veiculo)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const e = err as { status: number; message: string }
      return Response.json({ error: e.message }, { status: e.status })
    }
    throw err
  }
}
