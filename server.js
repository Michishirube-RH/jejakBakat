/**
 * Standalone Node.js production server for JejakBakat AI.
 * Serves static build files from dist/ and handles /api/ai endpoints.
 * Run with: node server.js
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env automatically if available in Node 20.6+
try {
  if (typeof process.loadEnvFile === 'function' && fs.existsSync(path.join(__dirname, '.env'))) {
    process.loadEnvFile(path.join(__dirname, '.env'))
  }
} catch {
  // Ignore if .env doesn't exist or already loaded
}

const PORT = parseInt(process.env.PORT || '8443', 10)
const DIST = path.join(__dirname, 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  // 1. API Route: /api/ai
  if (url.pathname === '/api/ai' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}')
        const { handleAiRequest } = await import('./server/aiHandler.ts')
        const response = await handleAiRequest(payload)
        res.writeHead(response.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response.body))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
      }
    })
    return
  }

  // 2. API Route: /api/places
  if (url.pathname === '/api/places' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}')
        const ip =
          String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
          req.socket?.remoteAddress ||
          'unknown'
        const { handlePlacesRequest } = await import('./server/placesHandler.ts')
        const response = await handlePlacesRequest(payload, {
          apiKey: process.env.GEOAPIFY_API_KEY,
          ip,
        })
        res.writeHead(response.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response.body))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
      }
    })
    return
  }

  // 3. Static File Serving from dist/
  let filePath = path.join(DIST, url.pathname)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': contentType })
    fs.createReadStream(filePath).pipe(res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found. Please run `pnpm build` first.')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`JejakBakat production server listening on http://localhost:${PORT}`)
})

