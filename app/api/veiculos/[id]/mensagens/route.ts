import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Mensagem } from '@/src/entity/mensagem.entity'

/**
 * @swagger
 * /api/veiculos/{id}/mensagens:
 *   get:
 *     summary: Histórico do chat deste veículo para o usuário logado (auth)
 *     tags: [Mensagens]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array de mensagens ordenadas por criadoEm ASC
 *       401:
 *         description: Não autenticado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id: idVeiculo } = await params
  const ds = await getDataSource()

  const participanteId = new URL(request.url).searchParams.get('participanteId')

  const qb = ds
    .getRepository(Mensagem)
    .createQueryBuilder('mensagem')
    .leftJoinAndSelect('mensagem.remetente', 'remetente')
    .where('mensagem.idVeiculo = :idVeiculo', { idVeiculo })

  if (participanteId) {
    qb.andWhere(
      '(mensagem.idRemetente = :uid AND mensagem.idDestinatario = :pid OR mensagem.idRemetente = :pid AND mensagem.idDestinatario = :uid)',
      { uid: user.id, pid: participanteId }
    )
  } else {
    qb.andWhere(
      '(mensagem.idRemetente = :uid OR mensagem.idDestinatario = :uid)',
      { uid: user.id }
    )
  }

  const mensagens = await qb.orderBy('mensagem.criadoEm', 'ASC').getMany()

  const result = mensagens.map((m) => ({
    id: m.id,
    mensagem: m.mensagem,
    idRemetente: m.idRemetente,
    idDestinatario: m.idDestinatario,
    idVeiculo: m.idVeiculo,
    criadoEm: m.criadoEm,
    lidoEm: m.lidoEm ?? null,
    remetente: m.remetente
      ? { id: m.remetente.id, nome: m.remetente.nome }
      : null,
  }))

  return Response.json(result)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id: idVeiculo } = await params
  const ds = await getDataSource()

  const participanteIdPatch = new URL(request.url).searchParams.get('participanteId')

  const updateQb = ds
    .getRepository(Mensagem)
    .createQueryBuilder()
    .update()
    .set({ lidoEm: new Date() })
    .where('"IdVeiculo" = :idVeiculo', { idVeiculo })
    .andWhere('"IdDestinatario" = :uid', { uid: user.id })
    .andWhere('"LidoEm" IS NULL')

  if (participanteIdPatch) {
    updateQb.andWhere('"IdRemetente" = :pid', { pid: participanteIdPatch })
  }

  await updateQb.execute()

  return Response.json({ ok: true })
}
