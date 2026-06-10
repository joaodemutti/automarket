import type { NextRequest } from 'next/server'
import { getDataSource } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Veiculo } from '@/src/entity/veiculo.entity'
import { Imagem } from '@/src/entity/imagem.entity'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imagemId: string }> }
) {
  const user = await requireAuth(request)
  const { id, imagemId } = await params
  const ds = await getDataSource()

  const veiculo = await ds.getRepository(Veiculo).findOne({ where: { id } })
  if (!veiculo || veiculo.deletadoEm) {
    return Response.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  if (veiculo.idVendedor !== user.id) {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const imagemRepo = ds.getRepository(Imagem)
  const imagem = await imagemRepo.findOne({ where: { id: imagemId, idVeiculo: id } })
  if (!imagem || imagem.deletadoEm) {
    return Response.json({ error: 'Imagem não encontrada' }, { status: 404 })
  }

  imagem.deletadoEm = new Date()
  await imagemRepo.save(imagem)

  return Response.json({ ok: true })
}
