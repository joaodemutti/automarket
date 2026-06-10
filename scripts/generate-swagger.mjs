import { createSwaggerSpec } from 'next-swagger-doc'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const spec = createSwaggerSpec({
  apiFolder: 'app/api',
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoMarket API',
      version: '1.0.0',
      description: 'API da plataforma de compra e venda de veículos usados',
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e tokens' },
      { name: 'Veículos', description: 'Listagem, cadastro e gerenciamento de veículos' },
      { name: 'Mensagens', description: 'Histórico de chat' },
      { name: 'Usuários', description: 'Perfis públicos' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
    },
  },
})

const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'swagger.json'), JSON.stringify(spec, null, 2))
console.log('swagger.json generated')
