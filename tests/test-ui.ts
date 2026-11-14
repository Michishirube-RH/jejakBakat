/**
 * Tes UI otomatis lewat Chrome DevTools Protocol.
 *
 * Menjalankan alur nyata di http://localhost:8443:
 *   Hasil -> Pilih UMKM (cari & manual) -> Ceritakan masalahnya -> Misi -> Ruang kerja
 * serta memeriksa:
 *   - tidak ada nama usaha bawaan di layar mana pun
 *   - tombol Kembali browser bekerja di pickUmkm & tellProblem
 *   - halaman aman saat di-refresh di layar tersebut
 *   - tata letak rapi di lebar 390 px (tidak ada scroll horizontal)
 *   - batas panjang input diterapkan
 *
 *   node --experimental-strip-types tests/test-ui.ts
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:8443'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9333

let pass = 0
let fail = 0
const failures: string[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    pass++
    console.log(`  ok   ${name}`)
  } catch (err: any) {
    fail++
    failures.push(name)
    console.log(`  FAIL ${name}`)
    console.log(`       ${String(err?.message || err).split('\n')[0]}`)
  }
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}

/* ------------------------------------------------------------------ */
/* Klien CDP minimal                                                   */
/* ------------------------------------------------------------------ */

const userDataDir = mkdtempSync(join(tmpdir(), 'jb-chrome-'))
let chrome: ChildProcess | null = null

async function launch() {
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=390,900',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  // Tunggu endpoint DevTools siap.
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (r.ok) return
    } catch {
      /* belum siap */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Chrome DevTools tidak siap')
}

class Cdp {
  private ws!: WebSocket
  private id = 0
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
  private listeners: Array<(m: any) => void> = []

  static async connect(): Promise<Cdp> {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    const page = list.find((t: any) => t.type === 'page')
    if (!page) throw new Error('tab tidak ditemukan')
    const c = new Cdp()
    await c.open(page.webSocketDebuggerUrl)
    return c
  }

  private open(url: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (e: any) => reject(e)
      this.ws.onmessage = (ev: MessageEvent) => {
        const msg = JSON.parse(String(ev.data))
        if (msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error.message))
          else p.resolve(msg.result)
        } else if (msg.method) {
          for (const l of this.listeners) l(msg)
        }
      }
    })
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(fn: (m: any) => void) {
    this.listeners.push(fn)
  }

  async eval<T = any>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || 'eval error')
    }
    return r.result.value as T
  }

  async goto(url: string) {
    await this.send('Page.navigate', { url })
    await this.waitFor('document.readyState === "complete"')
    await new Promise((r) => setTimeout(r, 600))
  }

  /** Menunggu kondisi di halaman. */
  async waitFor(cond: string, timeout = 12000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        if (await this.eval<boolean>(`!!(${cond})`)) return
      } catch {
        /* halaman sedang memuat */
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    throw new Error(`timeout menunggu: ${cond}`)
  }

  /** Teks seluruh halaman. */
  async text(): Promise<string> {
    return this.eval<string>('document.body.innerText')
  }

  /** Mengklik elemen berdasarkan teksnya. */
  async clickText(needle: string): Promise<boolean> {
    return this.eval<boolean>(`(() => {
      const els = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')];
      const el = els.find(e => (e.textContent || '').trim().toLowerCase().includes(${JSON.stringify(needle.toLowerCase())}));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* abaikan */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Mulai                                                               */
/* ------------------------------------------------------------------ */

await launch()
const cdp = await Cdp.connect()
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})

const LEGACY = ['Warung Bu Sari', 'Kopi Tetangga', 'Batik Ibu Lastri', 'Misi contoh untuk demo']

async function assertNoLegacy(where: string) {
  const t = await cdp.text()
  for (const n of LEGACY) {
    assert(!t.includes(n), `${where}: nama bawaan "${n}" masih tampil`)
  }
}

/** Menyiapkan localStorage dengan jawaban + hasil agar bisa masuk layar Hasil. */
async function seedResults() {
  await cdp.goto(BASE)
  await cdp.eval(`(() => {
    const answers = {};
    for (let i = 0; i < 10; i++) answers['q' + (i + 1)] = { choice: ['a'] };
    const state = {
      screen: 'results',
      qIndex: 0,
      answers,
      result: {
        potentials: [
          { potentialId: 'p1', confidence: 'Tinggi', score: 9, evidence: [{ quote: 'aku suka bercerita', explanation: 'Kamu sering menjelaskan dengan cerita.' }] },
          { potentialId: 'p2', confidence: 'Sedang', score: 7, evidence: [] },
        ],
        signalScores: { komunikasi: 8, visual: 6, analitis: 4, organisasi: 5, empati: 6, teknologi: 4 },
      },
      umkm: null, mission: null, problem: '', ownerPermissionGranted: false, introMessage: '',
      stepDone: {}, tasks: {}, notes: {}, userName: '', ownerTestimonial: '', ownerName: '',
      metricsData: {}, chats: {},
    };
    localStorage.setItem('jejakbakat:v2', JSON.stringify(state));
  })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Potensimu")')
}

/* ================================================================== */
/* 1. Layar Hasil                                                      */
/* ================================================================== */

console.log('\n1. Layar Hasil analisis')

await test('kartu ajakan tampil, kartu misi contoh hilang', async () => {
  await seedResults()
  const t = await cdp.text()
  assert(t.includes('Buktikan potensimu lewat misi UMKM'), 'judul ajakan tidak ada')
  assert(
    t.includes('Pilih usaha di sekitarmu atau tambahkan sendiri, lalu Jeje merancang misinya'),
    'teks ajakan tidak sesuai',
  )
  assert(t.includes('Pilih UMKM-mu'), 'tombol tidak ada')
  for (const n of LEGACY) assert(!t.includes(n), `masih ada "${n}"`)
})

await test('bagian lain layar Hasil tidak berubah', async () => {
  const t = await cdp.text()
  assert(t.includes('Catatan jujur'), 'catatan jujur hilang')
  assert(t.includes('Ulangi kuesioner'), 'tombol ulangi hilang')
  const hasRadar = await cdp.eval<boolean>('!!document.querySelector("svg")')
  assert(hasRadar, 'grafik radar hilang')
})

/* ================================================================== */
/* 2. Layar Pilih UMKM + tombol Kembali                                */
/* ================================================================== */

console.log('\n2. Layar Pilih UMKM')

await test('tombol "Pilih UMKM-mu" membuka layar Pilih UMKM', async () => {
  const ok = await cdp.clickText('Pilih UMKM-mu')
  assert(ok, 'tombol tidak bisa diklik')
  await cdp.waitFor('document.body.innerText.includes("Pilih UMKM")')
  await cdp.waitFor('document.body.innerText.includes("Cari di sekitar")')
  const t = await cdp.text()
  assert(t.includes('Tambah sendiri'), 'tab manual tidak ada')
})

await test('tombol Kembali browser kembali ke layar Hasil', async () => {
  await cdp.eval('window.history.back()')
  await new Promise((r) => setTimeout(r, 900))
  await cdp.waitFor('document.body.innerText.includes("Ulangi kuesioner")')
  const t = await cdp.text()
  assert(t.includes('Pilih UMKM-mu'), 'tidak kembali ke layar Hasil')
})

await test('refresh di layar Pilih UMKM tetap aman', async () => {
  await cdp.clickText('Pilih UMKM-mu')
  await cdp.waitFor('document.body.innerText.includes("Cari di sekitar")')
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Cari di sekitar")')
  const t = await cdp.text()
  assert(!t.includes('belum terbaca'), 'refresh membuat layar rusak')
  await assertNoLegacy('pickUmkm setelah refresh')
})

await test('tidak ada scroll horizontal di 390 px', async () => {
  const overflow = await cdp.eval<number>('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 1, `ada scroll horizontal: ${overflow}px`)
})


/* ================================================================== */
/* 3. UMKM dari pencarian                                              */
/* ================================================================== */

console.log('\n3. UMKM dari pencarian (data nyata Padang)')

await test('pencarian nyata menampilkan hasil dan atribusi', async () => {
  await cdp.goto(BASE)
  await cdp.eval(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    s.screen = 'pickUmkm';
    localStorage.setItem('jejakbakat:v2', JSON.stringify(s));
  })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("usaha ditemukan")', 25000)
  const t = await cdp.text()
  assert(t.includes('© OpenStreetMap contributors dan Geoapify'), 'atribusi tidak ada')
  assert(!t.includes('Indomaret') && !t.includes('Alfamart'), 'jaringan besar ikut tampil')
  await assertNoLegacy('hasil pencarian')
})

await test('memilih hasil pencarian membuka Ceritakan masalahnya', async () => {
  const ok = await cdp.eval<boolean>(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('usaha ditemukan') === false && b.querySelector('p span.truncate'));
    const cards = [...document.querySelectorAll('ul li button')];
    if (!cards.length) return false;
    cards[0].scrollIntoView({ block: 'center' });
    cards[0].click();
    return true;
  })()`)
  assert(ok, 'kartu hasil tidak ditemukan')
  await cdp.waitFor('document.body.innerText.includes("Ceritakan masalahnya")')
  const t = await cdp.text()
  assert(t.includes('Sudah izin pemilik'), 'checkbox izin tidak ada')
  assert(t.includes('Belum dihubungi'), 'status awal salah')
  assert(t.includes('Tips keselamatan'), 'tips keselamatan tidak ada')
  assert(t.includes('Rancang misiku'), 'tombol rancang tidak ada')
})

await test('tips keselamatan berisi 4 butir yang diminta', async () => {
  const t = await cdp.text()
  assert(t.includes('Datang siang hari'), 'tips siang hari tidak ada')
  assert(t.includes('Ajak teman'), 'tips ajak teman tidak ada')
  assert(t.includes('Bertemu di lokasi usaha'), 'tips lokasi tidak ada')
  assert(t.includes('Jangan membagikan data pribadi'), 'tips data pribadi tidak ada')
})

await test('tombol Kembali browser dari tellProblem kembali ke pickUmkm', async () => {
  await cdp.eval('window.history.back()')
  await new Promise((r) => setTimeout(r, 900))
  await cdp.waitFor('document.body.innerText.includes("Cari di sekitar")')
})

await test('refresh di tellProblem tetap di layar yang sama', async () => {
  await cdp.eval('window.history.forward()')
  await new Promise((r) => setTimeout(r, 900))
  await cdp.waitFor('document.body.innerText.includes("Ceritakan masalahnya")')
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Ceritakan masalahnya")')
  const t = await cdp.text()
  assert(!t.includes('Belum ada UMKM'), 'refresh menghapus UMKM terpilih')
})

await test('batas panjang masalah 600 karakter diterapkan', async () => {
  const len = await cdp.eval<number>(`(() => {
    const ta = document.getElementById('masalah');
    if (!ta) return -1;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'x'.repeat(900));
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return ta.value.length;
  })()`)
  assert(len === 600, `panjang masalah seharusnya 600, dapat ${len}`)
})

/* ================================================================== */
/* 4. UMKM dari input manual                                           */
/* ================================================================== */

console.log('\n4. UMKM dari input manual')

await test('form Tambah sendiri menolak simpan sebelum nama & kota diisi', async () => {
  await cdp.goto(BASE)
  await cdp.eval(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    s.screen = 'pickUmkm'; s.umkm = null;
    localStorage.setItem('jejakbakat:v2', JSON.stringify(s));
  })()`)
  await cdp.goto(BASE)
  await cdp.clickText('Tambah sendiri')
  await new Promise((r) => setTimeout(r, 400))
  const disabled = await cdp.eval<boolean>(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Lanjut ceritakan'));
    return !!b && b.disabled;
  })()`)
  assert(disabled, 'tombol seharusnya nonaktif saat form kosong')
})

await test('batas nama 80 dan alamat 160 karakter diterapkan', async () => {
  const r = await cdp.eval<any>(`(() => {
    const setVal = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const nama = document.getElementById('umkm-nama');
    const alamat = document.getElementById('umkm-alamat');
    if (!nama || !alamat) return { ok: false };
    setVal(nama, 'N'.repeat(200));
    setVal(alamat, 'A'.repeat(300));
    return { ok: true, namaLen: nama.value.length, alamatLen: alamat.value.length };
  })()`)
  assert(r.ok, 'input tidak ditemukan')
  assert(r.namaLen === 80, `nama seharusnya 80, dapat ${r.namaLen}`)
  assert(r.alamatLen === 160, `alamat seharusnya 160, dapat ${r.alamatLen}`)
})

await test('mengisi form manual membuka Ceritakan masalahnya', async () => {
  await cdp.eval(`(() => {
    const setVal = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setVal(document.getElementById('umkm-nama'), 'Warung Uji Manual');
    setVal(document.getElementById('umkm-kota'), 'Padang');
  })()`)
  await new Promise((r) => setTimeout(r, 300))
  const ok = await cdp.clickText('Lanjut ceritakan')
  assert(ok, 'tombol lanjut tidak bisa diklik')
  await cdp.waitFor('document.body.innerText.includes("Ceritakan masalahnya")')
  const t = await cdp.text()
  assert(t.includes('Warung Uji Manual'), 'UMKM manual tidak tampil')
  assert(t.includes('Padang'), 'kota tidak tampil')
})

await test('tidak ada scroll horizontal di tellProblem (390 px)', async () => {
  const overflow = await cdp.eval<number>('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 1, `ada scroll horizontal: ${overflow}px`)
})

/* ================================================================== */
/* 5. Rancang misi + ruang kerja                                       */
/* ================================================================== */

console.log('\n5. Rancang misi')

await test('Rancang misiku menghasilkan misi 3 langkah untuk UMKM manual', async () => {
  const ok = await cdp.clickText('Rancang misiku')
  assert(ok, 'tombol tidak bisa diklik')
  await cdp.waitFor('document.body.innerText.includes("Ruang kerja") || document.body.innerText.includes("Tugas langkah")', 60000)
  await cdp.waitFor('document.body.innerText.includes("Tugas langkah")', 60000)
  const t = await cdp.text()
  assert(t.includes('Warung Uji Manual'), 'misi tidak memakai UMKM manual')
  assert(t.includes('Izin pemilik'), 'status izin tidak tampil di ruang kerja')
  assert(!t.includes('Bu Sari'), 'nama bawaan muncul di ruang kerja')
})

await test('misi tersimpan di localStorage dan dipakai Detail misi', async () => {
  const saved = await cdp.eval<any>(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    return { usaha: s.mission?.usaha, steps: s.mission?.roadmap?.length, umkm: s.umkm?.name };
  })()`)
  assert(saved.usaha === 'Warung Uji Manual', `misi tersimpan salah: ${saved.usaha}`)
  assert(saved.steps === 3, `langkah seharusnya 3, dapat ${saved.steps}`)

  const ok = await cdp.clickText('Detail misi')
  assert(ok, 'tombol detail tidak bisa diklik')
  await cdp.waitFor('document.body.innerText.includes("Langkah yang akan kamu jalani")')
  const t = await cdp.text()
  assert(t.includes('Warung Uji Manual'), 'detail misi tidak memakai UMKM')
  assert(!t.includes('Bu Sari') && !t.includes('Kopi Tetangga'), 'nama bawaan muncul di detail misi')
})

await test('laporan dampak memakai UMKM dan status izin, tanpa data bawaan', async () => {
  await cdp.eval(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    s.screen = 'report';
    localStorage.setItem('jejakbakat:v2', JSON.stringify(s));
  })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Laporan Dampak")', 30000)
  const t = await cdp.text()
  assert(t.includes('Warung Uji Manual'), 'laporan tidak memakai UMKM')
  assert(t.includes('Izin pemilik'), 'status izin tidak ada di verifikasi')
  assert(!t.includes('Bu Sari') && !t.includes('Kopi Tetangga'), 'nama bawaan muncul di laporan')
  assert(!t.includes('sampleTestimonial'), 'data bawaan bocor')
})

/* ================================================================== */
/* 6. Semua layar bersih dari nama bawaan                              */
/* ================================================================== */

console.log('\n6. Pemeriksaan akhir')

await test('Beranda bersih dari nama usaha bawaan', async () => {
  await cdp.goto(BASE)
  await cdp.eval(`(() => { const s = JSON.parse(localStorage.getItem('jejakbakat:v2')); s.screen = 'welcome'; localStorage.setItem('jejakbakat:v2', JSON.stringify(s)); })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Temukan potensimu")')
  const t = await cdp.text()
  for (const n of LEGACY) assert(!t.includes(n), `Beranda masih memuat "${n}"`)
})

await test('Beranda rapi di 390 px (tanpa scroll horizontal)', async () => {
  const overflow = await cdp.eval<number>('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 1, `ada scroll horizontal: ${overflow}px`)
})

await test('teks privasi menyebut AI dan lokasi kasar', async () => {
  const t = await cdp.text()
  assert(t.includes('layanan AI untuk dianalisis'), 'teks privasi AI tidak ada')
  assert(t.includes('Lokasi kasar'), 'teks privasi lokasi tidak ada')
})

/* ================================================================== */
/* 7. Jalur galat server (dijalankan terakhir)                          */
/* ================================================================== */

console.log('\n7. Jalur galat server')

await test('bila pencarian gagal, muncul pesan + arah ke Tambah sendiri', async () => {
  // Memakai jalur galat nyata dari server: lewati batas 20 permintaan per menit,
  // lalu server menjawab 429. Dijalankan paling akhir agar kuota rate limit
  // tidak mengganggu tes pencarian lain.
  const { resetRateLimit } = await import('../server/placesHandler.ts')
  resetRateLimit()

  let lastStatus = 0
  let lastMessage = ''
  for (let i = 0; i < 25; i++) {
    const r = await fetch(`${BASE}/api/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radiusKm: 2 }),
    })
    const body = await r.json().catch(() => ({}))
    lastStatus = r.status
    lastMessage = body?.message ?? ''
    if (r.status === 429) break
  }
  assert(lastStatus === 429, `server seharusnya membalas 429, dapat ${lastStatus}`)
  assert(lastMessage.length > 0, 'pesan galat dari server kosong')

  // Buka layar Pilih UMKM: pencariannya akan menerima 429.
  await cdp.goto(BASE)
  await cdp.eval(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    s.screen = 'pickUmkm';
    localStorage.setItem('jejakbakat:v2', JSON.stringify(s));
  })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('document.body.innerText.includes("Terlalu banyak permintaan")', 15000)
  const t = await cdp.text()
  assert(t.includes('Tambah sendiri'), 'tidak mengarahkan ke Tambah sendiri')

  resetRateLimit()
})

/* ------------------------------------------------------------------ */

console.log(`\n${'-'.repeat(58)}`)
console.log(`Lulus: ${pass}   Gagal: ${fail}`)
if (fail > 0) {
  console.log('Yang gagal:')
  for (const f of failures) console.log(`  - ${f}`)
}

cdp.close()
chrome?.kill()
try {
  rmSync(userDataDir, { recursive: true, force: true })
} catch {
  /* abaikan */
}
process.exit(fail > 0 ? 1 : 0)
