import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

function globalSyncPlugin() {
  let sseClients = []
  const dataFile = path.resolve(process.cwd(), 'server-db.json')

  const loadDb = () => {
    try {
      if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
      }
    } catch {}
    return {}
  }

  const saveDb = (data) => {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch {}
  }

  let db = loadDb()

  const broadcast = (payload) => {
    const msg = `data: ${JSON.stringify({ payload, timestamp: Date.now() })}\n\n`
    sseClients.forEach(res => {
      try { res.write(msg) } catch {}
    })
  }

  return {
    name: 'avsr-global-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          return res.end()
        }

        // Realtime SSE Event Stream
        if (req.url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          })
          res.write('retry: 1500\n\n')
          sseClients.push(res)
          req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res)
          })
          return
        }

        // Get initial server DB state
        if (req.url === '/api/state' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify(db))
        }

        // Sync updates from any client across LAN
        if (req.url === '/api/sync' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body)
              if (parsed && typeof parsed === 'object') {
                db = { ...db, ...parsed }
                saveDb(db)
                broadcast(parsed)
              }
              res.writeHead(200, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), globalSyncPlugin()],
  server: {
    host: true, // Listens on 0.0.0.0 (Localhost & Local Network IP for all devices)
    port: 5173,
    strictPort: false
  }
})


