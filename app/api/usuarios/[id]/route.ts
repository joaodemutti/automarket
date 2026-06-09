import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { Usuario } from '@/src/entity/usuario.entity'

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Perfil público de um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Perfil público (sem senha)
 *       404:
 *         description: Usuário não encontrado
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ds = await getDataSource()
  const usuario = await ds.getRepository(Usuario).findOne({ where: { id } })

  if (!usuario || usuario.deletadoEm) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return Response.json({ id: usuario.id, login: usuario.login, nome: usuario.nome, criadoEm: usuario.criadoEm })
}
