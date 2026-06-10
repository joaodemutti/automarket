import { readFileSync } from 'fs'
import { join } from 'path'

export function GET() {
  const spec = JSON.parse(readFileSync(join(process.cwd(), 'public/swagger.json'), 'utf-8'))
  return Response.json(spec)
}
