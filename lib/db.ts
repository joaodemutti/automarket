import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Usuario } from '../src/entity/usuario.entity'
import { Veiculo } from '../src/entity/veiculo.entity'
import { Imagem } from '../src/entity/imagem.entity'
import { Mensagem } from '../src/entity/mensagem.entity'

declare global {
  // eslint-disable-next-line no-var
  var __dataSource: DataSource | undefined
}

const databaseUrl = process.env.DATABASE_URL
const sslMode = process.env.DATABASE_SSL

const shouldUseSsl =
  sslMode === 'true' ||
  databaseUrl?.includes('sslmode=require') ||
  databaseUrl?.includes('neon.tech') ||
  false

const dataSource =
  global.__dataSource ??
  new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
    entities: [Usuario, Veiculo, Imagem, Mensagem],
  })

if (!global.__dataSource) {
  global.__dataSource = dataSource
}

export default dataSource

export async function getDataSource(): Promise<DataSource> {
  if (global.__dataSource?.isInitialized) {
    try {
      // After HMR, entity class objects are new — metadata lookup fails
      global.__dataSource.getMetadata(Veiculo)
      return global.__dataSource
    } catch {
      await global.__dataSource.destroy().catch(() => {})
      global.__dataSource = undefined
    }
  }

  const fresh = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
    entities: [Usuario, Veiculo, Imagem, Mensagem],
  })
  await fresh.initialize()
  global.__dataSource = fresh
  return fresh
}
