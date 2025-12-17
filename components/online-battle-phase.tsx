"use client"

import { useEffect, useState } from "react"
import type { GameState } from "@/lib/game-types"
import type { Room } from "@/lib/multiplayer-types"
import { BattlePhase } from "./battle-phase"
import { updateGameState, subscribeToRoom, deserializeGameState } from "@/lib/multiplayer-service"
import { Card, CardContent } from "./ui/card"

interface OnlineBattlePhaseProps {
  room: Room
  currentUserId: string
  gameState: GameState
}

export function OnlineBattlePhase({ room, currentUserId, gameState: initialGameState }: OnlineBattlePhaseProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const playerIndex = room.players.findIndex((p) => p.id === currentUserId)

  useEffect(() => {
    const unsubscribe = subscribeToRoom(room.id, (updatedRoom) => {
      if (updatedRoom?.gameState) {
        const deserializedState = deserializeGameState(updatedRoom.gameState)
        setGameState(deserializedState)
      }
    })

    return unsubscribe
  }, [room.id])

  const isMyTurn = gameState.currentPlayerIndex === playerIndex

  const handleGameStateUpdate = async (newState: GameState) => {
    await updateGameState(room.id, newState)
    setGameState(newState)
  }

  return (
    <div className="container mx-auto p-4">
      {!isMyTurn && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="font-medium text-center">รอตาผู้เล่นคนอื่น...</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              ตาของ: {gameState.players[gameState.currentPlayerIndex]?.name}
            </p>
          </CardContent>
        </Card>
      )}

      <BattlePhase gameState={gameState} onGameStateUpdate={handleGameStateUpdate} />
    </div>
  )
}
