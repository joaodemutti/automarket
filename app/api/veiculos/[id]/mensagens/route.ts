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

  const mensagens = await ds
    .getRepository(Mensagem)
    .createQueryBuilder('mensagem')
    .leftJoinAndSelect('mensagem.remetente', 'remetente')
    .where('mensagem.idVeiculo = :idVeiculo', { idVeiculo })
    .andWhere(
      '(mensagem.idRemetente = :uid OR mensagem.idDestinatario = :uid)',
      { uid: user.id }
    )
    .orderBy('mensagem.criadoEm', 'ASC')
    .getMany()

  const result = mensagens.map((m) => ({
    id: m.id,
    mensagem: m.mensagem,
    idRemetente: m.idRemetente,
    idDestinatario: m.idDestinatario,
    idVeiculo: m.idVeiculo,
    criadoEm: m.criadoEm,
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

  await ds
    .getRepository(Mensagem)
    .createQueryBuilder()
    .update()
    .set({ lidoEm: new Date() })
    .where('"IdVeiculo" = :idVeiculo', { idVeiculo })
    .andWhere('"IdDestinatario" = :uid', { uid: user.id })
    .andWhere('"LidoEm" IS NULL')
    .execute()

  return Response.json({ ok: true })
}
