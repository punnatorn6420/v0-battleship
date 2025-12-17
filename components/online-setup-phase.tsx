"use client"

import { useState, useEffect } from "react"
import type { Player } from "@/lib/game-types"
import { SetupPhase } from "./setup-phase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { CheckCircle2, Clock } from "lucide-react"
import type { Room } from "@/lib/multiplayer-types"

interface OnlineSetupPhaseProps {
  room: Room
  currentUserId: string
  onPlayerSetupComplete: (player: Player) => void
  playersReady: Set<string>
}

export function OnlineSetupPhase({ room, currentUserId, onPlayerSetupComplete, playersReady }: OnlineSetupPhaseProps) {
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null)

  useEffect(() => {
    // Initialize local player based on room data
    const playerIndex = room.players.findIndex((p) => p.id === currentUserId)
    if (playerIndex !== -1 && !localPlayer) {
      const player: Player = {
        id: playerIndex + 1,
        name: room.players[playerIndex].name,
        board: new Map(),
        ships: [],
        cannons: [],
        landCells: [],
        availableShots: 0,
        bonusShots: 0,
        isAlive: true,
      }

      // Initialize empty board
      const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"]
      const COLS = [1, 2, 3, 4, 5, 6, 7, 8]
      for (const row of ROWS) {
        for (const col of COLS) {
          player.board.set(`${row}${col}`, { type: "water", hit: "none" })
        }
      }

      setLocalPlayer(player)
    }
  }, [room, currentUserId, localPlayer])

  const isCurrentPlayerReady = playersReady.has(currentUserId)

  const handleSetupComplete = (player: Player) => {
    player.availableShots = player.cannons.length
    onPlayerSetupComplete(player)
  }

  if (!localPlayer) {
    return <div>Loading...</div>
  }

  if (isCurrentPlayerReady) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              พร้อมแล้ว!
            </CardTitle>
            <CardDescription>รอผู้เล่นคนอื่นตั้งค่ากระดาน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {room.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span>{player.name}</span>
                  <Badge variant={playersReady.has(player.id) ? "default" : "secondary"}>
                    {playersReady.has(player.id) ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">ตั้งค่ากระดานของคุณ</h2>
        <p className="text-muted-foreground">วางเรือ ดิน และป้อมปืนของคุณ</p>
      </div>

      <SetupPhase player={localPlayer} onSetupComplete={handleSetupComplete} />
    </div>
  )
}
