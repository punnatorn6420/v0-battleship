"use client"

import { useState, useEffect } from "react"
import { Lobby } from "@/components/lobby"
import { OnlineSetupPhase } from "@/components/online-setup-phase"
import { OnlineBattlePhase } from "@/components/online-battle-phase"
import type { Room } from "@/lib/multiplayer-types"
import type { GameState, Player } from "@/lib/game-types"
import { subscribeToRoom, updateGameState, generateUserId, deserializeGameState } from "@/lib/multiplayer-service"
import { Anchor } from "lucide-react"

export default function BattleshipGame() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [gamePhase, setGamePhase] = useState<"lobby" | "setup" | "battle">("lobby")
  const [playersReady, setPlayersReady] = useState<Set<string>>(new Set())
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [userId] = useState(() => generateUserId())

  useEffect(() => {
    if (!currentRoom) return

    console.log("[v0] Subscribing to room:", currentRoom.id)

    const unsubscribe = subscribeToRoom(currentRoom.id, (room) => {
      if (!room) {
        console.log("[v0] Room not found, returning to lobby")
        setGamePhase("lobby")
        setCurrentRoom(null)
        return
      }

      setCurrentRoom(room)

      if (room.setupReady) {
        setPlayersReady(new Set(room.setupReady))
      }

      if (room.status === "playing") {
        if (room.gameState) {
          const deserializedState = deserializeGameState(room.gameState)
          setGameState(deserializedState)

          // Check if all players have setup
          const allSetup = deserializedState.players.every(
            (p) => p.ships.length > 0 && p.landCells.length > 0 && p.cannons.length > 0,
          )

          console.log("[v0] All setup:", allSetup, "Game phase:", deserializedState.phase)

          // Only go to battle if game phase is explicitly "battle"
          if (deserializedState.phase === "battle") {
            console.log("[v0] Transitioning to battle phase")
            setGamePhase("battle")
          } else {
            console.log("[v0] Staying in setup phase")
            setGamePhase("setup")
          }
        } else {
          setGamePhase("setup")
        }
      }
    })

    return unsubscribe
  }, [currentRoom]) // Use currentRoom as dependency

  const handleGameStart = (room: Room) => {
    console.log("[v0] Game starting for room:", room.id)
    setCurrentRoom(room)
    setGamePhase("setup")

    const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]
    const COLS = [1, 2, 3, 4, 5, 6, 7, 8]

    const initialState: GameState = {
      players: room.players.map((p, idx) => {
        const board = new Map()
        for (const row of ROWS) {
          for (const col of COLS) {
            board.set(`${row}${col}`, { type: "water", hit: "none" })
          }
        }

        return {
          id: idx + 1,
          name: p.name,
          board,
          ships: [],
          cannons: [],
          landCells: [],
          availableShots: 0, // Will be set after setup
          bonusShots: 0,
          isAlive: true,
        }
      }),
      currentPlayerIndex: 0,
      phase: "setup",
      setupStep: "ships",
      winner: null,
    }

    setGameState(initialState)
  }

  const handlePlayerSetupComplete = async (player: Player) => {
    if (!gameState || !currentRoom) return

    console.log("[v0] Player setup complete:", player.name, "Ships:", player.ships.length)

    // Update the specific player in game state
    const updatedPlayers = gameState.players.map((p) => (p.id === player.id ? player : p))

    const newGameState: GameState = {
      ...gameState,
      players: updatedPlayers,
      phase: "setup",
    }

    setGameState(newGameState)

    const newPlayersReady = new Set(playersReady)
    newPlayersReady.add(userId)
    setPlayersReady(newPlayersReady)

    // Update Firebase with game state and ready status
    await updateGameState(currentRoom.id, newGameState)

    // Save setupReady to Firebase
    const { updatePlayerSetupReady } = await import("@/lib/multiplayer-service")
    await updatePlayerSetupReady(currentRoom.id, Array.from(newPlayersReady))

    console.log("[v0] Players ready:", newPlayersReady.size, "/", currentRoom.players.length)

    if (newPlayersReady.size === currentRoom.players.length) {
      console.log("[v0] All players ready, starting battle phase")

      const battleReadyPlayers = updatedPlayers.map((p) => ({
        ...p,
        availableShots: p.cannons.length, // Set to cannon count
        bonusShots: 0, // Start with no bonus
        isAlive: true, // All players start alive
      }))

      const battleState: GameState = {
        ...newGameState,
        players: battleReadyPlayers,
        phase: "battle", // Explicitly set to battle phase
        currentPlayerIndex: 0, // Start with first player
        winner: null, // No winner at start
      }

      await updateGameState(currentRoom.id, battleState)
      setGameState(battleState)
      setGamePhase("battle")
    }
  }

  if (gamePhase === "lobby") {
    return <Lobby onGameStart={handleGameStart} />
  }

  if (gamePhase === "setup" && currentRoom && gameState) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Anchor className="w-8 h-8" />
              Battleship - ห้อง {currentRoom.id}
            </h1>
          </div>

          <OnlineSetupPhase
            room={currentRoom}
            currentUserId={userId}
            onPlayerSetupComplete={handlePlayerSetupComplete}
            playersReady={playersReady}
          />
        </div>
      </div>
    )
  }

  if (gamePhase === "battle" && currentRoom && gameState) {
    return (
      <div className="min-h-screen bg-background">
        <div className="text-center py-4 border-b">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-3">
            <Anchor className="w-6 h-6" />
            Battleship - ห้อง {currentRoom.id}
          </h1>
        </div>

        <OnlineBattlePhase room={currentRoom} currentUserId={userId} gameState={gameState} />
      </div>
    )
  }

  return null
}
