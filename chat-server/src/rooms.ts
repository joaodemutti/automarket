import { WebSocket } from 'ws'

export interface AuthenticatedSocket extends WebSocket {
  userId: string
  nome: string
  isAlive: boolean
}

const rooms = new Map<string, Set<AuthenticatedSocket>>()
const userSockets = new Map<string, Set<AuthenticatedSocket>>()

export function getRoomKey(idVeiculo: string, idA: string, idB: string): string {
  return `${idVeiculo}:${[idA, idB].sort().join(':')}`
}

export function joinRoom(roomKey: string, ws: AuthenticatedSocket): void {
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Set())
  rooms.get(roomKey)!.add(ws)
}

export function leaveRoom(roomKey: string, ws: AuthenticatedSocket): void {
  rooms.get(roomKey)?.delete(ws)
}

export function broadcast(roomKey: string, data: string, excludeWs?: WebSocket): void {
  rooms.get(roomKey)?.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

export function registerSocket(ws: AuthenticatedSocket): void {
  if (!userSockets.has(ws.userId)) userSockets.set(ws.userId, new Set())
  userSockets.get(ws.userId)!.add(ws)
}

export function unregisterSocket(ws: AuthenticatedSocket): void {
  userSockets.get(ws.userId)?.delete(ws)
}

export function notifyUser(userId: string, data: string, excludeRoomKey?: string): void {
  const sockets = userSockets.get(userId)
  if (!sockets) return

  // If the user has a socket actively in this room they already receive the message
  // via broadcast — skip the notification entirely so the sound doesn't play
  // for someone who is already watching the chat.
  if (excludeRoomKey) {
    const roomMembers = rooms.get(excludeRoomKey)
    if (roomMembers && [...sockets].some((ws) => roomMembers.has(ws))) return
  }

  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })
}

export function getAllSockets(): AuthenticatedSocket[] {
  const all: AuthenticatedSocket[] = []
  rooms.forEach((sockets) => sockets.forEach((ws) => all.push(ws)))
  return all
}
