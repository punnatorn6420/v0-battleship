"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Users, Copy, Check, UserPlus, Crown, LogOut, AlertCircle } from "lucide-react"
import type { Room } from "@/lib/multiplayer-types"
import {
  createRoom,
  joinRoom,
  subscribeToRoom,
  updatePlayerReady,
  startGame,
  leaveRoom,
  generateUserId,
} from "@/lib/multiplayer-service"

interface LobbyProps {
  onGameStart: (room: Room) => void
}

export function Lobby({ onGameStart }: LobbyProps) {
  const [view, setView] = useState<"menu" | "create" | "join" | "waiting" | "setup-error">("menu")
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [copied, setCopied] = useState(false)
  const [userId] = useState(() => generateUserId())
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get("room")
    if (roomParam) {
      setRoomId(roomParam.toUpperCase())
      setView("join")
    }
  }, [])

  useEffect(() => {
    if (!currentRoom) return

    const unsubscribe = subscribeToRoom(currentRoom.id, (room) => {
      if (!room) {
        setView("menu")
        setCurrentRoom(null)
        return
      }

      setCurrentRoom(room)

      if (room.status === "playing") {
        onGameStart(room)
      }
    })

    return unsubscribe
  }, [currentRoom, onGameStart])

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return

    setIsLoading(true)
    setErrorMessage("")
    try {
      console.log("[v0] Starting room creation...")
      const newRoomId = await createRoom(playerName, maxPlayers)
      console.log("[v0] Room created with ID:", newRoomId)

      setRoomId(newRoomId)
      const unsubscribe = subscribeToRoom(newRoomId, (room) => {
        console.log("[v0] Room update:", room)
        if (room) {
          setCurrentRoom(room)
          setView("waiting")
        }
      })
    } catch (error) {
      console.error("[v0] Failed to create room:", error)
      if ((error as Error).message.includes("PERMISSION_DENIED")) {
        setView("setup-error")
      } else {
        setErrorMessage("ไม่สามารถสร้างห้องได้: " + (error as Error).message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomId.trim()) return

    setIsLoading(true)
    setErrorMessage("")

    try {
      console.log("[v0] Attempting to join room:", roomId.toUpperCase())
      const success = await joinRoom(roomId.toUpperCase(), playerName)
      console.log("[v0] Join room result:", success)

      if (success) {
        const unsubscribe = subscribeToRoom(roomId.toUpperCase(), (room) => {
          console.log("[v0] Joined room update:", room)
          if (room) {
            setCurrentRoom(room)
            setView("waiting")
          } else {
            setErrorMessage("ไม่พบห้องนี้ กรุณาตรวจสอบรหัสห้อง")
            setView("join")
          }
        })
      } else {
        setErrorMessage("ไม่สามารถเข้าร่วมห้องได้ กรุณาตรวจสอบรหัสห้อง")
      }
    } catch (error) {
      console.error("[v0] Failed to join room:", error)
      setErrorMessage("เกิดข้อผิดพลาด: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleReady = async () => {
    if (!currentRoom) return

    const player = currentRoom.players.find((p) => p.id === userId)
    if (!player) return

    await updatePlayerReady(currentRoom.id, userId, !player.isReady)
  }

  const handleStartGame = async () => {
    if (!currentRoom) return

    const allReady = currentRoom.players.every((p) => p.isReady)
    if (!allReady) {
      alert("ผู้เล่นทุกคนต้องกดพร้อมก่อนเริ่มเกม")
      return
    }

    if (currentRoom.players.length < 2) {
      alert("ต้องมีผู้เล่นอย่างน้อย 2 คน")
      return
    }

    await startGame(currentRoom.id)
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom) return

    await leaveRoom(currentRoom.id, userId)
    setView("menu")
    setCurrentRoom(null)
    window.history.replaceState({}, "", window.location.pathname)
  }

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${currentRoom?.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (view === "setup-error") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl border-destructive">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive mt-1" />
              <div>
                <CardTitle className="text-destructive">ต้องตั้งค่า Firebase ก่อนใช้งาน</CardTitle>
                <CardDescription>Firebase Realtime Database ยังไม่ได้ตั้งค่า Security Rules</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">วิธีแก้ไข:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  ไปที่ Firebase Console:{" "}
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    className="text-primary underline"
                    rel="noreferrer"
                  >
                    console.firebase.google.com
                  </a>
                </li>
                <li>
                  เลือกโปรเจ็กต์: <strong>battleship-3e8fb</strong>
                </li>
                <li>
                  ไปที่เมนู <strong>Build → Realtime Database</strong>
                </li>
                <li>
                  คลิกแท็บ <strong>Rules</strong>
                </li>
                <li>
                  วาง code ด้านล่างนี้แล้วกด <strong>Publish</strong>:
                </li>
              </ol>
            </div>

            <div className="bg-slate-950 text-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}`}</pre>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">หมายเหตุ:</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Rules นี้เหมาะสำหรับทดสอบเท่านั้น สำหรับ production ควรเพิ่มการ authenticate
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setView("menu")} variant="outline" className="flex-1">
                กลับ
              </Button>
              <Button onClick={handleCreateRoom} className="flex-1" disabled={isLoading}>
                {isLoading ? "กำลังลองอีกครั้ง..." : "ลองอีกครั้ง"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "menu") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Battleship Online</CardTitle>
            <CardDescription className="text-center">เล่นกับเพื่อน 2-4 คน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setView("create")} className="w-full" size="lg">
              <Users className="w-5 h-5 mr-2" />
              สร้างห้อง
            </Button>
            <Button onClick={() => setView("join")} variant="outline" className="w-full" size="lg">
              <UserPlus className="w-5 h-5 mr-2" />
              เข้าร่วมห้อง
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "create") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>สร้างห้อง</CardTitle>
            <CardDescription>กรอกข้อมูลเพื่อสร้างห้องเกม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อของคุณ</label>
              <Input
                placeholder="ชื่อผู้เล่น"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">จำนวนผู้เล่น</label>
              <div className="flex gap-2">
                {[2, 3, 4].map((num) => (
                  <Button
                    key={num}
                    variant={maxPlayers === num ? "default" : "outline"}
                    onClick={() => setMaxPlayers(num)}
                    className="flex-1"
                  >
                    {num} คน
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setView("menu")} variant="outline" className="flex-1">
                ยกเลิก
              </Button>
              <Button onClick={handleCreateRoom} className="flex-1" disabled={!playerName.trim() || isLoading}>
                {isLoading ? "กำลังสร้าง..." : "สร้าง"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "join") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>เข้าร่วมห้อง</CardTitle>
            <CardDescription>กรอกรหัสห้องที่ได้รับจากเพื่อน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อของคุณ</label>
              <Input
                placeholder="ชื่อผู้เล่น"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">รหัสห้อง</label>
              <Input
                placeholder="กรอกรหัสห้อง 6 ตัว"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={6}
                className="uppercase"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setView("menu")
                  setErrorMessage("")
                  window.history.replaceState({}, "", window.location.pathname)
                }}
                variant="outline"
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleJoinRoom}
                className="flex-1"
                disabled={!playerName.trim() || !roomId.trim() || isLoading}
              >
                {isLoading ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "waiting" && currentRoom) {
    const isHost = currentRoom.hostId === userId
    const currentPlayer = currentRoom.players.find((p) => p.id === userId)
    const allReady = currentRoom.players.every((p) => p.isReady)

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ห้อง: {currentRoom.id}</CardTitle>
                <CardDescription>
                  ผู้เล่น {currentRoom.players.length}/{currentRoom.maxPlayers}
                </CardDescription>
              </div>
              <Button onClick={copyRoomLink} variant="outline" size="sm">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก Link"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {currentRoom.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    {player.isHost && <Crown className="w-5 h-5 text-yellow-500" />}
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <Badge variant={player.isReady ? "default" : "secondary"}>{player.isReady ? "พร้อม" : "รอ"}</Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleLeaveRoom} variant="outline" className="flex-1 bg-transparent">
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากห้อง
              </Button>

              <Button onClick={handleToggleReady} className="flex-1">
                {currentPlayer?.isReady ? "ยกเลิกพร้อม" : "พร้อม"}
              </Button>

              {isHost && allReady && currentRoom.players.length >= 2 && (
                <Button onClick={handleStartGame} className="flex-1">
                  เริ่มเกม
                </Button>
              )}
            </div>

            {!allReady && <p className="text-sm text-center text-muted-foreground">รอผู้เล่นทุกคนกดพร้อม</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
