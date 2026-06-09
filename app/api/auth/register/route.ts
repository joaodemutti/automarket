import bcrypt from 'bcrypt'
import { getDataSource } from '@/lib/db'
import { Usuario } from '@/src/entity/usuario.entity'

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cadastro de novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, senha, nome]
 *             properties:
 *               login: { type: string }
 *               senha: { type: string }
 *               nome: { type: string }
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Campos obrigatórios ausentes
 *       409:
 *         description: Login já cadastrado
 */
export async function POST(request: Request) {
  const { login, senha, nome } = await request.json() as { login: string; senha: string; nome: string }

  if (!login || !senha || !nome) {
    return Response.json({ error: 'login, senha e nome são obrigatórios' }, { status: 400 })
  }

  const ds = await getDataSource()
  const repo = ds.getRepository(Usuario)

  const existing = await repo.findOne({ where: { login } })
  if (existing) {
    return Response.json({ error: 'Login já cadastrado' }, { status: 409 })
  }

  const senhaHash = await bcrypt.hash(senha, 10)
  const usuario = repo.create({ login, senha: senhaHash, nome, criadoEm: new Date() })
  await repo.save(usuario)

  return Response.json({ id: usuario.id, login: usuario.login, nome: usuario.nome }, { status: 201 })
}
