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

const dataSource =
  global.__dataSource ??
  new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: false,
    entities: [Usuario, Veiculo, Imagem, Mensagem],
  })

if (!global.__dataSource) {
  global.__dataSource = dataSource
}

export default dataSource

export async function getDataSource(): Promise<DataSource> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize()
  }
  return dataSource
}
