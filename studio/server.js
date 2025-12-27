const { createServer } = require("http")
const { parse } = require("url")
const path = require("path")
const next = require("next")
const { Server } = require("socket.io")

const dev = process.env.NODE_ENV !== "production"
const hostname = "0.0.0.0"
const port = parseInt(process.env.PORT || "3000", 10)

// Use the directory where server.js is located
const dir = path.join(__dirname)

console.log(`Starting server in ${dev ? "development" : "production"} mode`)
console.log(`Working directory: ${dir}`)

const app = next({ dev, hostname, port, dir })
const handle = app.getRequestHandler()

// Store active sessions: sessionId -> { studio: socket, targets: [socket] }
const sessions = new Map()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Create Socket.io server with CORS for cross-origin connections
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow connections from any origin (target apps)
      methods: ["GET", "POST"],
    },
    path: "/lumos-socket",
  })

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id)

    // Handle session join
    socket.on("join-session", ({ sessionId, role }) => {
      console.log(`Client ${socket.id} joining session ${sessionId} as ${role}`)

      socket.join(sessionId)
      socket.data.sessionId = sessionId
      socket.data.role = role

      // Track sessions
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { studio: null, targets: [] })
      }

      const session = sessions.get(sessionId)
      if (role === "studio") {
        session.studio = socket
        // Notify targets that studio is ready
        socket.to(sessionId).emit("studio-connected")
      } else {
        session.targets.push(socket)
        // Notify studio that a target connected
        if (session.studio) {
          session.studio.emit("target-connected", { socketId: socket.id })
        }
      }

      // Confirm join
      socket.emit("session-joined", { sessionId, role })
    })

    // Relay element selection from target to studio
    socket.on("element-selected", (data) => {
      const sessionId = socket.data.sessionId
      if (sessionId) {
        socket.to(sessionId).emit("element-selected", data)
      }
    })

    // Relay style changes from studio to target
    socket.on("apply-style", (data) => {
      const sessionId = socket.data.sessionId
      if (sessionId) {
        socket.to(sessionId).emit("apply-style", data)
      }
    })

    // Relay style confirmation from target to studio
    socket.on("style-applied", (data) => {
      const sessionId = socket.data.sessionId
      if (sessionId) {
        socket.to(sessionId).emit("style-applied", data)
      }
    })

    // Relay undo/redo from studio to target
    socket.on("undo", (data) => {
      const sessionId = socket.data.sessionId
      if (sessionId) {
        socket.to(sessionId).emit("undo", data)
      }
    })

    socket.on("redo", (data) => {
      const sessionId = socket.data.sessionId
      if (sessionId) {
        socket.to(sessionId).emit("redo", data)
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id)

      const sessionId = socket.data.sessionId
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)

        if (socket.data.role === "studio") {
          session.studio = null
          // Notify targets that studio disconnected
          socket.to(sessionId).emit("studio-disconnected")
        } else {
          session.targets = session.targets.filter((s) => s.id !== socket.id)
          // Notify studio that target disconnected
          if (session.studio) {
            session.studio.emit("target-disconnected", { socketId: socket.id })
          }
        }

        // Clean up empty sessions
        if (!session.studio && session.targets.length === 0) {
          sessions.delete(sessionId)
        }
      }
    })
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running on path /lumos-socket`)
  })
})
