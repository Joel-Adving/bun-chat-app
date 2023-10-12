import { Room } from '../types'

export function generateRoomId(map: Map<number, Room>) {
  let roomId = map.values.length + 1
  while (map.has(roomId)) {
    roomId++
  }
  return roomId
}
