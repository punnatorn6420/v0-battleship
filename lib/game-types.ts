export type CellType = "water" | "land" | "ship" | "cannon"
export type HitStatus = "none" | "hit" | "miss"

export interface Cell {
  type: CellType
  hit: HitStatus
  shipId?: string
  playerId?: number
}

export interface Ship {
  id: string
  size: number
  positions: string[] // ['A1', 'A2', 'A3']
  hits: number
  sunk: boolean
}

export interface Player {
  id: number
  userId?: string
  name: string
  board: Map<string, Cell>
  ships: Ship[]
  cannons: string[] // positions of cannons
  landCells: string[] // positions of land
  availableShots: number
  bonusShots: number
  isAlive: boolean
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  phase: "setup" | "battle"
  setupStep: "ships" | "land" | "cannons" | "complete"
  winner: number | null
  lastAttackResult?: {
    message: string
    type: "โดน" | "ล่ม" | "ลงดิน" | "ลงน้ำ"
  }
  attackHistory: AttackLogEntry[]
}

export interface AttackLogEntry {
  id: string
  attackerId: number
  targetId: number
  position: string
  result: string
  type: "โดน" | "ล่ม" | "ลงดิน" | "ลงน้ำ"
}

export const BOARD_SIZE = 8
export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]
export const COLS = [1, 2, 3, 4, 5, 6, 7, 8]

export const SHIP_SIZES = [
  { size: 4, count: 1 },
  { size: 3, count: 1 },
  { size: 2, count: 1 },
  { size: 1, count: 2 },
]

export const LAND_COUNT = 12
export const CANNON_COUNT = 3
export const MAX_ISLANDS = 2
