export type Message = {
  completed?: boolean | undefined
  title: string
}

export type Room = {
  roomId: number
  creator: string
  name: string
  usersInRoom: string[]
}
