/**
 * Tes berbasis fixture: respons nyata Geoapify untuk Padang radius 2 km.
 *
 * Fixture disimpan di tests/fixtures/places-padang-2km.json tanpa kunci API,
 * tanpa place_id, dan tanpa koordinat. Tes ini menjalankan pipeline olahan
 * (normalizeFeature + dedupe + sort) persis seperti handler asli, lalu
 * memeriksa kualitas hasilnya.
 *
 *   node --experimental-strip-types tests/test-fixture.ts
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { normalizeFeature, isChain, type PlaceResult } from '../server/placesHandler.ts'

let pass = 0
let fail = 0
const failures: string[] = []

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    pass++
    console.log(`  ok   ${name}`)
  } catch (err: any) {
    fail++
    failures.push(name)
    console.log(`  FAIL ${name}`)
    console.log(`       ${err.message?.split('\n')[0]}`)
  }
}

const FIXTURE_PATH = new URL('../tests/fixtures/places-padang-2km.json', import.meta.url)

/** Membaca fixture dan menjalankan pipeline yang sama dengan handler. */
function processFixture(): PlaceResult[] {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))
  const features: any[] = Array.isArray(raw.features) ? raw.features : []

  const seen = new Map<string, PlaceResult>()
  for (const f of features) {
    const item = normalizeFeature(f)
    if (!item) continue
    const street = String(f?.properties?.street || '').toLowerCase().trim()
    const key = `${item.name.toLowerCase()}|${street}`
    const prev = seen.get(key)
    if (!prev) {
      seen.set(key, item)
      continue
    }
    const score = (x: PlaceResult) =>
      (x.address ? 2 : 0) + (x.phone ? 3 : 0) + (x.openingHours ? 2 : 0)
    if (score(item) > score(prev)) seen.set(key, item)
  }

  const results = [...seen.values()]
  results.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  return results
}

const results = processFixture()

console.log(`Fixture: tests/fixtures/places-padang-2km.json`)
console.log(`Fitur mentah -> hasil olahan: ${results.length} entri\n`)

/* ------------------------------------------------------------------ */

await test('fixture berhasil dibaca dan menghasilkan entri', () => {
  assert.ok(results.length > 0, 'hasil olahan tidak boleh kosong')
})

await test('tidak ada jaringan besar dalam hasil olahan', () => {
  const chains: string[] = []
  for (const r of results) {
    if (isChain(r.name)) chains.push(r.name)
  }
  assert.deepEqual(chains, [], `jaringan besar lolos: ${chains.join(', ')}`)
})

await test('tidak ada duplikat nama + jalan', () => {
  const keys = results.map((r) => r.name.toLowerCase())
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
  assert.deepEqual(dupes, [], `duplikat: ${[...new Set(dupes)].join(', ')}`)
})

await test('setiap entri punya nama yang tidak kosong', () => {
  for (const r of results) {
    assert.equal(typeof r.name, 'string')
    assert.ok(r.name.trim().length > 0, `entri tanpa nama: ${JSON.stringify(r)}`)
  }
})

await test('setiap entri punya jenis usaha dan label yang dikenal', () => {
  const allowed = new Set([
    'Warung makan',
    'Kedai kopi',
    'Kue dan roti',
    'Toko kelontong',
    'Jasa katering',
    'Toko pakaian/kriya',
    'Lainnya',
  ])
  for (const r of results) {
    assert.ok(allowed.has(r.jenisUsaha), `jenis tidak dikenal: ${r.jenisUsaha}`)
    assert.ok(r.categoryLabel.trim().length > 0, `label kosong untuk ${r.name}`)
  }
})

await test('setiap entri punya id yang unik', () => {
  const ids = results.map((r) => r.id)
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i)
  assert.deepEqual(dupes, [])
})

await test('toko emas lokal tetap ada (bukan jaringan)', () => {
  const emas = results.filter((r) => /toko\s*mas/i.test(r.name))
  assert.ok(emas.length > 0, 'toko emas lokal tidak boleh ikut tersaring')
  for (const e of emas) assert.equal(isChain(e.name), false, `${e.name} salah dianggap jaringan`)
})

await test('toko musik lokal tetap ada', () => {
  const musik = results.filter((r) => /musik/i.test(r.name))
  assert.ok(musik.length > 0, 'toko musik lokal tidak boleh ikut tersaring')
})

await test('hasil terurut stabil menurut nama', () => {
  const names = results.map((r) => r.name)
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'id')))
})

await test('tidak ada entri non-UMKM (dealer, bengkel, salon)', () => {
  const bad = results.filter((r) =>
    /showroom|dealer|bengkel|salon|hairdresser|laundry|elektronik|komputer/i.test(r.name),
  )
  assert.deepEqual(
    bad.map((b) => b.name),
    [],
    'jenis usaha non-UMKM masih lolos',
  )
})

await test('fixture bebas dari kunci API dan koordinat presisi', () => {
  const text = readFileSync(FIXTURE_PATH, 'utf8')
  // Diperiksa sebagai KEY JSON (bukan substring), karena komentar di dalam
  // fixture menyebut nama field yang harus dihindari.
  for (const key of ['apiKey', 'place_id', 'lat', 'lon', 'geometry', 'coordinates']) {
    assert.equal(
      new RegExp(`"${key}"\\s*:`).test(text),
      false,
      `fixture mengandung field "${key}"`,
    )
  }
  // Tidak ada nilai kunci API yang berbentuk umum.
  assert.equal(/AIza[0-9A-Za-z_-]{10,}/.test(text), false, 'fixture mengandung kunci Google')
  assert.equal(/[0-9a-f]{32}/.test(text), false, 'fixture mengandung string mirip kunci Geoapify')
})

/* ------------------------------------------------------------------ */

console.log(`\n${'-'.repeat(58)}`)
console.log(`Lulus: ${pass}   Gagal: ${fail}`)
if (fail > 0) {
  console.log('Yang gagal:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('Semua tes fixture lulus.')
