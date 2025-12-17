"use client"

import { useEffect, useMemo, useState } from "react"
import type { Cell, GameState } from "@/lib/game-types"
import { GameBoard } from "./game-board"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { processAttack } from "@/lib/game-utils"
import { Crosshair, Flame, History, Target } from "lucide-react"

interface BattlePhaseProps {
  gameState: GameState
  onGameStateUpdate: (newState: GameState) => void
  isMyTurn?: boolean
  viewerPlayerId?: number
}

export function BattlePhase({ gameState, onGameStateUpdate, isMyTurn = true, viewerPlayerId }: BattlePhaseProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [attackedThisTurn, setAttackedThisTurn] = useState<string[]>([])
  const [turnResults, setTurnResults] = useState<Array<{ target: string; result: string; type: string }>>([])
  const [pendingBonusShots, setPendingBonusShots] = useState(0)

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const viewerPlayer = useMemo(() => {
    if (viewerPlayerId !== undefined) {
      return gameState.players.find((p) => p.id === viewerPlayerId) ?? currentPlayer
    }
    return currentPlayer
  }, [currentPlayer, gameState.players, viewerPlayerId])
  const availableTargets = gameState.players.filter((p) => p.id !== currentPlayer.id && p.isAlive)

  const totalShots = Math.max(0, currentPlayer.availableShots + currentPlayer.bonusShots)
  const remainingShots = Math.max(0, totalShots - attackedThisTurn.length)

  useEffect(() => {
    if (availableTargets.length === 0) {
      setSelectedTargetId(null)
      return
    }

    if (!selectedTargetId || !availableTargets.some((t) => t.id === selectedTargetId)) {
      setSelectedTargetId(availableTargets[0].id)
    }
  }, [availableTargets, selectedTargetId])

  useEffect(() => {
    setAttackedThisTurn([])
    setTurnResults([])
    setSelectedPosition(null)
    setPendingBonusShots(0)
  }, [gameState.currentPlayerIndex])

  const targetingBoard = useMemo(() => {
    const board = new Map<string, Cell>()

    for (const row of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      for (const col of [1, 2, 3, 4, 5, 6, 7, 8]) {
        board.set(`${row}${col}`, { type: "water", hit: "none" })
      }
    }

    const myShots = (gameState.attackHistory ?? []).filter((entry) => entry.attackerId === currentPlayer.id)
    for (const shot of myShots) {
      const cell = board.get(shot.position)
      if (!cell) continue

      cell.hit = "hit"
      if (shot.type === "โดน" || shot.type === "ล่ม") {
        cell.type = "ship"
      } else if (shot.type === "ลงดิน") {
        cell.type = "land"
      }
    }

    return board
  }, [currentPlayer.id, gameState.attackHistory])

  const handlePositionSelect = (position: string) => {
    if (!isMyTurn || remainingShots <= 0) return
    setSelectedPosition(position)
  }

  const handleAttack = () => {
    if (!isMyTurn || !selectedPosition || selectedTargetId === null || remainingShots <= 0) return

    const targetPlayer = gameState.players.find((p) => p.id === selectedTargetId)
    if (!targetPlayer) return

    const attackKey = `${selectedTargetId}-${selectedPosition}`
    if (attackedThisTurn.includes(attackKey)) {
      alert("คุณยิงตำแหน่งนี้ในตานี้แล้ว")
      return
    }

    const result = processAttack(targetPlayer, selectedPosition)

    const newAttacked = [...attackedThisTurn, attackKey]
    setAttackedThisTurn(newAttacked)

    setTurnResults([
      ...turnResults,
      {
        target: `${targetPlayer.name} ${selectedPosition}`,
        result: result.message,
        type: result.type,
      },
    ])

    if (result.type === "ลงดิน" && result.bonusShots > 0) {
      setPendingBonusShots(pendingBonusShots + result.bonusShots)
    }

    const updatedHistory = [
      ...(gameState.attackHistory ?? []),
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        attackerId: currentPlayer.id,
        targetId: targetPlayer.id,
        position: selectedPosition,
        result: result.message,
        type: result.type,
      },
    ]
    gameState.attackHistory = updatedHistory

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

    setSelectedPosition(null)
    onGameStateUpdate({ ...gameState })
  }

  const handleEndTurn = () => {
    if (!isMyTurn) return

    currentPlayer.bonusShots = pendingBonusShots

    currentPlayer.availableShots = currentPlayer.cannons.length

    // Move to next alive player
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
    while (!gameState.players[nextIndex].isAlive && gameState.winner === null) {
      nextIndex = (nextIndex + 1) % gameState.players.length
    }

    gameState.currentPlayerIndex = nextIndex
    gameState.currentTurnUserId = gameState.players[nextIndex]?.userId ?? null
    setAttackedThisTurn([])
    setTurnResults([])
    setSelectedPosition(null)
    setPendingBonusShots(0)
    onGameStateUpdate({ ...gameState })
  }

  if (typeof gameState.winner === "number") {
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

  const historyEntries = (gameState.attackHistory ?? []).slice(-12).reverse()

  return (
    <div className="space-y-6">
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
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>
                  กระสุนจากป้อม: {currentPlayer.cannons.length} | รอบนี้: {currentPlayer.availableShots}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-accent">โบนัสพกมา: {currentPlayer.bonusShots}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-green-500">โบนัสรอบหน้า: +{pendingBonusShots}</span>
              </div>
              {!isMyTurn && <span className="text-muted-foreground">รอตัวเองก่อนถึงจะยิงได้</span>}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>กระดานของคุณ</CardTitle>
            <CardDescription>ตรวจสอบความเสียหายและจำนวนป้อมที่ยังเหลือ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <GameBoard board={viewerPlayer.board} hideShips={false} isInteractive={false} />
              <div className="flex gap-3 text-sm text-muted-foreground">
                <span>ป้อมปืน: {viewerPlayer.cannons.length}</span>
                <span>เรือที่เหลือ: {viewerPlayer.ships.filter((s) => !s.sunk).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เลือกจุดยิง</CardTitle>
            <CardDescription>คลิกกระดานโล่งเพื่อกำหนดพิกัด แล้วเลือกผู้เล่นที่จะโจมตี</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative flex justify-center">
              {!isMyTurn && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                  <span className="text-sm text-muted-foreground">ยังไม่ใช่ตาของคุณ</span>
                </div>
              )}
              <GameBoard
                board={targetingBoard}
                onCellClick={handlePositionSelect}
                selectedCells={selectedPosition ? [selectedPosition] : []}
                isInteractive={isMyTurn && remainingShots > 0}
                hideShips={true}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">ผู้เล่นที่จะยิง</div>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedTargetId ?? ""}
                  onChange={(e) => setSelectedTargetId(Number(e.target.value))}
                  disabled={!isMyTurn || remainingShots === 0 || availableTargets.length === 0}
                >
                  {availableTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} (เรือ {target.ships.filter((s) => !s.sunk).length}/{target.ships.length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">ตำแหน่งที่จะยิง</div>
                <div className="rounded-md border border-dashed px-3 py-2 text-sm">
                  {selectedPosition ?? "ยังไม่ได้เลือก"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={handleAttack}
                size="lg"
                disabled={
                  !isMyTurn ||
                  remainingShots <= 0 ||
                  !selectedPosition ||
                  selectedTargetId === null ||
                  availableTargets.length === 0
                }
              >
                ยิง
              </Button>
              <Button
                onClick={handleEndTurn}
                size="lg"
                variant="secondary"
                disabled={!isMyTurn || (attackedThisTurn.length === 0 && remainingShots === totalShots)}
              >
                จบตา
              </Button>
            </div>

            {turnResults.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="text-sm font-semibold">ผลการยิงในตานี้</div>
                {turnResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
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
            )}
          </CardContent>
        </Card>
      </div>

      {historyEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" />
              ประวัติการยิงล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {historyEntries.map((entry) => {
                const attacker = gameState.players.find((p) => p.id === entry.attackerId)
                const target = gameState.players.find((p) => p.id === entry.targetId)

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {attacker?.name ?? "ไม่ทราบ"} → {target?.name ?? "ไม่ทราบ"}
                      </span>
                      <span className="text-muted-foreground">ตำแหน่ง: {entry.position}</span>
                    </div>
                    <Badge
                      variant={
                        entry.type === "ล่ม"
                          ? "destructive"
                          : entry.type === "โดน"
                            ? "default"
                            : entry.type === "ลงดิน"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {entry.result}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
