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
  const body = await request.json().catch(() => ({})) as { idComprador?: string }
  const ds = await getDataSource()

  try {
    const veiculo = await ds.transaction(async (manager) => {
      const repo = manager.getRepository(Veiculo)
      const v = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })

      if (!v || v.deletadoEm) {
        throw { status: 404, message: 'Veículo não encontrado' }
      }
      if (v.idVendedor !== user.id) {
        throw { status: 403, message: 'Apenas o vendedor pode confirmar a venda' }
      }
      if (v.vendidoEm) {
        throw { status: 409, message: 'Veículo já vendido' }
      }

      if (body.idComprador) v.idComprador = body.idComprador
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const ds = await getDataSource()
  const repo = ds.getRepository(Veiculo)

  const v = await repo.findOne({ where: { id } })
  if (!v || v.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  if (v.idVendedor !== user.id) {
    return Response.json({ error: 'Apenas o vendedor pode cancelar a venda' }, { status: 403 })
  }
  if (!v.vendidoEm) {
    return Response.json({ error: 'Veículo não está marcado como vendido' }, { status: 400 })
  }

  v.vendidoEm = null as unknown as Date
  v.idComprador = null as unknown as string
  await repo.save(v)

  return Response.json(v)
}
