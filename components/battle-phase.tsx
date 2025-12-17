"use client"

import { useState } from "react"
import type { GameState } from "@/lib/game-types"
import { GameBoard } from "./game-board"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { processAttack } from "@/lib/game-utils"
import { Crosshair, Flame, Target } from "lucide-react"

interface BattlePhaseProps {
  gameState: GameState
  onGameStateUpdate: (newState: GameState) => void
}

export function BattlePhase({ gameState, onGameStateUpdate }: BattlePhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<{ playerId: number; position: string } | null>(null)
  const [attackedThisTurn, setAttackedThisTurn] = useState<string[]>([])
  const [turnResults, setTurnResults] = useState<Array<{ target: string; result: string; type: string }>>([])
  const [pendingBonusShots, setPendingBonusShots] = useState(0)

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const availableTargets = gameState.players.filter((p) => p.id !== currentPlayer.id && p.isAlive)

  const totalShots = currentPlayer.availableShots + currentPlayer.bonusShots
  const remainingShots = totalShots - attackedThisTurn.length

  const handleTargetSelection = (playerId: number, position: string) => {
    setSelectedTarget({ playerId, position })
  }

  const handleAttack = () => {
    if (!selectedTarget || remainingShots <= 0) return

    const targetPlayer = gameState.players.find((p) => p.id === selectedTarget.playerId)
    if (!targetPlayer) return

    const attackKey = `${selectedTarget.playerId}-${selectedTarget.position}`
    if (attackedThisTurn.includes(attackKey)) {
      alert("คุณยิงตำแหน่งนี้ในตานี้แล้ว")
      return
    }

    const result = processAttack(targetPlayer, selectedTarget.position)

    const newAttacked = [...attackedThisTurn, attackKey]
    setAttackedThisTurn(newAttacked)

    setTurnResults([
      ...turnResults,
      {
        target: `${targetPlayer.name} ${selectedTarget.position}`,
        result: result.message,
        type: result.type,
      },
    ])

    if (result.type === "ลงดิน" && result.bonusShots > 0) {
      setPendingBonusShots(pendingBonusShots + result.bonusShots)
    }

    if (targetPlayer.ships.length > 0) {
      const allShipsSunk = targetPlayer.ships.every((s) => s.sunk)
      if (allShipsSunk) {
        targetPlayer.isAlive = false
      }
    }

    const alivePlayers = gameState.players.filter((p) => p.isAlive)
    if (alivePlayers.length === 1) {
      gameState.winner = alivePlayers[0].id
    }

    setSelectedTarget(null)
    onGameStateUpdate({ ...gameState })
  }

  const handleEndTurn = () => {
    currentPlayer.bonusShots = pendingBonusShots

    currentPlayer.availableShots = currentPlayer.cannons.length

    // Move to next alive player
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
    while (!gameState.players[nextIndex].isAlive && gameState.winner === null) {
      nextIndex = (nextIndex + 1) % gameState.players.length
    }

    gameState.currentPlayerIndex = nextIndex
    setAttackedThisTurn([])
    setTurnResults([])
    setSelectedTarget(null)
    setPendingBonusShots(0)
    onGameStateUpdate({ ...gameState })
  }

  if (gameState.winner !== null) {
    const winner = gameState.players.find((p) => p.id === gameState.winner)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">เกมจบแล้ว!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-4xl font-bold text-primary">{winner?.name}</div>
            <div className="text-lg">ชนะเกม!</div>
            <Button onClick={() => window.location.reload()} className="w-full">
              เล่นใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current player info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ตาของ {currentPlayer.name}</span>
            <Badge variant="default" className="text-base px-4 py-1">
              <Crosshair className="w-4 h-4 mr-2" />
              {remainingShots} นัด
            </Badge>
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span className="text-sm">
                  ป้อมปืน: {currentPlayer.cannons.length} ({currentPlayer.availableShots} นัด)
                </span>
              </div>
              {currentPlayer.bonusShots > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-sm text-accent">โบนัสจากตาที่แล้ว: {currentPlayer.bonusShots} นัด</span>
                </div>
              )}
              {pendingBonusShots > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">โบนัสตาหน้า: +{pendingBonusShots} นัด</span>
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Turn results */}
      {turnResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ผลการโจมตีในตานี้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {turnResults.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                  <span>{result.target}</span>
                  <Badge
                    variant={
                      result.type === "ล่ม"
                        ? "destructive"
                        : result.type === "โดน"
                          ? "default"
                          : result.type === "ลงดิน"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {result.result}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {availableTargets.map((target) => (
          <Card key={target.id} className={selectedTarget?.playerId === target.id ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{target.name}</span>
                <div className="flex gap-1">
                  {target.ships.map((ship) => (
                    <div
                      key={ship.id}
                      className={`w-2 h-2 rounded-full ${ship.sunk ? "bg-destructive" : "bg-secondary"}`}
                    />
                  ))}
                </div>
              </CardTitle>
              <CardDescription className="text-xs">
                เรือที่เหลือ: {target.ships.filter((s) => !s.sunk).length}/{target.ships.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <GameBoard
                  board={target.board}
                  onCellClick={(pos) => handleTargetSelection(target.id, pos)}
                  selectedCells={selectedTarget?.playerId === target.id ? [selectedTarget.position] : []}
                  isInteractive={remainingShots > 0}
                  hideShips={true}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {selectedTarget && remainingShots > 0 && (
          <Button onClick={handleAttack} size="lg" className="min-w-32">
            ยิง
          </Button>
        )}
        {(remainingShots === 0 || attackedThisTurn.length > 0) && (
          <Button onClick={handleEndTurn} size="lg" variant="secondary" className="min-w-32">
            จบตา
          </Button>
        )}
      </div>
    </div>
  )
}
