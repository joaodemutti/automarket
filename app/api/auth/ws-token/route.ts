import type { NextRequest } from 'next/server'
import { requireAuth, signWsToken } from '@/lib/auth'

/**
 * @swagger
 * /api/auth/ws-token:
 *   get:
 *     summary: Gera token efêmero (60s) para handshake WebSocket
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token efêmero gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       401:
 *         description: Não autenticado
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const token = await signWsToken({ id: user.id, nome: user.nome })
  return Response.json({ token })
}
