import { io, Socket } from "socket.io-client"

export interface SelectedElement {
  selector: string
  tagName: string
  className: string
  id: string
  styles: Record<string, string>
}

export interface StyleChange {
  selector: string
  property: string
  oldValue: string
  newValue: string
}

export interface LumosSocketEvents {
  onTargetConnected?: (socketId: string) => void
  onTargetDisconnected?: (socketId: string) => void
  onElementSelected?: (element: SelectedElement) => void
  onStyleApplied?: (change: StyleChange) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  onReconnecting?: (attempt: number) => void
}

class LumosSocket {
  private socket: Socket | null = null
  private sessionId: string | null = null
  private events: LumosSocketEvents = {}

  connect(sessionId: string, events: LumosSocketEvents = {}) {
    this.sessionId = sessionId
    this.events = events

    // Connect to Socket.io server
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    this.socket = io(baseUrl, {
      path: "/lumos-socket",
      transports: ["websocket", "polling"],
    })

    this.socket.on("connect", () => {
      console.log("[Lumos Studio] Connected to server")
      this.socket?.emit("join-session", { sessionId, role: "studio" })
      this.events.onConnected?.()
    })

    this.socket.on("session-joined", ({ sessionId }) => {
      console.log("[Lumos Studio] Joined session:", sessionId)
    })

    this.socket.on("target-connected", ({ socketId }) => {
      console.log("[Lumos Studio] Target connected:", socketId)
      this.events.onTargetConnected?.(socketId)
    })

    this.socket.on("target-disconnected", ({ socketId }) => {
      console.log("[Lumos Studio] Target disconnected:", socketId)
      this.events.onTargetDisconnected?.(socketId)
    })

    this.socket.on("element-selected", (data: SelectedElement) => {
      console.log("[Lumos Studio] Element selected:", data.selector)
      this.events.onElementSelected?.(data)
    })

    this.socket.on("style-applied", (data: StyleChange) => {
      console.log("[Lumos Studio] Style applied:", data)
      this.events.onStyleApplied?.(data)
    })

    this.socket.on("disconnect", () => {
      console.log("[Lumos Studio] Disconnected from server")
      this.events.onDisconnected?.()
    })

    // Error handling
    this.socket.on("connect_error", (error) => {
      console.error("[Lumos Studio] Connection error:", error.message)
      this.events.onError?.(error)
    })

    // Reconnection handling
    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log("[Lumos Studio] Reconnecting... attempt", attempt)
      this.events.onReconnecting?.(attempt)
    })

    this.socket.io.on("reconnect", () => {
      console.log("[Lumos Studio] Reconnected, rejoining session")
      this.socket?.emit("join-session", { sessionId, role: "studio" })
    })

    return this
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.sessionId = null
  }

  applyStyle(selector: string, property: string, value: string) {
    this.socket?.emit("apply-style", { selector, property, value })
  }

  undo(change: { selector: string; property: string; oldValue: string }) {
    this.socket?.emit("undo", { change })
  }

  redo(change: { selector: string; property: string; newValue: string }) {
    this.socket?.emit("redo", { change })
  }

  isConnected() {
    return this.socket?.connected ?? false
  }

  getSessionId() {
    return this.sessionId
  }
}

// Singleton instance
let instance: LumosSocket | null = null

export function getLumosSocket(): LumosSocket {
  if (!instance) {
    instance = new LumosSocket()
  }
  return instance
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}
