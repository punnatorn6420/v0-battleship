import { type GameState, type Player, type Cell, ROWS, COLS } from "./game-types"

export function createInitialBoard(): Map<string, Cell> {
  const board = new Map<string, Cell>()
  for (const row of ROWS) {
    for (const col of COLS) {
      const key = `${row}${col}`
      board.set(key, {
        type: "water",
        hit: "none",
      })
    }
  }
  return board
}

export function createPlayer(id: number): Player {
  return {
    id,
    name: `ผู้เล่น ${id}`,
    board: createInitialBoard(),
    ships: [],
    cannons: [],
    landCells: [],
    availableShots: 3,
    bonusShots: 0,
    pendingBonusShots: 0,
    isAlive: true,
  }
}

export function createInitialGameState(): GameState {
  return {
    players: [createPlayer(1), createPlayer(2), createPlayer(3), createPlayer(4)],
    currentPlayerIndex: 0,
    currentTurnUserId: null,
    phase: "setup",
    setupStep: "ships",
    winner: null,
    round: 1,
    attackHistory: [],
  }
}
