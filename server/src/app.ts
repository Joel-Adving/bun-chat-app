import { Elysia, t } from 'elysia'
import cors from '@elysiajs/cors'
import { generateRoomId } from './utils/helpers'
import { Room } from './types'

const initialRoom = {
  roomId: 1,
  name: 'Room 1',
  creator: 'god',
  usersInRoom: []
}
const initialMessages = ['Hello', 'World']
const chatRooms = new Map<number, Room>([[1, initialRoom]])
const chatRoomMessages = new Map<number, string[]>([[1, initialMessages]])

export const app = new Elysia()
  .use(
    cors({
      origin: ['localhost', 'localhost:3000', 'localhost:4321', '10.10.10.46:4000', 'chat.oki.gg', 'ws-chat.oki.gg']
    })
  )

  .get('/rooms', () => {
    return Array.from(chatRooms.values())
  })

  .post(
    '/rooms',
    ({ body }) => {
      const roomId = generateRoomId(chatRooms)
      const newRoom = { roomId, ...body, usersInRoom: [] }
      chatRooms.set(roomId, newRoom)
      chatRoomMessages.set(roomId, [])
      return newRoom
    },
    {
      body: t.Object({
        name: t.String(),
        creator: t.String()
      })
    }
  )

  .ws('/room/:id', {
    open(ws) {
      const { id: roomId } = ws.data.params as { id: string }
      const { username } = ws.data.query as { username: string }

      if (!roomId) {
        return
      }

      const chatRoom = chatRooms.get(parseInt(roomId))
      if (!chatRoom) {
        return
      }

      ws.subscribe(roomId)

      const msg = `${username}: joined`
      const messages = chatRoomMessages.get(parseInt(roomId))
      if (messages) {
        if (messages.length > 0) {
          ws.send(messages.join('\n'))
        }
        messages.push(msg)
      }
      ws.publish(roomId, msg)
      ws.send(msg)
    },

    message(ws, message) {
      const { id: roomId } = ws.data.params as { id: string }
      if (!roomId) {
        return
      }

      const chatRoom = chatRooms.get(parseInt(roomId))
      if (!chatRoom) {
        return
      }

      const roomMsgs = chatRoomMessages.get(parseInt(roomId))
      const msg = `${ws.data.query.username}: ${message}`
      if (roomMsgs) {
        roomMsgs.push(msg)
      }
      ws.publish(roomId, msg)
      ws.send(msg)
    },

    close(ws, code, message) {
      const { id: roomId } = ws.data.params as { id: string }
      const { username } = ws.data.query as { username: string }
      if (!roomId) {
        return
      }

      console.log('close event', code, message)

      const chatRoom = chatRooms.get(parseInt(roomId))
      if (!chatRoom) {
        return
      }

      const roomMsgs = chatRoomMessages.get(parseInt(roomId))
      const msg = `${username}: left`
      if (roomMsgs) {
        roomMsgs.push(msg)
      }
      ws.publish(roomId, msg)
      ws.unsubscribe(roomId)
    }
  })

  .onStart(({ app }) => console.log(`Running at ${app.server?.hostname}:${app.server?.port}`))
  .listen(3000)
