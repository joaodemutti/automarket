import { clearCookie } from '@/lib/auth'

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Cookie JWT removido
 */
export async function POST() {
  const headers = new Headers()
  clearCookie(headers)
  return Response.json({ ok: true }, { status: 200, headers })
}
