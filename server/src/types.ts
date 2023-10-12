export type Todo = {
  id: number
  title: string
  completed: boolean
}

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
