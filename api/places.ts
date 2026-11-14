import { handlePlacesRequest } from '../server/placesHandler'

/**
 * Handler serverless untuk POST /api/places.
 *
 * Kunci GEOAPIFY_API_KEY hanya dibaca di sisi server dan tidak pernah
 * dikirim ke browser. Berlaku untuk penyedia hosting yang memakai
 * konvensi direktori `api/` (misalnya Vercel); `server.js` menangani
 * rute yang sama untuk pemakaian lokal.
 */
export default async function handler(req: any, res: any) {
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

  // Ambil isi permintaan dari Node.js atau Web Request API.
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

  // Batas laju per IP memakai alamat asli pengunjung di balik proxy.
  const forwarded = String(req.headers?.['x-forwarded-for'] || '')
  const ip =
    forwarded.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'

  const result = await handlePlacesRequest(body || {}, {
    apiKey: process.env.GEOAPIFY_API_KEY,
    ip,
  })

  if (res?.setHeader) {
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    for (const [k, v] of Object.entries(result.headers ?? {})) res.setHeader(k, v)
    res.end(JSON.stringify(result.body))
    return
  }

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
  })
}
