import bcrypt from 'bcrypt'
import { getDataSource } from '@/lib/db'
import { signJwt, setCookie } from '@/lib/auth'
import { Usuario } from '@/src/entity/usuario.entity'

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, senha]
 *             properties:
 *               login: { type: string }
 *               senha: { type: string }
 *     responses:
 *       200:
 *         description: Login bem-sucedido, cookie JWT setado
 *       400:
 *         description: Campos obrigatórios ausentes
 *       401:
 *         description: Credenciais inválidas
 */
export async function POST(request: Request) {
  const { login, senha } = await request.json() as { login: string; senha: string }

  if (!login || !senha) {
    return Response.json({ error: 'login e senha são obrigatórios' }, { status: 400 })
  }

  const ds = await getDataSource()
  const repo = ds.getRepository(Usuario)

  const usuario = await repo.findOne({ where: { login } })
  if (!usuario || usuario.deletadoEm) {
    return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const valid = await bcrypt.compare(senha, usuario.senha)
  if (!valid) {
    return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const token = await signJwt({ id: usuario.id, nome: usuario.nome })
  const headers = new Headers()
  setCookie(headers, token)

  return Response.json(
    { id: usuario.id, login: usuario.login, nome: usuario.nome },
    { status: 200, headers }
  )
}
