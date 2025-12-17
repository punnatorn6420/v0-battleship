"use client"

import { useState } from "react"
import { type Player, SHIP_SIZES, LAND_COUNT, CANNON_COUNT, MAX_ISLANDS, ROWS, COLS } from "@/lib/game-types"
import { GameBoard } from "./game-board"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { isValidShipPlacement, countIslands } from "@/lib/game-utils"
import { AlertCircle, CheckCircle2, RotateCw, Undo2 } from "lucide-react"

interface SetupPhaseProps {
  player: Player
  onSetupComplete: (player: Player) => void
}

export function SetupPhase({ player, onSetupComplete }: SetupPhaseProps) {
  const [setupStep, setSetupStep] = useState<"ships" | "land" | "cannons">("ships")
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [shipOrientation, setShipOrientation] = useState<"horizontal" | "vertical">("horizontal")

  const getShipsPlacedCount = () => {
    return SHIP_SIZES.map((s) => ({
      size: s.size,
      required: s.count,
      placed: player.ships.filter((ship) => ship.size === s.size).length,
    }))
  }

  const shipsStatus = getShipsPlacedCount()
  const allShipsPlaced = shipsStatus.every((s) => s.placed === s.required)
  const allLandPlaced = player.landCells.length === LAND_COUNT
  const allCannonsPlaced = player.cannons.length === CANNON_COUNT

  const getCurrentShipSize = (): number | null => {
    for (const status of shipsStatus) {
      if (status.placed < status.required) {
        return status.size
      }
    }
    return null
  }

  const currentShipSize = getCurrentShipSize()

  const handleCellClick = (position: string) => {
    setError(null)

    if (setupStep === "ships") {
      if (currentShipSize === null) {
        setError("วางเรือครบแล้ว กรุณากดดำเนินการต่อ")
        return
      }

      const row = position[0]
      const col = Number.parseInt(position.slice(1))
      const rowIndex = ROWS.indexOf(row)

      const positions: string[] = [position]

      if (currentShipSize > 1) {
        for (let i = 1; i < currentShipSize; i++) {
          if (shipOrientation === "horizontal") {
            const newCol = col + i
            if (newCol > COLS[COLS.length - 1]) break
            positions.push(`${row}${newCol}`)
          } else {
            const newRowIndex = rowIndex + i
            if (newRowIndex >= ROWS.length) break
            positions.push(`${ROWS[newRowIndex]}${col}`)
          }
        }
      }

      const allValid = positions.every((pos) => {
        const cell = player.board.get(pos)
        return cell && cell.type === "water"
      })

      if (!allValid) {
        setError("ตำแหน่งไม่ว่าง กรุณาเลือกตำแหน่งอื่น")
        setSelectedCells([])
        return
      }

      if (positions.length !== currentShipSize) {
        setError("ไม่สามารถวางเรือได้ เนื่องจากเกินขอบกระดาน")
        setSelectedCells([])
        return
      }

      if (!isValidShipPlacement(player.board, positions)) {
        setError("ตำแหน่งเรือไม่ถูกต้อง ต้องอยู่ในแนวเดียวกันและติดกัน")
        setSelectedCells([])
        return
      }

      const shipId = `ship-${player.ships.length + 1}`
      const newShip = {
        id: shipId,
        size: currentShipSize,
        positions: [...positions],
        hits: 0,
        sunk: false,
      }

      player.ships.push(newShip)
      for (const pos of positions) {
        const cell = player.board.get(pos)
        if (cell) {
          cell.type = "ship"
          cell.shipId = shipId
        }
      }

      setSelectedCells([])
      setError(null)
      console.log("[v0] Placed ship:", newShip, "Total ships:", player.ships.length)
    } else if (setupStep === "land") {
      const cell = player.board.get(position)
      if (!cell || cell.type !== "water") {
        setError("สามารถวางดินบนน้ำเท่านั้น")
        return
      }

      if (player.landCells.includes(position)) {
        const newLand = player.landCells.filter((p) => p !== position)
        player.landCells = newLand
        player.board.get(position)!.type = "water"
      } else {
        if (player.landCells.length >= LAND_COUNT) {
          setError(`วางดินได้สูงสุด ${LAND_COUNT} ช่อง`)
          return
        }

        const newLand = [...player.landCells, position]
        if (countIslands(newLand) > MAX_ISLANDS) {
          setError(`แยกเป็นเกาะได้สูงสุด ${MAX_ISLANDS} เกาะ`)
          return
        }

        player.landCells = newLand
        player.board.get(position)!.type = "land"
      }
      setSelectedCells([...player.landCells])
    } else if (setupStep === "cannons") {
      const cell = player.board.get(position)
      if (!cell || cell.type !== "land") {
        setError("ต้องวางป้อมปืนบนดินเท่านั้น")
        return
      }

      if (player.cannons.includes(position)) {
        const newCannons = player.cannons.filter((p) => p !== position)
        player.cannons = newCannons
        player.board.get(position)!.type = "land"
      } else {
        if (player.cannons.length >= CANNON_COUNT) {
          setError(`วางป้อมปืนได้สูงสุด ${CANNON_COUNT} ป้อม`)
          return
        }

        player.cannons = [...player.cannons, position]
        player.board.get(position)!.type = "cannon"
      }
      setSelectedCells([...player.cannons])
    }
  }

  const handleUndoLastShip = () => {
    if (player.ships.length === 0) return

    const lastShip = player.ships[player.ships.length - 1]
    for (const pos of lastShip.positions) {
      const cell = player.board.get(pos)
      if (cell) {
        cell.type = "water"
        delete cell.shipId
      }
    }
    player.ships.pop()
    setError(null)
    console.log("[v0] Undid last ship, remaining:", player.ships.length)
  }

  const handleResetCurrent = () => {
    if (setupStep === "ships") {
      // Reset all ships
      for (const ship of player.ships) {
        for (const pos of ship.positions) {
          const cell = player.board.get(pos)
          if (cell) {
            cell.type = "water"
            delete cell.shipId
          }
        }
      }
      player.ships = []
    } else if (setupStep === "land") {
      // Reset all land
      for (const pos of player.landCells) {
        const cell = player.board.get(pos)
        if (cell) cell.type = "water"
      }
      player.landCells = []
      setSelectedCells([])
    } else if (setupStep === "cannons") {
      // Reset all cannons
      for (const pos of player.cannons) {
        const cell = player.board.get(pos)
        if (cell) cell.type = "land"
      }
      player.cannons = []
      setSelectedCells([])
    }
    setError(null)
  }

  const toggleOrientation = () => {
    setShipOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))
    setSelectedCells([])
    setError(null)
  }

  const handleNextStep = () => {
    if (setupStep === "ships" && allShipsPlaced) {
      setSetupStep("land")
      setSelectedCells([])
    } else if (setupStep === "land" && allLandPlaced) {
      setSetupStep("cannons")
      setSelectedCells([...player.cannons])
    } else if (setupStep === "cannons" && allCannonsPlaced) {
      onSetupComplete(player)
    }
  }

  const getInstructions = () => {
    if (setupStep === "ships") {
      return (
        <div>
          <p className="text-sm mb-2">
            {currentShipSize ? `คลิกตำแหน่งเพื่อวางเรือ ${currentShipSize} ช่อง` : "วางเรือครบแล้ว!"}
          </p>
          {currentShipSize && currentShipSize > 1 && (
            <p className="text-xs text-muted-foreground mb-2">
              แนว: {shipOrientation === "horizontal" ? "แนวนอน" : "แนวตั้ง"}
            </p>
          )}
          <div className="text-xs space-y-1">
            {shipsStatus.map((s) => (
              <div key={s.size} className={s.placed === s.required ? "text-green-600" : ""}>
                เรือ {s.size} ช่อง: {s.placed}/{s.required} ลำ
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (setupStep === "land") {
      return (
        <div>
          <p className="text-sm">คลิกเพื่อวางดิน {LAND_COUNT} ช่อง</p>
          <p className="text-xs text-muted-foreground">
            วางแล้ว: {player.landCells.length}/{LAND_COUNT}
          </p>
          <p className="text-xs text-muted-foreground">
            เกาะ: {countIslands(player.landCells)}/{MAX_ISLANDS}
          </p>
        </div>
      )
    }

    return (
      <div>
        <p className="text-sm">คลิกบนดินเพื่อวางป้อมปืน {CANNON_COUNT} ป้อม</p>
        <p className="text-xs text-muted-foreground">
          วางแล้ว: {player.cannons.length}/{CANNON_COUNT}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div>
        <GameBoard
          board={player.board}
          onCellClick={handleCellClick}
          selectedCells={selectedCells}
          isInteractive={true}
        />
      </div>

      <Card className="w-full lg:w-80">
        <CardHeader>
          <CardTitle>{player.name} - ตั้งค่า</CardTitle>
          <CardDescription>
            {setupStep === "ships" && "วางเรือ"}
            {setupStep === "land" && "วางดิน"}
            {setupStep === "cannons" && "วางป้อมปืน"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {getInstructions()}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            {setupStep === "ships" && !allShipsPlaced && currentShipSize && currentShipSize > 1 && (
              <Button onClick={toggleOrientation} className="w-full bg-transparent" variant="outline">
                <RotateCw className="w-4 h-4 mr-2" />
                หมุนเรือ ({shipOrientation === "horizontal" ? "แนวนอน" : "แนวตั้ง"})
              </Button>
            )}

            {setupStep === "ships" && player.ships.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleUndoLastShip} className="flex-1 bg-transparent" variant="outline" size="sm">
                  <Undo2 className="w-4 h-4 mr-2" />
                  ย้อนกลับ
                </Button>
                <Button onClick={handleResetCurrent} className="flex-1 bg-transparent" variant="outline" size="sm">
                  รีเซ็ต
                </Button>
              </div>
            )}

            {setupStep === "land" && player.landCells.length > 0 && (
              <Button onClick={handleResetCurrent} className="w-full bg-transparent" variant="outline" size="sm">
                รีเซ็ตดิน
              </Button>
            )}

            {setupStep === "cannons" && player.cannons.length > 0 && (
              <Button onClick={handleResetCurrent} className="w-full bg-transparent" variant="outline" size="sm">
                รีเซ็ตป้อมปืน
              </Button>
            )}

            {setupStep === "ships" && allShipsPlaced && (
              <Button onClick={handleNextStep} className="w-full" variant="default">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                ดำเนินการต่อ
              </Button>
            )}

            {setupStep === "land" && allLandPlaced && (
              <Button onClick={handleNextStep} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                ดำเนินการต่อ
              </Button>
            )}

            {setupStep === "cannons" && allCannonsPlaced && (
              <Button onClick={handleNextStep} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                เสร็จสิ้น
              </Button>
            )}
          </div>

          <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {allShipsPlaced ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted" />
              )}
              <span>เรือทั้งหมด</span>
            </div>
            <div className="flex items-center gap-2">
              {allLandPlaced ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted" />
              )}
              <span>ดินทั้งหมด</span>
            </div>
            <div className="flex items-center gap-2">
              {allCannonsPlaced ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted" />
              )}
              <span>ป้อมปืนทั้งหมด</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
