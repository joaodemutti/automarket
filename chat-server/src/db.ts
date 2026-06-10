import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Usuario } from '../entities/usuario.entity'
import { Mensagem } from '../entities/mensagem.entity'

const databaseUrl = process.env.DATABASE_URL
const sslMode = process.env.DATABASE_SSL

const shouldUseSsl =
  sslMode === 'true' ||
  databaseUrl?.includes('sslmode=require') ||
  databaseUrl?.includes('neon.tech') ||
  false

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [Usuario, Mensagem],
})
