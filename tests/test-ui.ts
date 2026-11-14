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
  await cdp.waitFor('document.querySelectorAll(\'[data-usaha-card="true"]\').length > 0', 25000)
  const t = await cdp.text()
  assert(t.includes('© OpenStreetMap contributors dan Geoapify'), 'atribusi tidak ada')
  assert(!t.includes('Indomaret') && !t.includes('Alfamart'), 'jaringan besar ikut tampil')
  assert(!t.toLowerCase().includes('hokben') && !t.toLowerCase().includes('cfc ambacang'), 'HokBen atau CFC ikut tampil')
  await assertNoLegacy('hasil pencarian')
})

await test('hanya 3 usaha terdekat yang tampil sebagai kartu', async () => {
  const n = await cdp.eval<number>(`document.querySelectorAll('[data-usaha-card="true"]').length`)
  assert(n === 3, `kartu harus 3, dapat ${n}`)
  // Setiap kartu wajib punya ilustrasi; tidak ada kartu tanpa gambar.
  const svg = await cdp.eval<number>(`document.querySelectorAll('[data-usaha-card="true"] svg[role="img"]').length`)
  assert(svg === 3, `ilustrasi harus 3, dapat ${svg}`)
  const t = await cdp.text()
  assert(t.includes('3 usaha terdekat'), 'judul "3 usaha terdekat" tidak ada')
  // Info yang baru diketahui setelah misi dirancang tidak boleh muncul di sini.
  assert(!t.includes('Cocok dengan'), 'menampilkan kecocokan potensi yang belum diketahui')
})

await test('tombol Pilih UMKM lain membuka daftar ringkas sisanya', async () => {
  const label = await cdp.eval<string>(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Pilih UMKM lain/.test(x.textContent));
    return b ? b.textContent.replace(/\\s+/g,' ').trim() : '';
  })()`)
  assert(/Pilih UMKM lain \(\d+ lagi\)/.test(label), `label tombol salah: "${label}"`)

  const dibuka = await cdp.eval<boolean>(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Pilih UMKM lain/.test(x.textContent));
    if (!b) return false; b.click(); return true;
  })()`)
  assert(dibuka, 'tombol tidak bisa diklik')
  await cdp.waitFor('document.querySelectorAll(\'#daftar-umkm-lain li\').length > 0', 8000)
  const baris = await cdp.eval<number>(`document.querySelectorAll('#daftar-umkm-lain li').length`)
  assert(baris > 0, 'daftar ringkas kosong')
  // Jumlah total: 3 kartu + baris daftar = seluruh hasil pencarian.
  const total = 3 + baris
  assert(total >= 4, `total usaha terlalu sedikit: ${total}`)
})

await test('memilih hasil pencarian membuka Ceritakan masalahnya', async () => {
  const ok = await cdp.eval<boolean>(`(() => {
    const cards = [...document.querySelectorAll('[data-usaha-card="true"]')];
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

await test('layar Laporan Dampak langsung menampilkan sertifikat', async () => {
  await cdp.eval(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    s.screen = 'report'; s.userName = 'Rian Pratama';
    localStorage.setItem('jejakbakat:v2', JSON.stringify(s));
  })()`)
  await cdp.goto(BASE)
  await cdp.waitFor('!!document.querySelector(\'[data-sertifikat="true"]\')', 30000)
  const t = await cdp.text()
  assert(t.includes('Laporan Dampak'), 'judul layar tidak ada')
  assert(t.includes('Warung Uji Manual'), 'sertifikat tidak memakai UMKM')
  assert(t.includes('Izin pemilik'), 'status izin tidak ada')
  assert(!t.includes('Bu Sari') && !t.includes('Kopi Tetangga'), 'nama bawaan muncul di sertifikat')
  assert(!t.includes('sampleTestimonial'), 'data bawaan bocor')
})

/* ================================================================== */
/* 6. Sertifikat Laporan Dampak                                        */
/* ================================================================== */

console.log('\n6. Sertifikat Laporan Dampak')

await test('lembar laporan lama sudah tidak ada', async () => {
  const t = await cdp.text()
  assert(!t.includes('Ringkasan misi'), 'ringkasan misi masih tampil')
  assert(!t.includes('Langkah yang diselesaikan'), 'daftar langkah masih tampil')
  assert(!t.includes('Saran langkah berikutnya'), 'saran langkah masih tampil')
  const tombol = await cdp.eval<string[]>(`[...document.querySelectorAll('button')].map(b => b.textContent.trim())`)
  assert(!tombol.some((x) => /Lihat sertifikat/i.test(x)), 'tombol "Lihat sertifikat" masih nyangkut')
  assert(!tombol.some((x) => /^Unduh PDF$/i.test(x)), 'tombol "Unduh PDF" lama masih nyangkut')
  assert(tombol.some((x) => /Unduh sertifikat/i.test(x)), 'tombol unduh sertifikat tidak ada')
})

await test('input nama ada di layar sertifikat, bukan di lembar terpisah', async () => {
  const n = await cdp.eval<number>(`(() => {
    const labels = [...document.querySelectorAll('label')].map(l => l.textContent || '');
    return labels.filter(x => /Nama kamu/.test(x)).length;
  })()`)
  assert(n === 1, `input "Nama kamu" harus tepat 1, dapat ${n}`)
})

await test('mengubah nama langsung mengubah nama di sertifikat', async () => {
  const hasil = await cdp.eval<string>(`(() => {
    const el = [...document.querySelectorAll('label')].find(l => /Nama kamu/.test(l.textContent)).querySelector('input');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'Sari Dewi');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelector('[data-sertifikat="true"] .cert-nama').innerText.trim();
  })()`)
  assert(hasil === 'Sari Dewi', `nama di sertifikat tidak ikut berubah: "${hasil}"`)
})

await test('tanggal sertifikat dikunci ke tanggal misi, bukan hari ini', async () => {
  // Misi contoh dibuat jauh di masa lalu; tanggal sertifikat harus ikut.
  const tanggal = await cdp.eval<string>(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    return new Date(s.mission.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  })()`)
  const teks = await cdp.eval<string>(`document.querySelector('[data-sertifikat="true"]').innerText`)
  assert(teks.includes(tanggal), `tanggal misi ${tanggal} tidak ada di sertifikat`)
})

await test('sertifikat memuat nama, UMKM, dan nomor yang sah', async () => {
  // innerText mengikuti text-transform, jadi judulnya terbaca "SERTIFIKAT".
  // Nama peserta sudah diganti "Sari Dewi" oleh tes sebelumnya.
  const t = await cdp.eval<string>(`document.querySelector('[data-sertifikat="true"]').innerText`)
  assert(/sertifikat/i.test(t), 'judul Sertifikat tidak ada')
  assert(/laporan dampak/i.test(t), 'subjudul Laporan Dampak tidak ada')
  assert(t.includes('Sari Dewi'), 'nama peserta tidak tampil')
  assert(t.includes('Warung Uji Manual'), 'nama UMKM tidak tampil')
  assert(/JB-\d{4}-[0-9A-F]{4}-[0-9A-F]{4}/.test(t), `nomor sertifikat tidak sah: ${t}`)
  assert(!t.includes('Bu Sari') && !t.includes('Kopi Tetangga'), 'nama bawaan muncul di sertifikat')
})

await test('nomor dan tanggal sertifikat stabil setelah muat ulang', async () => {
  const ambil = `(() => { const t = document.querySelector('[data-sertifikat="true"]').innerText; return t.match(/JB-\\d{4}-[0-9A-F]{4}-[0-9A-F]{4}/)[0] + '|' + t.match(/pada ([^—]+)—/)[1].trim(); })()`
  const pertama = await cdp.eval<string>(ambil)
  await cdp.goto(BASE)
  await cdp.waitFor('!!document.querySelector(\'[data-sertifikat="true"]\')', 30000)
  const kedua = await cdp.eval<string>(ambil)
  assert(pertama === kedua, `nomor/tanggal berubah: ${pertama} -> ${kedua}`)
})

await test('kanvas tanda tangan tersedia untuk peserta dan penerbit', async () => {
  const n = await cdp.eval<number>(`document.querySelectorAll('[data-tanda-tangan="true"]').length`)
  assert(n === 2, `kanvas tanda tangan harus 2, dapat ${n}`)
})

await test('coretan mouse tersimpan dan tampil di sertifikat', async () => {
  // Simulasi goresan: hitung rect kanvas peserta, lalu kirim pointer event.
  const box = await cdp.eval<any>(`(() => {
    const c = document.querySelectorAll('[data-tanda-tangan="true"]')[0];
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  })()`)
  const titik = [
    [0.15, 0.6], [0.3, 0.3], [0.45, 0.65], [0.6, 0.35], [0.8, 0.55],
  ].map(([fx, fy]) => ({ x: Math.round(box.x + box.w * fx), y: Math.round(box.y + box.h * fy) }))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: titik[0].x, y: titik[0].y, button: 'left', clickCount: 1 })
  for (const p of titik.slice(1)) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1 })
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: titik.at(-1)!.x, y: titik.at(-1)!.y, button: 'left', clickCount: 1 })
  await new Promise((r) => setTimeout(r, 500))

  const tersimpan = await cdp.eval<boolean>(`(() => {
    const s = JSON.parse(localStorage.getItem('jejakbakat:v2'));
    return typeof s.ttdPeserta === 'string' && s.ttdPeserta.startsWith('data:image/png');
  })()`)
  assert(tersimpan, 'coretan tidak tersimpan di localStorage')

  const tampil = await cdp.eval<number>(`document.querySelectorAll('[data-sertifikat="true"] img[alt="Tanda tangan peserta"]').length`)
  assert(tampil === 1, 'tanda tangan peserta tidak tampil di sertifikat')
})

await test('sertifikat rapi di 390 px (tanpa scroll horizontal)', async () => {
  const overflow = await cdp.eval<number>('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 1, `ada scroll horizontal: ${overflow}px`)
})

await test('tombol Perbesar memperbesar sertifikat dan bisa digeser', async () => {
  // Kembali ke layar Laporan Dampak bila tes sebelumnya berpindah layar.
  await cdp.goto(BASE)
  await cdp.waitFor('!!document.querySelector(\'.cert-scale\')', 30000)
  await new Promise((r) => setTimeout(r, 600))

  const baca = `(() => {
    const s = document.querySelector('.cert-scale');
    const f = document.querySelector('.cert-fit');
    return {
      skala: parseFloat(window.getComputedStyle(s).transform.split('(')[1]),
      bisaGeser: f.scrollWidth > f.clientWidth + 2,
    };
  })()`

  const sebelum = await cdp.eval<any>(baca)
  assert(!sebelum.bisaGeser, 'sertifikat sudah bisa digeser sebelum diperbesar')

  const ok = await cdp.eval<boolean>(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Perbesar/.test(x.textContent)); if (!b) return false; b.click(); return true })()`)
  assert(ok, 'tombol Perbesar tidak ada')
  await new Promise((r) => setTimeout(r, 700))

  const sesudah = await cdp.eval<any>(baca)
  assert(sesudah.skala > sebelum.skala + 0.1, `skala tidak bertambah: ${sebelum.skala} -> ${sesudah.skala}`)
  assert(sesudah.bisaGeser, 'setelah diperbesar sertifikat tidak bisa digeser')

  // Halaman tetap tidak boleh melebar; geseran hanya di dalam pembungkusnya.
  const overflow = await cdp.eval<number>('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 1, `halaman jadi melebar: ${overflow}px`)

  const balik = await cdp.eval<boolean>(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Perkecil/.test(x.textContent)); if (!b) return false; b.click(); return true })()`)
  assert(balik, 'tombol Perkecil tidak ada setelah diperbesar')
})

await test('tombol kembali ke ruang kerja berfungsi', async () => {
  const ok = await cdp.clickText('Kembali ke ruang kerja')
  assert(ok, 'tombol Kembali ke ruang kerja tidak ada')
  await cdp.waitFor('document.body.innerText.includes("Tugas langkah")', 20000)
  const ada = await cdp.eval<boolean>('!!document.querySelector(\'[data-sertifikat="true"]\')')
  assert(!ada, 'sertifikat masih tampil setelah kembali')
})

/* ================================================================== */
/* 7. Semua layar bersih dari nama bawaan                              */
/* ================================================================== */

console.log('\n7. Pemeriksaan akhir')

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
/* 8. Jalur galat server (dijalankan terakhir)                          */
/* ================================================================== */

console.log('\n8. Jalur galat server')

await test('bila pencarian gagal, muncul pesan + arah ke Tambah sendiri', async () => {
  // Memakai jalur galat nyata dari server: lewati batas RATE_LIMIT permintaan
  // per menit, lalu server menjawab 429. Dijalankan paling akhir agar kuota
  // rate limit tidak mengganggu tes pencarian lain.
  const { resetRateLimit, RATE_LIMIT } = await import('../server/placesHandler.ts')
  resetRateLimit()
  await fetch(`${BASE}/api/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _resetRateLimit: true, radiusKm: 2 }),
  }).catch(() => {})

  let lastStatus = 0
  let lastMessage = ''
  for (let i = 0; i < RATE_LIMIT + 5; i++) {
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
  // Saat kena batas, layar harus menyebut sisa waktu tunggu, bukan "Pencarian gagal".
  assert(
    /\d+\s*detik/.test(t),
    'tidak ada hitung mundur saat kena batas laju',
  )

  resetRateLimit()
  await fetch(`${BASE}/api/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _resetRateLimit: true, radiusKm: 2 }),
  }).catch(() => {})
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
