/**
 * Uji ujung-ke-ujung dengan dua UMKM: satu dari pencarian, satu manual.
 * Mencetak misi yang benar-benar dihasilkan agar bisa diperiksa.
 *
 *   node --experimental-strip-types tests/test-two-umkm.ts
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = 'http://localhost:8443'
const PORT = 9336
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const dir = mkdtempSync(join(tmpdir(), 'jb-two-'))
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu',
   '--window-size=390,900', 'about:blank'],
  { stdio: 'ignore' },
)
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break } catch {}
  await wait(250)
}
const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t: any) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise<void>((r) => (ws.onopen = () => r()))
let id = 0
const pending = new Map<number, any>()
ws.onmessage = (e: MessageEvent) => {
  const m = JSON.parse(String(e.data))
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
}
const send = (method: string, params: any = {}) =>
  new Promise<any>((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr: string) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

const LEGACY = ['Bu Sari', 'Kopi Tetangga', 'Batik Ibu Lastri', 'Misi contoh']

async function seed() {
  await send('Page.navigate', { url: BASE }); await wait(1200)
  await ev(`(() => {
    const answers = {}; for (let i=0;i<10;i++) answers['q'+(i+1)]={choice:['a']};
    localStorage.setItem('jejakbakat:v2', JSON.stringify({
      screen:'results', qIndex:0, answers,
      result:{potentials:[{potentialId:'p1',confidence:'Tinggi',score:9,evidence:[]}],signalScores:{}},
      umkm:null,mission:null,problem:'',ownerPermissionGranted:false,introMessage:'',
      stepDone:{},tasks:{},notes:{},userName:'Rian',ownerTestimonial:'',ownerName:'',metricsData:{},chats:{}}));
  })()`)
  await send('Page.navigate', { url: BASE }); await wait(1500)
}

async function waitText(needle: string, timeout = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const t: string = await ev('document.body.innerText')
    if (t.includes(needle)) return t
    await wait(300)
  }
  throw new Error(`timeout: ${needle}`)
}

async function assertClean(where: string) {
  const t: string = await ev('document.body.innerText')
  for (const n of LEGACY) if (t.includes(n)) throw new Error(`${where}: memuat "${n}"`)
}

function printMission(label: string, m: any) {
  console.log(`\n  ${label}`)
  console.log(`    usaha     : ${m.usaha}`)
  console.log(`    lokasi    : ${m.lokasi}`)
  console.log(`    jenis     : ${m.jenisUsaha}`)
  console.log(`    masalah   : ${m.masalah ? m.masalah.slice(0, 70) : '(kosong)'}`)
  console.log(`    ringkasan : ${String(m.ringkasan).slice(0, 90)}`)
  console.log(`    target    : ${String(m.target).slice(0, 90)}`)
  console.log(`    izin      : ${m.ownerPermissionGranted ? 'Sudah izin' : 'Belum dihubungi'}`)
  console.log(`    langkah   : ${m.roadmap.length}`)
  m.roadmap.forEach((s: any, i: number) => {
    console.log(`      ${i + 1}. ${s.title}`)
    console.log(`         target: ${String(s.goal).slice(0, 80)}`)
  })
  const first = String(m.roadmap[0]?.title + ' ' + (m.roadmap[0]?.goal ?? '') + ' ' + (m.roadmap[0]?.tasks ?? []).join(' '))
  const ok = /izin/i.test(first) && /(wawancar|tanya|temui|bertemu)/i.test(first)
  console.log(`    langkah 1 menyebut izin + wawancara: ${ok ? 'YA' : 'TIDAK'}`)
  // Nama bawaan tidak boleh muncul di dalam misi.
  const dump = JSON.stringify(m)
  for (const n of LEGACY) if (dump.includes(n)) throw new Error(`misi memuat "${n}"`)
}

/* ================================================================== */
/* Bagian 1: UMKM dari pencarian                                       */
/* ================================================================== */

console.log('='.repeat(64))
console.log('BAGIAN 1 - UMKM dari hasil pencarian')
console.log('='.repeat(64))

await seed()
await ev(`(() => { const s=JSON.parse(localStorage.getItem('jejakbakat:v2')); s.screen='pickUmkm'; localStorage.setItem('jejakbakat:v2',JSON.stringify(s)); })()`)
await send('Page.navigate', { url: BASE })
await wait(2500)

/**
 * Menunggu daftar hasil pencarian. Bila server masih membalas 429 karena
 * sisa kuota dari tes lain, tunggu sebentar lalu muat ulang layarnya.
 */
async function waitForSearchResults(timeout = 120000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const t: string = await ev('document.body.innerText')
    if (t.includes('usaha ditemukan')) return t
    if (t.includes('Terlalu banyak permintaan')) {
      console.log('  (kuota rate limit habis, menunggu 15 detik lalu mencoba lagi)')
      await wait(15000)
      await send('Page.navigate', { url: BASE })
      await wait(2500)
      continue
    }
    await wait(500)
  }
  throw new Error('timeout menunggu hasil pencarian')
}

const listText = await waitForSearchResults()
const count = (listText.match(/(\d+) usaha ditemukan/) || [])[1]
console.log(`  hasil pencarian: ${count} usaha`)
console.log(`  atribusi tampil: ${listText.includes('OpenStreetMap contributors dan Geoapify')}`)

// Pilih kartu pertama dan catat namanya.
const picked = await ev(`(() => {
  const cards = [...document.querySelectorAll('ul li button')];
  if (!cards.length) return null;
  const name = cards[0].querySelector('p span.truncate')?.textContent?.trim() || '';
  cards[0].scrollIntoView({block:'center'});
  cards[0].click();
  return name;
})()`)
console.log(`  UMKM dipilih   : ${picked}`)

await waitText('Ceritakan masalahnya')
await assertClean('tellProblem')

// Isi masalah + centang izin
await ev(`(() => {
  const ta = document.getElementById('masalah');
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(ta, 'Pembeli baru jarang datang dan belum ada foto menu.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  const cb = document.querySelector('input[type=checkbox]');
  cb.click();
})()`)
await wait(400)

const st = await ev(`document.body.innerText`)
console.log(`  status izin    : ${st.includes('Sudah izin') ? 'Sudah izin' : 'Belum dihubungi'}`)

// Rancang misi
await ev(`(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Rancang misiku')).click(); })()`)
await waitText('Tugas langkah', 90000)
await assertClean('workspace')

const m1 = await ev(`JSON.parse(localStorage.getItem('jejakbakat:v2')).mission`)
printMission('Misi hasil pencarian:', m1)

/* ================================================================== */
/* Bagian 2: UMKM manual                                               */
/* ================================================================== */

console.log('\n' + '='.repeat(64))
console.log('BAGIAN 2 - UMKM dari input manual')
console.log('='.repeat(64))

await seed()
await ev(`(() => { const s=JSON.parse(localStorage.getItem('jejakbakat:v2')); s.screen='pickUmkm'; localStorage.setItem('jejakbakat:v2',JSON.stringify(s)); })()`)
await send('Page.navigate', { url: BASE })
await waitText('Cari di sekitar', 20000)

await ev(`(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Tambah sendiri').click(); })()`)
await wait(600)

await ev(`(() => {
  const set = (id, v) => {
    const el = document.getElementById(id);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('umkm-nama', 'Warung Uji Manual');
  set('umkm-kota', 'Padang');
  set('umkm-alamat', 'Jl. Pasar Raya No. 12');
})()`)
await wait(400)

// Pilih chip "Kedai kopi"
await ev(`(() => { const b=[...document.querySelectorAll('button[aria-pressed]')].find(x=>x.textContent.trim()==='Kedai kopi'); if(b) b.click(); })()`)
await wait(300)

await ev(`(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lanjut ceritakan')).click(); })()`)
await waitText('Ceritakan masalahnya')
await assertClean('tellProblem manual')

const manualShown = await ev(`document.body.innerText`)
console.log(`  UMKM manual    : ${manualShown.includes('Warung Uji Manual') ? 'Warung Uji Manual (tampil)' : 'TIDAK TAMPIL'}`)
console.log(`  jenis          : ${manualShown.includes('Kedai kopi') ? 'Kedai kopi' : 'tidak tampil'}`)

// Masalah dikosongkan (opsional) dan izin tidak dicentang
await ev(`(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Rancang misiku')).click(); })()`)
await waitText('Tugas langkah', 90000)
await assertClean('workspace manual')

const m2 = await ev(`JSON.parse(localStorage.getItem('jejakbakat:v2')).mission`)
printMission('Misi UMKM manual:', m2)

/* ================================================================== */
/* Rangkuman                                                           */
/* ================================================================== */

console.log('\n' + '='.repeat(64))
console.log('RANGKUMAN')
console.log('='.repeat(64))
console.log(`  1. ${m1.usaha} (pencarian) -> ${m1.roadmap.length} langkah, izin: ${m1.ownerPermissionGranted}`)
console.log(`  2. ${m2.usaha} (manual)    -> ${m2.roadmap.length} langkah, izin: ${m2.ownerPermissionGranted}`)
console.log(`  Nama bawaan di kedua misi: tidak ada`)

ws.close(); chrome.kill()
try { rmSync(dir, { recursive: true, force: true }) } catch {}
process.exit(0)
