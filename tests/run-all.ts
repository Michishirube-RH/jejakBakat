/**
 * Menjalankan seluruh tes JejakBakat AI.
 *
 *   node --experimental-strip-types tests/run-all.ts
 *
 * Tes UI membutuhkan dev server di http://localhost:8443 (npm run dev).
 * Bila server tidak hidup, tes UI dilewati dengan peringatan.
 */

import { spawnSync } from 'node:child_process'

const BASE = process.env.BASE_URL || 'http://localhost:8443'

interface Suite {
  name: string
  file: string
  needsServer?: boolean
}

const suites: Suite[] = [
  { name: 'Unit: handler places & perancang misi', file: 'tests/test-stage-a.ts' },
  { name: 'Fixture: respons nyata Geoapify Padang', file: 'tests/test-fixture.ts' },
  { name: 'UI: alur lengkap pada 390 px', file: 'tests/test-ui.ts', needsServer: true },
  { name: 'Ujung-ke-ujung: UMKM pencarian + manual', file: 'tests/test-two-umkm.ts', needsServer: true },
]

async function serverAlive(): Promise<boolean> {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

const alive = await serverAlive()
const results: Array<{ name: string; ok: boolean; skipped: boolean }> = []

for (const s of suites) {
  console.log(`\n${'='.repeat(66)}`)
  console.log(s.name)
  console.log('='.repeat(66))

  if (s.needsServer && !alive) {
    console.log(`  DILEWATI: dev server tidak berjalan di ${BASE}`)
    console.log('  Jalankan "npm run dev" lebih dulu.')
    results.push({ name: s.name, ok: true, skipped: true })
    continue
  }

  const r = spawnSync(
    process.execPath,
    ['--experimental-strip-types', s.file],
    { stdio: 'inherit', env: { ...process.env, BASE_URL: BASE } },
  )
  results.push({ name: s.name, ok: r.status === 0, skipped: false })
}

console.log(`\n${'='.repeat(66)}`)
console.log('RANGKUMAN')
console.log('='.repeat(66))
let failed = 0
for (const r of results) {
  const mark = r.skipped ? 'LEWAT' : r.ok ? 'LULUS' : 'GAGAL'
  if (!r.ok) failed++
  console.log(`  [${mark}] ${r.name}`)
}

if (failed > 0) {
  console.log(`\n${failed} suite gagal.`)
  process.exit(1)
}
console.log('\nSemua suite lulus.')
