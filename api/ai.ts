import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAiRequest } from '../server/aiHandler'

export default async function handler(req: any, res: any) {
  // Support both standard Node.js and Web Request/Response APIs
  if (req.method !== 'POST') {
    if (res?.setHeader) {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method Not Allowed' }))
      return
    }
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse body
  let body: any = req.body
  if (!body && typeof req.on === 'function') {
    body = await new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk: any) => {
        data += chunk
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'))
        } catch {
          resolve({})
        }
      })
    })
  } else if (typeof req.json === 'function') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  const result = await handleAiRequest(body || {})

  if (res?.setHeader) {
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.body))
    return
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

