import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()

import * as http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { AppDataSource } from './db'
import { verifyJwt } from './auth'
import { Mensagem } from '../entities/mensagem.entity'
import {
  AuthenticatedSocket,
  getRoomKey,
  joinRoom,
  leaveRoom,
  broadcast,
  registerSocket,
  unregisterSocket,
  notifyUser,
  getAllSockets,
} from './rooms'

const PORT = parseInt(process.env.PORT ?? '8080')

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({
  server,
  handleProtocols: (protocols) => (protocols.has('auth') ? 'auth' : false),
})

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const protocolHeader = req.headers['sec-websocket-protocol'] ?? ''
  const parts = protocolHeader.split(',').map((s) => s.trim())
  const token = parts[1]

  if (!token) {
    ws.close(4401, 'unauthorized')
    return
  }

  let userPayload: { id: string; nome: string }
  try {
    userPayload = verifyJwt(token)
  } catch {
    ws.close(4401, 'unauthorized')
    return
  }

  const authWs = ws as AuthenticatedSocket
  authWs.userId = userPayload.id
  authWs.nome = userPayload.nome
  authWs.isAlive = true

  registerSocket(authWs)

  authWs.on('pong', () => {
    authWs.isAlive = true
  })

  authWs.on('message', async (rawData: Buffer) => {
    let payload: { idDestinatario: string; idVeiculo: string; mensagem: string }
    try {
      payload = JSON.parse(rawData.toString())
    } catch {
      return
    }

    const { idDestinatario, idVeiculo, mensagem } = payload
    if (!idDestinatario || !idVeiculo || !mensagem) return

    const roomKey = getRoomKey(idVeiculo, authWs.userId, idDestinatario)
    joinRoom(roomKey, authWs)

    const msgRepo = AppDataSource.getRepository(Mensagem)
    const saved = msgRepo.create({
      mensagem,
      idRemetente: authWs.userId,
      idDestinatario,
      idVeiculo,
      criadoEm: new Date(),
    })
    await msgRepo.save(saved)

    // Load remetente for broadcast
    const full = await msgRepo.findOne({
      where: { id: saved.id },
      relations: ['remetente'],
    })

    const broadcastData = JSON.stringify({
      type: 'message',
      data: {
        id: full!.id,
        mensagem: full!.mensagem,
        idRemetente: full!.idRemetente,
        idDestinatario: full!.idDestinatario,
        idVeiculo: full!.idVeiculo,
        criadoEm: full!.criadoEm,
        remetente: full!.remetente ? { id: full!.remetente.id, nome: full!.remetente.nome } : null,
      },
    })

    broadcast(roomKey, broadcastData)

    // Notify destinatario if connected but not actively in this room
    const notificationData = JSON.stringify({ type: 'notification' })
    notifyUser(idDestinatario, notificationData, roomKey)
  })

  authWs.on('close', () => {
    unregisterSocket(authWs)
  })
})

// Heartbeat: ping every 30s, terminate unresponsive sockets
setInterval(() => {
  const all = getAllSockets()
  all.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate()
      return
    }
    ws.isAlive = false
    ws.ping()
  })
}, 30_000)

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected')
    server.listen(PORT, () => {
      console.log(`Chat server listening on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err)
    process.exit(1)
  })
