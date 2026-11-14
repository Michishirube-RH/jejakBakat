/**
 * Tes Tahap (a): /api/places dan validasi misi.
 *
 * Dijalankan tanpa test runner (proyek belum punya). Node 24 bisa menjalankan
 * .ts langsung lewat type stripping.
 *
 *   node --experimental-strip-types scratch/test-stage-a.ts
 */

import assert from 'node:assert/strict'

import {
  handlePlacesRequest,
  mapCategoryToJenis,
  normalizeFeature,
  checkRateLimit,
  resetRateLimit,
  _clearPlacesCache,
  _placesCacheSize,
  categoryLabelFor,
  DEFAULT_CENTER,
} from '../server/placesHandler.ts'

import { validateMissionJson } from '../server/aiHandler.ts'

import { missionTemplates, templateForJenis, fillTemplate } from '../src/data/missionTemplates.ts'

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

function section(title: string) {
  console.log(`\n${title}`)
}

/* ================================================================== */
/* 1. Pemetaan kategori (prefix + substring)                          */
/* ================================================================== */

section('1. Pemetaan kategori Geoapify -> chip jenis usaha')

await test('catering.restaurant* -> Warung makan', () => {
  assert.equal(mapCategoryToJenis('catering.restaurant'), 'Warung makan')
  assert.equal(mapCategoryToJenis('catering.restaurant.indonesian'), 'Warung makan')
  assert.equal(mapCategoryToJenis('catering.restaurant.fast_food'), 'Warung makan')
})

await test('catering.fast_food* -> Warung makan', () => {
  assert.equal(mapCategoryToJenis('catering.fast_food'), 'Warung makan')
  assert.equal(mapCategoryToJenis('catering.fast_food.pizza'), 'Warung makan')
})

await test('catering.cafe* -> Kedai kopi', () => {
  assert.equal(mapCategoryToJenis('catering.cafe'), 'Kedai kopi')
  assert.equal(mapCategoryToJenis('catering.cafe.coffee_shop'), 'Kedai kopi')
})

await test('kategori mengandung bakery -> Kue dan roti', () => {
  // Kasus nyata dari data Geoapify: toko roti tidak memakai awalan catering.
  assert.equal(mapCategoryToJenis('commercial.food_and_drink.bakery'), 'Kue dan roti')
  assert.equal(mapCategoryToJenis('catering.bakery'), 'Kue dan roti')
})

await test('bakery menang atas aturan restoran', () => {
  // Bila sebuah tempat bertag dua-duanya, roti yang dipilih.
  assert.equal(
    mapCategoryToJenis('catering.restaurant', 'commercial.food_and_drink.bakery'),
    'Kue dan roti',
  )
})

await test('commercial.convenience* / greengrocer* -> Toko kelontong', () => {
  assert.equal(mapCategoryToJenis('commercial.convenience'), 'Toko kelontong')
  assert.equal(mapCategoryToJenis('commercial.greengrocer'), 'Toko kelontong')
  assert.equal(mapCategoryToJenis('commercial.convenience.supermarket'), 'Toko kelontong')
})

await test('catering.catering -> Jasa katering', () => {
  assert.equal(mapCategoryToJenis('catering.catering'), 'Jasa katering')
})

await test('commercial.clothing* / art_and_craft* -> Toko pakaian/kriya', () => {
  assert.equal(mapCategoryToJenis('commercial.clothing'), 'Toko pakaian/kriya')
  assert.equal(mapCategoryToJenis('commercial.clothing.wedding'), 'Toko pakaian/kriya')
  assert.equal(mapCategoryToJenis('commercial.art_and_craft'), 'Toko pakaian/kriya')
})

await test('kategori tak dikenal -> Lainnya', () => {
  assert.equal(mapCategoryToJenis('commercial.hardware'), 'Lainnya')
  assert.equal(mapCategoryToJenis(''), 'Lainnya')
  assert.equal(mapCategoryToJenis(undefined), 'Lainnya')
})

await test('cadangan datasource.raw.shop / amenity dipakai bila kategori kosong', () => {
  assert.equal(mapCategoryToJenis(undefined, 'shop=bakery'), 'Kue dan roti')
  assert.equal(mapCategoryToJenis(undefined, 'amenity=restaurant'), 'Warung makan')
  assert.equal(mapCategoryToJenis(undefined, 'amenity=cafe'), 'Kedai kopi')
  assert.equal(mapCategoryToJenis(undefined, 'shop=convenience'), 'Toko kelontong')
  assert.equal(mapCategoryToJenis(undefined, 'shop=clothes'), 'Toko pakaian/kriya')
})

// Kasus nyata dari data Padang: kategori yang tidak tertangkap aturan awalan.
await test('catering.ice_cream (pedagang es krim) -> Warung makan', () => {
  assert.equal(mapCategoryToJenis('catering', 'catering.ice_cream'), 'Warung makan')
  assert.equal(mapCategoryToJenis(undefined, 'amenity=ice_cream'), 'Warung makan')
})

await test('commercial.kiosk (warung/kios kecil) -> Toko kelontong', () => {
  assert.equal(mapCategoryToJenis('commercial', 'commercial.kiosk', 'shop=kiosk'), 'Toko kelontong')
})

await test('aturan shop= persis: computer tidak tertangkap aturan convenience', () => {
  // `shop=computer` mengandung "convenience"? Tidak, tapi ini mengunci bahwa
  // pencocokan `shop=` harus persis, bukan substring.
  assert.equal(mapCategoryToJenis('commercial', 'commercial.elektronics', 'shop=computer'), 'Lainnya')
})

await test('label kategori selalu Bahasa Indonesia', () => {
  assert.equal(categoryLabelFor('Warung makan'), 'Warung makan')
  assert.equal(categoryLabelFor('Lainnya'), 'Usaha lokal')
})

/* ================================================================== */
/* 2. Penyaringan hasil                                               */
/* ================================================================== */

section('2. Penyaringan hasil pencarian')

function feature(props: Record<string, any>, coords: number[] = [100.35, -0.94]) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props }
}

await test('entri dengan brand dibuang (Indomaret)', () => {
  assert.equal(
    normalizeFeature(feature({ name: 'Indomaret', brand: 'Indomaret', categories: ['commercial.convenience'] })),
    null,
  )
})

await test('entri dengan brand:wikidata dibuang', () => {
  assert.equal(
    normalizeFeature(
      feature({ name: 'Toko Sejahtera', 'brand:wikidata': 'Q1', categories: ['commercial.convenience'] }),
    ),
    null,
  )
})

await test('nama jaringan besar dibuang walau tanpa tag brand', () => {
  for (const name of ['Alfamart', 'Alfamidi', 'SUPERINDO', 'Indomaret Point']) {
    assert.equal(
      normalizeFeature(feature({ name, categories: ['commercial.convenience'] })),
      null,
      `${name} seharusnya dibuang`,
    )
  }
})

await test('commercial.shopping_mall dibuang', () => {
  assert.equal(normalizeFeature(feature({ name: 'Plaza Andalas', categories: ['commercial.shopping_mall'] })), null)
})

await test('commercial.supermarket dibuang', () => {
  assert.equal(normalizeFeature(feature({ name: 'Toko Besar', categories: ['commercial.supermarket'] })), null)
})

await test('warung lokal tetap lolos dan dinormalisasi', () => {
  const item = normalizeFeature(
    feature({
      name: 'Warung Makan Pak Budi',
      categories: ['catering.restaurant.indonesian'],
      address_line1: 'Jl. Pasar Raya No. 12',
      city: 'Padang',
      opening_hours: 'Mo-Su 08:00-21:00',
      contact: { phone: '+62 751 123456' },
      place_id: 'p-123',
    }),
  )
  assert.ok(item, 'warung lokal seharusnya lolos')
  assert.equal(item!.name, 'Warung Makan Pak Budi')
  assert.equal(item!.jenisUsaha, 'Warung makan')
  assert.equal(item!.categoryLabel, 'Warung makan')
  assert.equal(item!.openingHours, 'Mo-Su 08:00-21:00')
  assert.equal(item!.phone, '+62 751 123456')
  assert.equal(item!.id, 'p-123')
  assert.ok(item!.address.includes('Jl. Pasar Raya No. 12'))
  assert.ok(item!.address.includes('Padang'))
})

await test('toko roti nyata (commercial.food_and_drink.bakery) lolos sebagai Kue dan roti', () => {
  const item = normalizeFeature(
    feature({ name: 'Roti Canai Uni', categories: ['commercial.food_and_drink.bakery'], city: 'Padang' }),
  )
  assert.ok(item)
  assert.equal(item!.jenisUsaha, 'Kue dan roti')
  assert.equal(item!.categoryLabel, 'Kue dan roti')
})

await test('entri tanpa nama dibuang', () => {
  assert.equal(normalizeFeature(feature({ categories: ['catering.cafe'] })), null)
})

await test('jenis usaha non-UMKM dibuang (dealer mobil, bengkel, salon)', () => {
  for (const shop of ['car', 'motorcycle_repair', 'hairdresser', 'computer', 'electronics', 'laundry']) {
    assert.equal(
      normalizeFeature(
        feature({ name: `Usaha ${shop}`, categories: ['commercial'], datasource: { raw: { shop } } }),
      ),
      null,
      `shop=${shop} seharusnya dibuang`,
    )
  }
})

await test('alamat tidak mengulang nama usaha', () => {
  const item = normalizeFeature(
    feature({
      name: 'Bali Haritage',
      categories: ['commercial', 'service.beauty'],
      address_line1: 'Bali Haritage',
      street: 'Jalan Veteran',
      city: 'Padang',
      state: 'Sumatera Barat',
    }),
  )
  // Entri salon tetap dibuang; uji fungsi alamat lewat warung.
  assert.equal(item, null)

  const warung = normalizeFeature(
    feature({
      name: 'Warung Lotek',
      categories: ['commercial', 'commercial.kiosk'],
      datasource: { raw: { shop: 'kiosk' } },
      address_line1: 'Warung Lotek',
      street: 'Gang Purus III',
      city: 'Padang',
      state: 'Sumatera Barat',
    }),
  )
  assert.ok(warung)
  assert.ok(!warung!.address.startsWith('Warung Lotek'), 'alamat tidak boleh mengulang nama usaha')
  assert.ok(warung!.address.includes('Gang Purus III'), 'alamat harus memakai nama jalan')
})

await test('koordinat dinormalkan sebagai lat/lon (bukan lon/lat)', () => {
  const item = normalizeFeature(feature({ name: 'Kafe Uji', categories: ['catering.cafe'] }, [100.36, -0.95]))
  assert.equal(item!.lat, -0.95)
  assert.equal(item!.lon, 100.36)
})

/* ================================================================== */
/* 3. Handler: kunci hilang, pusat default, cache, rate limit         */
/* ================================================================== */

section('3. Handler /api/places')

await test('tanpa API key -> 503 NO_MAPS_KEY dan mengarahkan ke input manual', async () => {
  _clearPlacesCache()
  const res = await handlePlacesRequest({}, { apiKey: '' })
  assert.equal(res.status, 503)
  assert.equal(res.body.error, 'NO_MAPS_KEY')
  assert.match(res.body.message || '', /manual/i)
})

await test('tanpa koordinat pengguna -> pusat default Padang', async () => {
  const res = await handlePlacesRequest({ radiusKm: 3 }, { apiKey: '' })
  assert.equal(res.status, 503)
  assert.equal(res.body.center!.source, 'default')
  assert.equal(res.body.center!.lat, DEFAULT_CENTER.lat)
  assert.equal(res.body.center!.lon, DEFAULT_CENTER.lon)
})

await test('dengan koordinat pengguna -> center.source = user', async () => {
  const res = await handlePlacesRequest({ lat: -0.9, lon: 100.4 }, { apiKey: '' })
  assert.equal(res.body.center!.source, 'user')
})

await test('koordinat tidak valid -> jatuh ke pusat default', async () => {
  const res = await handlePlacesRequest({ lat: 999, lon: 999 }, { apiKey: '' })
  assert.equal(res.body.center!.source, 'default')
})

await test('radius dikunci pada 1..5 km', async () => {
  assert.equal((await handlePlacesRequest({ radiusKm: 99 }, { apiKey: '' })).body.radiusKm, 5)
  assert.equal((await handlePlacesRequest({ radiusKm: -3 }, { apiKey: '' })).body.radiusKm, 1)
  assert.equal((await handlePlacesRequest({ radiusKm: 3.4 }, { apiKey: '' })).body.radiusKm, 3)
})

await test('cache: panggilan kedua dengan koordinat sama tidak menambah entri', async () => {
  _clearPlacesCache()
  resetRateLimit()

  // Tanpa kunci, hasil tidak di-cache (tidak ada data untuk disimpan).
  // Uji cache lewat dua panggilan yang sama dengan kunci palsu + fetch tiruan.
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(
      JSON.stringify({
        features: [feature({ name: 'Warung Uji Cache', categories: ['catering.restaurant'], place_id: 'c1' })],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const a = await handlePlacesRequest({ lat: -0.9471, lon: 100.3543, radiusKm: 3 }, { apiKey: 'dummy' })
    const b = await handlePlacesRequest({ lat: -0.94712, lon: 100.35431, radiusKm: 3 }, { apiKey: 'dummy' })

    assert.equal(a.status, 200)
    assert.equal(b.status, 200)
    assert.equal(calls, 1, 'fetch seharusnya hanya dipanggil sekali karena cache')
    assert.equal(a.body.results!.length, 1)
    assert.equal(b.body.results![0].name, 'Warung Uji Cache')
    assert.equal(_placesCacheSize(), 1)
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('cache: radius berbeda memakai entri berbeda', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(JSON.stringify({ features: [] }), { status: 200 })
  }) as typeof fetch
  try {
    await handlePlacesRequest({ lat: -0.94, lon: 100.35, radiusKm: 2 }, { apiKey: 'dummy' })
    await handlePlacesRequest({ lat: -0.94, lon: 100.35, radiusKm: 4 }, { apiKey: 'dummy' })
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('cache kedaluwarsa setelah 10 menit', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(JSON.stringify({ features: [] }), { status: 200 })
  }) as typeof fetch
  const t0 = Date.now()
  try {
    await handlePlacesRequest({ lat: -0.94, lon: 100.35, radiusKm: 3 }, { apiKey: 'dummy', now: t0 })
    await handlePlacesRequest({ lat: -0.94, lon: 100.35, radiusKm: 3 }, { apiKey: 'dummy', now: t0 + 9 * 60 * 1000 })
    assert.equal(calls, 1, 'masih dalam 10 menit: cache dipakai')
    await handlePlacesRequest({ lat: -0.94, lon: 100.35, radiusKm: 3 }, { apiKey: 'dummy', now: t0 + 11 * 60 * 1000 })
    assert.equal(calls, 2, 'lewat 10 menit: cache kedaluwarsa')
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('kegagalan upstream -> 502 dengan pesan ramah', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('rate limited', { status: 429 })) as typeof fetch
  try {
    const res = await handlePlacesRequest({ lat: -0.94, lon: 100.35 }, { apiKey: 'dummy' })
    assert.equal(res.status, 502)
    assert.equal(res.body.error, 'PLACES_UPSTREAM')
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('fetch melempar error -> 502 PLACES_UNREACHABLE', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as typeof fetch
  try {
    const res = await handlePlacesRequest({ lat: -1.1, lon: 100.4 }, { apiKey: 'dummy' })
    assert.equal(res.status, 502)
    assert.equal(res.body.error, 'PLACES_UNREACHABLE')
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('hasil diurutkan stabil menurut nama', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        features: [
          feature({ name: 'Zahra Cafe', categories: ['catering.cafe'], place_id: 'z' }),
          feature({ name: 'Aneka Roti', categories: ['commercial.food_and_drink.bakery'], place_id: 'a' }),
          feature({ name: 'Mie Ayam Pak Ali', categories: ['catering.restaurant'], place_id: 'm' }),
        ],
      }),
      { status: 200 },
    )) as typeof fetch
  try {
    const res = await handlePlacesRequest({ lat: -0.9, lon: 100.3, radiusKm: 2 }, { apiKey: 'dummy' })
    const names = res.body.results!.map((r) => r.name)
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'id')))
    assert.equal(names[0], 'Aneka Roti')
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

await test('hasil duplikat (nama+alamat sama) dibuang', async () => {
  _clearPlacesCache()
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        features: [
          feature({ name: 'Kafe Sama', categories: ['catering.cafe'], address_line1: 'Jl. A', place_id: '1' }),
          feature({ name: 'Kafe Sama', categories: ['catering.cafe'], address_line1: 'Jl. A', place_id: '2' }),
        ],
      }),
      { status: 200 },
    )) as typeof fetch
  try {
    const res = await handlePlacesRequest({ lat: -0.9, lon: 100.3 }, { apiKey: 'dummy' })
    assert.equal(res.body.results!.length, 1)
  } finally {
    globalThis.fetch = realFetch
    _clearPlacesCache()
  }
})

section('4. Pembatas laju per IP')

await test('20 permintaan diizinkan, ke-21 ditolak', () => {
  resetRateLimit()
  const ip = '10.0.0.9'
  const t = Date.now()
  for (let i = 0; i < 20; i++) {
    assert.equal(checkRateLimit(ip, t + i), true, `permintaan ke-${i + 1} seharusnya diizinkan`)
  }
  assert.equal(checkRateLimit(ip, t + 20), false, 'permintaan ke-21 seharusnya ditolak')
})

await test('IP lain tidak terpengaruh', () => {
  resetRateLimit()
  const t = Date.now()
  for (let i = 0; i < 20; i++) checkRateLimit('10.0.0.1', t)
  assert.equal(checkRateLimit('10.0.0.2', t), true)
})

await test('jendela 1 menit: permintaan lama tidak lagi dihitung', () => {
  resetRateLimit()
  const ip = '10.0.0.3'
  const t = Date.now()
  for (let i = 0; i < 20; i++) checkRateLimit(ip, t)
  assert.equal(checkRateLimit(ip, t + 30 * 1000), false)
  assert.equal(checkRateLimit(ip, t + 61 * 1000), true, 'setelah 1 menit kuota pulih')
})

await test('handler mengembalikan 429 saat kuota habis', async () => {
  resetRateLimit()
  const ip = '10.9.9.9'
  const t = Date.now()
  for (let i = 0; i < 20; i++) checkRateLimit(ip, t)
  const res = await handlePlacesRequest({}, { apiKey: '', ip, now: t + 10 })
  assert.equal(res.status, 429)
  assert.equal(res.body.error, 'RATE_LIMITED')
})

/* ================================================================== */
/* 5. Validasi JSON misi                                              */
/* ================================================================== */

section('5. Validasi JSON misi dari LLM')

const validMission = {
  ringkasan: 'Membantu merapikan promosi harian.',
  target: 'Tiga materi promosi siap pakai dalam tiga hari.',
  skills: ['Menulis caption', 'Foto produk', 'Komunikasi'],
  durasi: '3 hari, sekitar 6 jam',
  jam: 6,
  kesulitan: 'Mudah',
  asumsi: ['Pemilik punya ponsel dengan kamera'],
  roadmap: [
    {
      title: 'Temui pemilik dan minta izin',
      goal: 'Meminta izin lalu mewawancarai pemilik soal masalahnya.',
      tasks: ['Minta izin', 'Wawancarai pemilik', 'Catat temuan'],
      mentorOpening: 'Apa hal pertama yang ingin diubah pemilik?',
    },
    {
      title: 'Susun rencana',
      goal: 'Menyusun jadwal satu minggu.',
      tasks: ['Tentukan 3 tema', 'Isi jadwal'],
      mentorOpening: 'Tema apa yang paling mudah?',
    },
    {
      title: 'Buat contoh',
      goal: 'Membuat tiga contoh materi.',
      tasks: ['Buat caption', 'Tunjukkan ke pemilik'],
      mentorOpening: 'Apa yang ingin dirasakan pembaca?',
    },
  ],
}

await test('misi valid diterima', () => {
  const m = validateMissionJson(validMission)
  assert.ok(m)
  assert.equal(m!.roadmap.length, 3)
  assert.equal(m!.roadmap[0].id, 's1')
  assert.equal(m!.roadmap[2].id, 's3')
  assert.equal(m!.kesulitan, 'Mudah')
  assert.equal(m!.jam, 6)
  assert.deepEqual(m!.skills, ['Menulis caption', 'Foto produk', 'Komunikasi'])
})

await test('langkah pertama tanpa "izin" ditolak', () => {
  const bad = structuredClone(validMission)
  bad.roadmap[0].title = 'Mulai bekerja'
  bad.roadmap[0].goal = 'Langsung mengerjakan semuanya.'
  bad.roadmap[0].tasks = ['Buka laptop', 'Tulis']
  assert.equal(validateMissionJson(bad), null)
})

await test('langkah pertama tanpa kata wawancara ditemui ditolak', () => {
  const bad = structuredClone(validMission)
  bad.roadmap[0].title = 'Minta izin pemilik'
  bad.roadmap[0].goal = 'Meminta izin untuk membantu.'
  bad.roadmap[0].tasks = ['Minta izin', 'Catat']
  assert.equal(validateMissionJson(bad), null)
})

await test('roadmap kurang dari 3 langkah ditolak', () => {
  const bad = structuredClone(validMission)
  bad.roadmap = bad.roadmap.slice(0, 2)
  assert.equal(validateMissionJson(bad), null)
})

await test('tanpa skills ditolak', () => {
  const bad = structuredClone(validMission)
  bad.skills = []
  assert.equal(validateMissionJson(bad), null)
})

await test('tanpa ringkasan atau target ditolak', () => {
  assert.equal(validateMissionJson({ ...validMission, ringkasan: '' }), null)
  assert.equal(validateMissionJson({ ...validMission, target: '' }), null)
})

await test('bukan objek / null ditolak', () => {
  assert.equal(validateMissionJson(null), null)
  assert.equal(validateMissionJson('teks bebas'), null)
  assert.equal(validateMissionJson(42), null)
})

await test('nilai tak dikenal dinormalkan, bukan menggagalkan', () => {
  const m = validateMissionJson({ ...validMission, kesulitan: 'Sangat sulit', jam: 999 })
  assert.ok(m)
  assert.equal(m!.kesulitan, 'Sedang', 'kesulitan tak dikenal -> Sedang')
  assert.equal(m!.jam, 40, 'jam dibatasi maksimal 40')
})

await test('roadmap lebih dari 3 langkah dipotong menjadi 3', () => {
  const m = validateMissionJson({
    ...validMission,
    roadmap: [...validMission.roadmap, { title: 'Ekstra', goal: 'x', tasks: ['y'], mentorOpening: 'z' }],
  })
  assert.equal(m!.roadmap.length, 3)
})

/* ================================================================== */
/* 6. Template cadangan                                               */
/* ================================================================== */

section('6. Template cadangan')

await test('ada empat template dan semuanya punya 3 langkah', () => {
  assert.equal(missionTemplates.length, 4)
  for (const t of missionTemplates) {
    assert.equal(t.roadmap.length, 3, `${t.key} harus punya 3 langkah`)
    assert.equal(t.roadmap[0].id, 's1')
  }
})

await test('langkah pertama setiap template menyebut izin dan wawancara', () => {
  for (const t of missionTemplates) {
    const step1 = t.roadmap[0]
    const text = `${step1.title} ${step1.goal} ${step1.tasks.join(' ')}`.toLowerCase()
    assert.match(text, /izin/, `${t.key}: langkah pertama harus menyebut izin`)
    assert.match(text, /wawancar/, `${t.key}: langkah pertama harus menyebut wawancara`)
  }
})

await test('template tidak mengandung nama usaha bawaan', () => {
  const forbidden = ['warung bu sari', 'bu sari', 'kopi tetangga', 'batik ibu lastri', 'ibu lastri', 'arif']
  for (const t of missionTemplates) {
    const text = JSON.stringify(t).toLowerCase()
    for (const f of forbidden) {
      assert.ok(!text.includes(f), `template ${t.key} mengandung "${f}"`)
    }
  }
})

await test('template dipilih sesuai jenis usaha', () => {
  assert.equal(templateForJenis('Warung makan').key, 'konten')
  assert.equal(templateForJenis('Kedai kopi').key, 'konten')
  assert.equal(templateForJenis('Kue dan roti').key, 'konten')
  assert.equal(templateForJenis('Toko kelontong').key, 'data')
  assert.equal(templateForJenis('Jasa katering').key, 'data')
  assert.equal(templateForJenis('Toko pakaian/kriya').key, 'visual')
  assert.equal(templateForJenis('Lainnya').key, 'umum')
  assert.equal(templateForJenis('Usaha cuci motor').key, 'umum')
})

await test('fillTemplate mengganti placeholder', () => {
  const out = fillTemplate('{{usaha}} di {{lokasi}} ({{jenis}})', {
    usaha: 'Warung Pak Budi',
    lokasi: 'Padang',
    jenis: 'Warung makan',
  })
  assert.equal(out, 'Warung Pak Budi di Padang (Warung makan)')
  assert.ok(!out.includes('{{'))
})

/* ================================================================== */

console.log(`\n${'-'.repeat(58)}`)
console.log(`Lulus: ${pass}   Gagal: ${fail}`)
if (fail > 0) {
  console.log('Yang gagal:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('Semua tes Tahap (a) lulus.')
