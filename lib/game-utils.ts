import { type Cell, type Player, ROWS, BOARD_SIZE } from "./game-types"

export function positionToKey(row: string, col: number): string {
  return `${row}${col}`
}

export function keyToPosition(key: string): { row: string; col: number } {
  return { row: key[0], col: Number.parseInt(key.slice(1)) }
}

export function getAdjacentCells(position: string): string[] {
  const { row, col } = keyToPosition(position)
  const rowIndex = ROWS.indexOf(row)
  const adjacent: string[] = []

  // Up, Down, Left, Right
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ]

  for (const { dr, dc } of directions) {
    const newRow = rowIndex + dr
    const newCol = col + dc
    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 1 && newCol <= BOARD_SIZE) {
      adjacent.push(positionToKey(ROWS[newRow], newCol))
    }
  }

  return adjacent
}

export function isValidShipPlacement(board: Map<string, Cell>, positions: string[]): boolean {
  if (positions.length === 0) return false

  // Check all positions are water
  for (const pos of positions) {
    const cell = board.get(pos)
    if (!cell || cell.type !== "water") return false
  }

  // Single cell ship is always valid
  if (positions.length === 1) return true

  // Sort positions for easier validation
  const sorted = [...positions].sort()

  // Check if all positions are in a straight line (horizontal or vertical)
  const firstPos = keyToPosition(sorted[0])
  const isHorizontal = sorted.every((pos) => keyToPosition(pos).row === firstPos.row)
  const isVertical = sorted.every((pos) => keyToPosition(pos).col === firstPos.col)

  if (!isHorizontal && !isVertical) return false

  // Check if positions are consecutive
  if (isHorizontal) {
    const cols = sorted.map((pos) => keyToPosition(pos).col)
    for (let i = 1; i < cols.length; i++) {
      if (cols[i] - cols[i - 1] !== 1) return false
    }
  } else {
    const rowIndices = sorted.map((pos) => ROWS.indexOf(keyToPosition(pos).row))
    for (let i = 1; i < rowIndices.length; i++) {
      if (rowIndices[i] - rowIndices[i - 1] !== 1) return false
    }
  }

  return true
}

export function countIslands(landCells: string[]): number {
  if (landCells.length === 0) return 0

  const visited = new Set<string>()
  let islands = 0

  function dfs(cell: string) {
    if (visited.has(cell)) return
    visited.add(cell)

    const adjacent = getAdjacentCells(cell)
    for (const adj of adjacent) {
      if (landCells.includes(adj) && !visited.has(adj)) {
        dfs(adj)
      }
    }
  }

  for (const cell of landCells) {
    if (!visited.has(cell)) {
      islands++
      dfs(cell)
    }
  }

  return islands
}

export function processAttack(
  player: Player,
  position: string,
): { message: string; type: "โดน" | "ล่ม" | "ลงดิน" | "ลงน้ำ"; bonusShots: number; alreadyHit: boolean } {
  const cell = player.board.get(position)
  if (!cell) return { message: "Invalid position", type: "ลงน้ำ", bonusShots: 0, alreadyHit: false }

  if (cell.hit === "hit") {
    // If it's a destroyed cannon or land, give bonus shot
    if (cell.type === "land" || cell.type === "cannon") {
      return { message: "ลงดิน", type: "ลงดิน", bonusShots: 1, alreadyHit: true }
    }
    // Already hit ship or water
    return { message: "ยิงซ้ำ", type: "ลงน้ำ", bonusShots: 0, alreadyHit: true }
  }

  cell.hit = "hit"

  // Check if it's water
  if (cell.type === "water") {
    return { message: "ลงน้ำ", type: "ลงน้ำ", bonusShots: 0, alreadyHit: false }
  }

  // Check if it's land
  if (cell.type === "land") {
    return { message: "ลงดิน", type: "ลงดิน", bonusShots: 1, alreadyHit: false }
  }

  // Check if it's a cannon
  if (cell.type === "cannon") {
    const cannonIndex = player.cannons.indexOf(position)
    if (cannonIndex !== -1) {
      player.cannons.splice(cannonIndex, 1)
      // Don't update availableShots here, it will be updated at start of next turn
      return { message: "โดน (ป้อมปืน)", type: "โดน", bonusShots: 0, alreadyHit: false }
    }
    return { message: "ลงดิน", type: "ลงดิน", bonusShots: 1, alreadyHit: false }
  }

  // It's a ship
  if (cell.shipId) {
    const ship = player.ships.find((s) => s.id === cell.shipId)
    if (ship) {
      ship.hits++
      if (ship.hits >= ship.size) {
        ship.sunk = true
        return { message: "ล่ม", type: "ล่ม", bonusShots: 0, alreadyHit: false }
      }
      return { message: "โดน (เรือ)", type: "โดน", bonusShots: 0, alreadyHit: false }
    }
  }

  return { message: "ลงน้ำ", type: "ลงน้ำ", bonusShots: 0, alreadyHit: false }
}

export function checkGameOver(players: Player[]): number | null {
  const alivePlayers = players.filter((p) => {
    // If player has no ships yet (still in setup), consider them alive
    if (p.ships.length === 0) return true

    const allShipsSunk = p.ships.every((s) => s.sunk)
    return !allShipsSunk
  })

  if (alivePlayers.length === 1) {
    return alivePlayers[0].id
  }

  return null
}
