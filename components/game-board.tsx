"use client"

import { type Cell, ROWS, COLS } from "@/lib/game-types"
import { cn } from "@/lib/utils"
import { Anchor, Flame, Mountain } from "lucide-react"

interface GameBoardProps {
  board: Map<string, Cell>
  onCellClick?: (position: string) => void
  selectedCells?: string[]
  isInteractive?: boolean
  hideShips?: boolean
}

export function GameBoard({
  board,
  onCellClick,
  selectedCells = [],
  isInteractive = false,
  hideShips = false,
}: GameBoardProps) {
  const getCellContent = (cell: Cell, position: string) => {
    const isSelected = selectedCells.includes(position)

    // Show hit status if cell has been attacked
    if (cell.hit === "hit") {
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            cell.type !== "water" ? "bg-destructive/15" : undefined,
          )}
        >
          {cell.type === "water" ? (
            <div className="w-2 h-2 rounded-full bg-muted" />
          ) : (
            <Flame className="w-5 h-5 text-destructive drop-shadow" />
          )}
        </div>
      )
    }

    // Show cell type
    if (cell.type === "land") {
      return (
        <div className="w-full h-full bg-green-600/80 flex items-center justify-center">
          <Mountain className="w-4 h-4 text-green-900" />
        </div>
      )
    }

    if (cell.type === "cannon") {
      return (
        <div className="w-full h-full bg-accent/90 flex items-center justify-center">
          <Flame className="w-5 h-5 text-accent-foreground" />
        </div>
      )
    }

    if (cell.type === "ship" && !hideShips) {
      return (
        <div className="w-full h-full bg-secondary/80 flex items-center justify-center">
          <Anchor className="w-4 h-4 text-secondary-foreground" />
        </div>
      )
    }

    // Water or hidden ship
    return <div className={cn("w-full h-full bg-primary/20", isSelected && "ring-2 ring-accent ring-inset")} />
  }

  return (
    <div className="inline-block border-2 border-border rounded-lg overflow-hidden bg-card">
      {/* Column headers */}
      <div className="grid grid-cols-9 gap-0">
        <div className="w-10 h-10 flex items-center justify-center bg-muted text-xs font-semibold" />
        {COLS.map((col) => (
          <div key={col} className="w-10 h-10 flex items-center justify-center bg-muted text-xs font-semibold">
            {col}
          </div>
        ))}
      </div>

      {/* Board rows */}
      {ROWS.map((row) => (
        <div key={row} className="grid grid-cols-9 gap-0">
          <div className="w-10 h-10 flex items-center justify-center bg-muted text-xs font-semibold">{row}</div>
          {COLS.map((col) => {
            const position = `${row}${col}`
            const cell = board.get(position)
            if (!cell) return null

            return (
              <button
                key={position}
                onClick={() => isInteractive && onCellClick?.(position)}
                disabled={!isInteractive}
                className={cn(
                  "w-10 h-10 border border-border/30 transition-all relative",
                  isInteractive && "hover:bg-primary/10 cursor-pointer",
                  !isInteractive && "cursor-default",
                )}
              >
                {getCellContent(cell, position)}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
