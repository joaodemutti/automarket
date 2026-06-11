import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'
import { Mensagem } from '@/src/entity/mensagem.entity'

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
  const veiculo = await ds.getRepository(Veiculo).findOne({ where: { id } })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  const row = await ds
    .getRepository(Mensagem)
    .createQueryBuilder('m')
    .select('COUNT(DISTINCT m."IdRemetente")', 'count')
    .where('m."IdVeiculo" = :id', { id })
    .andWhere('m."IdRemetente" != :sellerId', { sellerId: veiculo.idVendedor })
    .getRawOne<{ count: string }>()
  return Response.json({ ...veiculo, interessadosCount: Number(row?.count ?? 0) })
}

/**
 * @swagger
 * /api/veiculos/{id}:
 *   put:
 *     summary: Atualiza veiculo (auth, apenas dono)
 *     tags: [Veículos]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const body = await request.json()
  const ds = await getDataSource()
  const repo = ds.getRepository(Veiculo)

  const veiculo = await repo.findOne({ where: { id } })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veiculo nao encontrado' }, { status: 404 })
  }
  if (veiculo.idVendedor !== user.id) {
    return Response.json({ error: 'Sem permissao' }, { status: 403 })
  }
  if (veiculo.vendidoEm) {
    return Response.json({ error: 'Veiculo vendido nao pode ser editado' }, { status: 400 })
  }

  const valor = Number(body.valor)
  const ano = Number.parseInt(String(body.ano), 10)
  const quilometragem = Number.parseInt(String(body.quilometragem), 10)
  const descricao = String(body.descricao ?? '').trim()
  const modelo = String(body.modelo ?? '').trim()
  const cor = String(body.cor ?? '').trim()
  const marca = String(body.marca ?? '').trim()
  const motorizacao = String(body.motorizacao ?? '').trim()

  if (
    !descricao ||
    !modelo ||
    !cor ||
    !marca ||
    !motorizacao ||
    Number.isNaN(valor) ||
    Number.isNaN(ano) ||
    Number.isNaN(quilometragem)
  ) {
    return Response.json({ error: 'Todos os campos sao obrigatorios' }, { status: 400 })
  }

  repo.merge(veiculo, {
    valor,
    descricao,
    modelo,
    ano,
    cor,
    marca,
    motorizacao,
    quilometragem,
  })
  await repo.save(veiculo)

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
