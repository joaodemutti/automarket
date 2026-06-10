import { createSwaggerSpec } from 'next-swagger-doc'

export async function GET() {
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

  return Response.json(spec)
}
