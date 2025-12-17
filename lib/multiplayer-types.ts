import type { Player, GameState } from "./game-types"

export interface Room {
  id: string
  hostId: string
  players: RoomPlayer[]
  maxPlayers: number
  status: "waiting" | "playing" | "finished"
  currentPlayerIndex: number
  createdAt: number
  gameState?: GameState
  setupReady?: string[]
}

export interface RoomPlayer {
  id: string
  name: string
  isReady: boolean
  isHost: boolean
}

export interface FirebasePlayer extends Player {
  userId: string
}
