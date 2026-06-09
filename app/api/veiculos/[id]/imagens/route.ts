import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'
import { Imagem } from '@/src/entity/imagem.entity'

/**
 * @swagger
 * /api/veiculos/{id}/imagens:
 *   get:
 *     summary: Galeria de imagens de um veículo (base64)
 *     tags: [Veículos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array de imagens em base64
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

  const imagens = await ds.getRepository(Imagem).find({
    where: { idVeiculo: id },
    order: { criadoEm: 'ASC' },
  })

  const result = imagens
    .filter((img) => !img.deletadoEm)
    .map((img) => ({
      id: img.id,
      conteudo: img.conteudo.toString('base64'),
      criadoEm: img.criadoEm,
    }))

  return Response.json(result)
}

/**
 * @swagger
 * /api/veiculos/{id}/imagens:
 *   post:
 *     summary: Upload de imagem para veículo (auth, apenas dono)
 *     tags: [Veículos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagens:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Imagens salvas
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Veículo não encontrado
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(request)
  const { id } = await params
  const ds = await getDataSource()

  const veiculo = await ds.getRepository(Veiculo).findOne({ where: { id } })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  if (veiculo.idVendedor !== user.id) {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const formData = await request.formData()
  const files = formData.getAll('imagens') as File[]

  if (!files || files.length === 0) {
    return Response.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
  }

  const imagemRepo = ds.getRepository(Imagem)
  const saved: string[] = []
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const imagem = imagemRepo.create({ idVeiculo: id, conteudo: buffer, criadoEm: new Date() })
    await imagemRepo.save(imagem)
    saved.push(imagem.id)
  }

  return Response.json({ ids: saved }, { status: 201 })
}
