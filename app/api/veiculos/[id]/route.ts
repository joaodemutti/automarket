import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'

/**
 * @swagger
 * /api/veiculos/{id}:
 *   get:
 *     summary: Detalhes de um veículo
 *     tags: [Veículos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalhes do veículo
 *       404:
 *         description: Veículo não encontrado
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ds = await getDataSource()
  const veiculo = await ds.getRepository(Veiculo).findOne({
    where: { id },
  })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  return Response.json(veiculo)
}

/**
 * @swagger
 * /api/veiculos/{id}:
 *   delete:
 *     summary: Soft-delete de veículo (auth, apenas dono)
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
 *         description: Veículo removido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Veículo não encontrado
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const ds = await getDataSource()
  const repo = ds.getRepository(Veiculo)

  const veiculo = await repo.findOne({ where: { id } })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  if (veiculo.idVendedor !== user.id) {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  veiculo.deletadoEm = new Date()
  await repo.save(veiculo)

  return Response.json({ ok: true })
}
