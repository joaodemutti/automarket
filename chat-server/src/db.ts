import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Usuario } from '../entities/usuario.entity'
import { Mensagem } from '../entities/mensagem.entity'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [Usuario, Mensagem],
})
