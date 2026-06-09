import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'
import { Imagem } from '@/src/entity/imagem.entity'

/**
 * @swagger
 * /api/veiculos:
 *   get:
 *     summary: Listagem paginada de veículos disponíveis com filtros
 *     tags: [Veículos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, maximum: 48 }
 *       - in: query
 *         name: marca
 *         schema: { type: string }
 *       - in: query
 *         name: modelo
 *         schema: { type: string }
 *       - in: query
 *         name: cor
 *         schema: { type: string }
 *       - in: query
 *         name: anoMin
 *         schema: { type: integer }
 *       - in: query
 *         name: anoMax
 *         schema: { type: integer }
 *       - in: query
 *         name: valorMin
 *         schema: { type: number }
 *       - in: query
 *         name: valorMax
 *         schema: { type: number }
 *       - in: query
 *         name: quilometragemMax
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista paginada de veículos
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const page = Math.max(1, parseInt(params.get('page') ?? '1'))
  const limit = Math.min(48, Math.max(1, parseInt(params.get('limit') ?? '12')))
  const marca = params.get('marca')
  const modelo = params.get('modelo')
  const cor = params.get('cor')
  const anoMin = params.get('anoMin') ? parseInt(params.get('anoMin')!) : null
  const anoMax = params.get('anoMax') ? parseInt(params.get('anoMax')!) : null
  const valorMin = params.get('valorMin') ? parseFloat(params.get('valorMin')!) : null
  const valorMax = params.get('valorMax') ? parseFloat(params.get('valorMax')!) : null
  const quilometragemMax = params.get('quilometragemMax') ? parseInt(params.get('quilometragemMax')!) : null

  const ds = await getDataSource()
  const qb = ds
    .getRepository(Veiculo)
    .createQueryBuilder('veiculo')
    .andWhere('veiculo.vendidoEm IS NULL')
    .andWhere('veiculo.deletadoEm IS NULL')
    .orderBy('veiculo.criadoEm', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)

  if (marca) qb.andWhere('veiculo.marca = :marca', { marca })
  if (modelo) qb.andWhere('veiculo.modelo ILIKE :modelo', { modelo: `%${modelo}%` })
  if (cor) qb.andWhere('veiculo.cor = :cor', { cor })
  if (anoMin !== null) qb.andWhere('veiculo.ano >= :anoMin', { anoMin })
  if (anoMax !== null) qb.andWhere('veiculo.ano <= :anoMax', { anoMax })
  if (valorMin !== null) qb.andWhere('veiculo.valor >= :valorMin', { valorMin })
  if (valorMax !== null) qb.andWhere('veiculo.valor <= :valorMax', { valorMax })
  if (quilometragemMax !== null) qb.andWhere('veiculo.quilometragem <= :quilometragemMax', { quilometragemMax })

  const [data, total] = await qb.getManyAndCount()

  return Response.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * @swagger
 * /api/veiculos:
 *   post:
 *     summary: Cadastra novo veículo com imagens (auth)
 *     tags: [Veículos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [valor, descricao, modelo, ano, cor, marca, motorizacao, quilometragem]
 *             properties:
 *               valor: { type: number }
 *               descricao: { type: string }
 *               modelo: { type: string }
 *               ano: { type: integer }
 *               cor: { type: string }
 *               marca: { type: string }
 *               motorizacao: { type: string }
 *               quilometragem: { type: integer }
 *               imagens:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Veículo cadastrado
 *       400:
 *         description: Dados inválidos ou sem imagem
 *       401:
 *         description: Não autenticado
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth(request)

  const formData = await request.formData()

  const imageFiles = formData.getAll('imagens') as File[]
  if (!imageFiles || imageFiles.length === 0) {
    return Response.json({ error: 'Ao menos uma imagem é obrigatória' }, { status: 400 })
  }

  const valor = parseFloat(formData.get('valor') as string)
  const descricao = formData.get('descricao') as string
  const modelo = formData.get('modelo') as string
  const ano = parseInt(formData.get('ano') as string)
  const cor = formData.get('cor') as string
  const marca = formData.get('marca') as string
  const motorizacao = formData.get('motorizacao') as string
  const quilometragem = parseInt(formData.get('quilometragem') as string)

  if (!descricao || !modelo || !cor || !marca || !motorizacao || isNaN(valor) || isNaN(ano) || isNaN(quilometragem)) {
    return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  const ds = await getDataSource()

  const veiculo = ds.getRepository(Veiculo).create({
    idVendedor: user.id,
    valor,
    descricao,
    modelo,
    ano,
    cor,
    marca,
    motorizacao,
    quilometragem,
    criadoEm: new Date(),
  })
  await ds.getRepository(Veiculo).save(veiculo)

  const imagemRepo = ds.getRepository(Imagem)
  for (const file of imageFiles) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const imagem = imagemRepo.create({
      idVeiculo: veiculo.id,
      conteudo: buffer,
      criadoEm: new Date(),
    })
    await imagemRepo.save(imagem)
  }

  return Response.json(veiculo, { status: 201 })
}
