import 'reflect-metadata'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcrypt'
import { AppDataSource } from './data-source'
import { Usuario } from './entity/usuario.entity'
import { Veiculo } from './entity/veiculo.entity'
import { Imagem } from './entity/imagem.entity'

const SEED_IMAGES_DIR = path.join(process.cwd(), 'seed-images')
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i

const VEICULOS_SEED = [
  { modelo: 'Gol', marca: 'Volkswagen', ano: 2019, cor: 'Branco', motorizacao: '1.0', quilometragem: 45000, valor: 38000, descricao: 'Gol em ótimo estado, revisado e com manual.' },
  { modelo: 'Onix', marca: 'Chevrolet', ano: 2021, cor: 'Prata', motorizacao: '1.0 Turbo', quilometragem: 22000, valor: 62000, descricao: 'Onix turbo completo, único dono.' },
  { modelo: 'HB20', marca: 'Hyundai', ano: 2020, cor: 'Vermelho', motorizacao: '1.0', quilometragem: 35000, valor: 55000, descricao: 'HB20 bem conservado, IPVA pago.' },
  { modelo: 'Kwid', marca: 'Renault', ano: 2022, cor: 'Azul', motorizacao: '1.0', quilometragem: 15000, valor: 52000, descricao: 'Kwid seminovo com garantia de fábrica.' },
  { modelo: 'Polo', marca: 'Volkswagen', ano: 2023, cor: 'Preto', motorizacao: '1.0 TSI', quilometragem: 8000, valor: 89000, descricao: 'Polo TSI top de linha, impecável.' },
]

function readImages(dir: string): Buffer[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTENSIONS.test(f))
    .map(f => fs.readFileSync(path.join(dir, f)))
}

async function main() {
  await AppDataSource.initialize()

  const usuarioRepo = AppDataSource.getRepository(Usuario)
  const veiculoRepo = AppDataSource.getRepository(Veiculo)
  const imagemRepo = AppDataSource.getRepository(Imagem)

  // Create or reuse seed user
  let user = await usuarioRepo.findOne({ where: { login: 'seed@dubcar.com' } })
  if (!user) {
    const senha = await bcrypt.hash('seed123', 10)
    user = usuarioRepo.create({ login: 'seed@dubcar.com', senha, nome: 'Vendedor Seed', criadoEm: new Date() })
    await usuarioRepo.save(user)
    console.log('Usuário criado: seed@dubcar.com / seed123')
  } else {
    console.log('Usuário seed já existe, reutilizando.')
  }

  // Discover image sources: subfolders = one vehicle each, flat files = distributed
  const subfolders = fs.existsSync(SEED_IMAGES_DIR)
    ? fs.readdirSync(SEED_IMAGES_DIR).filter(name =>
        fs.statSync(path.join(SEED_IMAGES_DIR, name)).isDirectory()
      )
    : []

  const flatImages = subfolders.length === 0 ? readImages(SEED_IMAGES_DIR) : []

  for (let i = 0; i < VEICULOS_SEED.length; i++) {
    const data = VEICULOS_SEED[i]
    const veiculo = veiculoRepo.create({ ...data, idVendedor: user.id, criadoEm: new Date() })
    await veiculoRepo.save(veiculo)
    console.log(`Veículo criado: ${data.marca} ${data.modelo} (${data.ano})`)

    let buffers: Buffer[] = []
    if (subfolders[i]) {
      buffers = readImages(path.join(SEED_IMAGES_DIR, subfolders[i]))
    } else if (flatImages.length > 0) {
      buffers = [flatImages[i % flatImages.length]]
    }

    for (const conteudo of buffers) {
      await imagemRepo.save(imagemRepo.create({ idVeiculo: veiculo.id, conteudo, criadoEm: new Date() }))
    }
    if (buffers.length > 0) console.log(`  └─ ${buffers.length} imagem(ns) anexada(s)`)
  }

  await AppDataSource.destroy()
  console.log('\nSeed concluído.')
}

main().catch(err => { console.error(err); process.exit(1) })
