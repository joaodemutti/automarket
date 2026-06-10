import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import bcrypt from 'bcrypt'

const SEED_IMAGES_DIR = path.join(process.cwd(), 'seed-images')
const IMAGE_EXTENSIONS = /\.(jpg|jpeg)$/i
const TIMESTAMP = Date.now()

const VEICULOS_SEED = [
  { modelo: 'Gol', marca: 'Volkswagen', ano: 2019, cor: 'Branco', motorizacao: '1.0', quilometragem: 45000, valor: 38000, descricao: 'Gol em ótimo estado, revisado e com manual.', vendido: true, folder: 'gol' },
  { modelo: 'Onix', marca: 'Chevrolet', ano: 2021, cor: 'Prata', motorizacao: '1.0 Turbo', quilometragem: 22000, valor: 62000, descricao: 'Onix turbo completo, único dono.', vendido: true, folder: 'onix' },
  { modelo: 'HB20', marca: 'Hyundai', ano: 2020, cor: 'Vermelho', motorizacao: '1.0', quilometragem: 35000, valor: 55000, descricao: 'HB20 bem conservado, IPVA pago.', vendido: false, folder: 'hb20' },
  { modelo: 'Kwid', marca: 'Renault', ano: 2022, cor: 'Azul', motorizacao: '1.0', quilometragem: 15000, valor: 52000, descricao: 'Kwid seminovo com garantia de fábrica.', vendido: false, folder: 'kwid' },
  { modelo: 'Polo', marca: 'Volkswagen', ano: 2023, cor: 'Preto', motorizacao: '1.0 TSI', quilometragem: 8000, valor: 89000, descricao: 'Polo TSI top de linha, impecável.', vendido: false, folder: 'polo' },
  { modelo: 'Argo', marca: 'Fiat', ano: 2022, cor: 'Cinza', motorizacao: '1.0', quilometragem: 28000, valor: 68000, descricao: 'Fiat Argo Drive completo, revisado na concessionária.', vendido: false, folder: 'argo' },
  { modelo: 'Fusca', marca: 'Volkswagen', ano: 1973, cor: 'Azul', motorizacao: '1.6', quilometragem: 85000, valor: 45000, descricao: 'Fusca clássico em excelente estado, raridade colecionável.', vendido: false, folder: 'fusca' },
]

// buyer1 + buyer2 = 2 interessados; buyer1 only = 1 interessado
const MENSAGENS_SEED = [
  { veiculoIdx: 0, remetenteKey: 'buyer1', textos: ['Ainda está disponível?', 'Quero comprar!'] },
  { veiculoIdx: 1, remetenteKey: 'buyer1', textos: ['Tenho interesse no Onix, podemos fechar negócio?'] },
  { veiculoIdx: 2, remetenteKey: 'buyer1', textos: ['Ainda está disponível?', 'Qual o valor mínimo?'] },
  { veiculoIdx: 2, remetenteKey: 'buyer2', textos: ['Vi o anúncio, tenho interesse!'] },
  { veiculoIdx: 4, remetenteKey: 'buyer1', textos: ['Tenho interesse, pode me ligar?'] },
  { veiculoIdx: 4, remetenteKey: 'buyer2', textos: ['Aceita troca?'] },
  { veiculoIdx: 6, remetenteKey: 'buyer1', textos: ['Fusca impecável! Aceita proposta?'] },
]

function readImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXTENSIONS.test(f))
    .map(f => fs.readFileSync(path.join(dir, f)).toString('hex'))
}

function q(s: string) {
  return s.replace(/'/g, "''")
}

async function main() {
  const [senhaVendedor, senhaBuyer1, senhaBuyer2] = await Promise.all([
    bcrypt.hash('senha123', 10),
    bcrypt.hash('senha123', 10),
    bcrypt.hash('senha123', 10),
  ])

  const sellerId = crypto.randomUUID()
  const buyer1Id = crypto.randomUUID()
  const buyer2Id = crypto.randomUUID()
  const buyerIds: Record<string, string> = { buyer1: buyer1Id, buyer2: buyer2Id }

  const flatImages = readImages(SEED_IMAGES_DIR)

  const lines: string[] = []

  // Seller
  lines.push(`    await queryRunner.query(\``)
  lines.push(`      INSERT INTO "Usuario" ("Id", "Login", "Senha", "Nome", "CriadoEm")`)
  lines.push(`      SELECT '${sellerId}', 'dubcar@email.com', '${q(senhaVendedor)}', 'Carlos Mendes', NOW()`)
  lines.push(`      WHERE NOT EXISTS (SELECT 1 FROM "Usuario" WHERE "Login" = 'dubcar@email.com')`)
  lines.push(`    \`)`)
  lines.push(``)

  // Buyer 1
  lines.push(`    await queryRunner.query(\``)
  lines.push(`      INSERT INTO "Usuario" ("Id", "Login", "Senha", "Nome", "CriadoEm")`)
  lines.push(`      SELECT '${buyer1Id}', 'comprador@email.com', '${q(senhaBuyer1)}', 'Rafael Lima', NOW()`)
  lines.push(`      WHERE NOT EXISTS (SELECT 1 FROM "Usuario" WHERE "Login" = 'comprador@email.com')`)
  lines.push(`    \`)`)
  lines.push(``)

  // Buyer 2
  lines.push(`    await queryRunner.query(\``)
  lines.push(`      INSERT INTO "Usuario" ("Id", "Login", "Senha", "Nome", "CriadoEm")`)
  lines.push(`      SELECT '${buyer2Id}', 'comprador2@email.com', '${q(senhaBuyer2)}', 'Ana Costa', NOW()`)
  lines.push(`      WHERE NOT EXISTS (SELECT 1 FROM "Usuario" WHERE "Login" = 'comprador2@email.com')`)
  lines.push(`    \`)`)
  lines.push(``)

  const vehicleIds: string[] = []

  for (let i = 0; i < VEICULOS_SEED.length; i++) {
    const v = VEICULOS_SEED[i]
    const vId = crypto.randomUUID()
    vehicleIds.push(vId)

    if (v.vendido) {
      lines.push(`    // ${v.marca} ${v.modelo} (vendido)`)
      lines.push(`    await queryRunner.query(\``)
      lines.push(`      INSERT INTO "Veiculo" ("Id", "IdVendedor", "IdComprador", "Valor", "Descricao", "Modelo", "Ano", "Cor", "Marca", "Motorização", "Quilometragem", "VendidoEm", "CriadoEm")`)
      lines.push(`      VALUES ('${vId}', '${sellerId}', '${buyer1Id}', ${v.valor}, '${q(v.descricao)}', '${q(v.modelo)}', ${v.ano}, '${q(v.cor)}', '${q(v.marca)}', '${q(v.motorizacao)}', ${v.quilometragem}, NOW(), NOW())`)
      lines.push(`    \`)`)
    } else {
      lines.push(`    // ${v.marca} ${v.modelo}`)
      lines.push(`    await queryRunner.query(\``)
      lines.push(`      INSERT INTO "Veiculo" ("Id", "IdVendedor", "Valor", "Descricao", "Modelo", "Ano", "Cor", "Marca", "Motorização", "Quilometragem", "CriadoEm")`)
      lines.push(`      VALUES ('${vId}', '${sellerId}', ${v.valor}, '${q(v.descricao)}', '${q(v.modelo)}', ${v.ano}, '${q(v.cor)}', '${q(v.marca)}', '${q(v.motorizacao)}', ${v.quilometragem}, NOW())`)
      lines.push(`    \`)`)
    }
    lines.push(``)

    const folderPath = path.join(SEED_IMAGES_DIR, v.folder)
    const images = fs.existsSync(folderPath)
      ? readImages(folderPath)
      : flatImages.length > 0 ? [flatImages[i % flatImages.length]] : []

    for (const hex of images) {
      const imgId = crypto.randomUUID()
      lines.push(`    await queryRunner.query(\``)
      lines.push(`      INSERT INTO "Imagem" ("Id", "IdVeiculo", "Conteudo", "CriadoEm")`)
      lines.push(`      VALUES ('${imgId}', '${vId}', '\\\\x${hex}', NOW())`)
      lines.push(`    \`)`)
      lines.push(``)
    }
  }

  // Messages (interessados)
  for (const m of MENSAGENS_SEED) {
    const vId = vehicleIds[m.veiculoIdx]
    for (const texto of m.textos) {
      const msgId = crypto.randomUUID()
      lines.push(`    await queryRunner.query(\``)
      lines.push(`      INSERT INTO "Mensagem" ("Id", "Mensagem", "IdRemetente", "IdDestinatario", "IdVeiculo", "CriadoEm")`)
      const remetenteId = buyerIds[m.remetenteKey]
      lines.push(`      VALUES ('${msgId}', '${q(texto)}', '${remetenteId}', '${sellerId}', '${vId}', NOW())`)
      lines.push(`    \`)`)
      lines.push(``)
    }
  }

  const downLines: string[] = []
  downLines.push(`    await queryRunner.query(\`DELETE FROM "Mensagem" WHERE "IdRemetente" IN ('${buyer1Id}', '${buyer2Id}')\`)`)
  for (const vId of vehicleIds) {
    downLines.push(`    await queryRunner.query(\`DELETE FROM "Imagem" WHERE "IdVeiculo" = '${vId}'\`)`)
    downLines.push(`    await queryRunner.query(\`DELETE FROM "Veiculo" WHERE "Id" = '${vId}'\`)`)
  }
  downLines.push(`    await queryRunner.query(\`DELETE FROM "Usuario" WHERE "Id" IN ('${buyer1Id}', '${buyer2Id}')\`)`)
  downLines.push(`    await queryRunner.query(\`DELETE FROM "Usuario" WHERE "Id" = '${sellerId}'\`)`)

  const content = `import { MigrationInterface, QueryRunner } from 'typeorm'

export class Seed${TIMESTAMP} implements MigrationInterface {
  name = 'Seed${TIMESTAMP}'

  public async up(queryRunner: QueryRunner): Promise<void> {
${lines.join('\n')}  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${downLines.join('\n')}
  }
}
`

  const outPath = path.join('src', 'migration', `${TIMESTAMP}-seed.ts`)
  fs.writeFileSync(outPath, content, 'utf-8')
  console.log(`Migration gerada: ${outPath}`)
  console.log(`Vendedor — Login: dubcar@email.com  | Senha: senha123`)
  console.log(`Comprador 1 — Login: comprador@email.com  | Senha: senha123`)
  console.log(`Comprador 2 — Login: comprador2@email.com | Senha: senha123`)
}

main().catch(err => { console.error(err); process.exit(1) })
