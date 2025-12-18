import { database } from "./firebase"
import { ref, set, onValue, update, get, off, remove } from "firebase/database"
import type { Room, RoomPlayer } from "./multiplayer-types"
import type { GameState } from "./game-types"

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generateUserId(): string {
  if (typeof window === "undefined") {
    // Server-side: generate temporary ID
    return Math.random().toString(36).substring(2, 15)
  }

  const stored = localStorage.getItem("battleship-user-id")
  if (stored) return stored

  const newId = Math.random().toString(36).substring(2, 15)
  localStorage.setItem("battleship-user-id", newId)
  return newId
}

export async function createRoom(hostName: string, maxPlayers = 4): Promise<string> {
  console.log("[v0] Creating room...", { hostName, maxPlayers })

  try {
    const roomId = generateRoomId()
    const userId = generateUserId()

    console.log("[v0] Generated IDs:", { roomId, userId })

    const room: Room = {
      id: roomId,
      hostId: userId,
      players: [
        {
          id: userId,
          name: hostName,
          isReady: false,
          isHost: true,
        },
      ],
      maxPlayers,
      status: "waiting",
      currentPlayerIndex: 0,
      createdAt: Date.now(),
    }

    const roomRef = ref(database, `rooms/${roomId}`)
    console.log("[v0] Saving room to Firebase...")
    await set(roomRef, room)
    console.log("[v0] Room created successfully:", roomId)

    return roomId
  } catch (error) {
    console.error("[v0] Error creating room:", error)
    throw error
  }
}

export async function joinRoom(roomId: string, playerName: string): Promise<boolean> {
  const userId = generateUserId()
  const roomRef = ref(database, `rooms/${roomId}`)

  try {
    const snapshot = await get(roomRef)
    if (!snapshot.exists()) {
      throw new Error("Room not found")
    }

    const room = snapshot.val() as Room

    if (room.status !== "waiting") {
      throw new Error("Game already started")
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error("Room is full")
    }

    // Check if user already in room
    if (room.players.some((p) => p.id === userId)) {
      return true
    }

    const newPlayer: RoomPlayer = {
      id: userId,
      name: playerName,
      isReady: false,
      isHost: false,
    }

    await update(roomRef, {
      players: [...room.players, newPlayer],
    })

    return true
  } catch (error) {
    console.error("Error joining room:", error)
    return false
  }
}

export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void) {
  const roomRef = ref(database, `rooms/${roomId}`)

  onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Room)
    } else {
      callback(null)
    }
  })

  return () => off(roomRef)
}

export async function updatePlayerReady(roomId: string, userId: string, isReady: boolean) {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return

  const room = snapshot.val() as Room
  const updatedPlayers = room.players.map((p) => (p.id === userId ? { ...p, isReady } : p))

  await update(roomRef, { players: updatedPlayers })
}

export async function updatePlayerSetupReady(roomId: string, readyPlayerIds: string[]) {
  const roomRef = ref(database, `rooms/${roomId}`)
  await update(roomRef, { setupReady: readyPlayerIds })
}

export async function startGame(roomId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`)
  await update(roomRef, { status: "playing" })
}

export async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}/gameState`)
  await set(roomRef, serializeGameState(gameState))
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return

  const room = snapshot.val() as Room
  const updatedPlayers = room.players.filter((p) => p.id !== userId)

  if (updatedPlayers.length === 0) {
    // Delete room if empty
    await remove(roomRef)
  } else {
    // If host left, assign new host
    const wasHost = room.players.find((p) => p.id === userId)?.isHost
    if (wasHost && updatedPlayers.length > 0) {
      updatedPlayers[0].isHost = true
      await update(roomRef, {
        hostId: updatedPlayers[0].id,
        players: updatedPlayers,
      })
    } else {
      await update(roomRef, { players: updatedPlayers })
    }
  }
}

function serializeGameState(gameState: GameState): any {
  return {
    ...gameState,
    players: gameState.players.map((p) => ({
      ...p,
      board: Array.from(p.board.entries()),
    })),
  }
}

export function deserializeGameState(data: any): GameState {
  return {
    ...data,
    round: data.round ?? 1,
    currentTurnUserId: data.currentTurnUserId ?? data.players?.[data.currentPlayerIndex]?.userId ?? null,
    attackHistory: data.attackHistory ?? [],
    players: data.players.map((p: any) => ({
      ...p,
      bonusShots: p.bonusShots ?? 0,
      pendingBonusShots: p.pendingBonusShots ?? 0,
      board: new Map(p.board),
    })),
  }
}
