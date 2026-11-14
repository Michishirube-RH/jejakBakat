import type { JenisUsaha, PlaceResult } from '../src/data/umkmTypes'

/**
 * Handler untuk POST /api/places.
 *
 * Memanggil Geoapify Places API dari sisi server sehingga GEOAPIFY_API_KEY
 * tidak pernah sampai ke browser. Hasil disaring agar hanya menampilkan usaha
 * lokal (bukan jaringan besar), lalu dinormalisasi ke bentuk ringkas.
 */

export interface PlacesRequest {
  lat?: number
  lon?: number
  radiusKm?: number
}

export type { PlaceResult }

export interface PlacesResponse {
  status: number
  /** Header respons tambahan, misalnya Retry-After saat kena batas laju. */
  headers?: Record<string, string>
  body: {
    results?: PlaceResult[]
    center?: { lat: number; lon: number; source: 'user' | 'default' }
    radiusKm?: number
    error?: string
    message?: string
    detail?: string
  }
}

/** Pusat pencarian cadangan: Padang. */
export const DEFAULT_CENTER = { lat: -0.9471, lon: 100.3543 }

export const RADIUS_MIN_KM = 1
export const RADIUS_MAX_KM = 5
const LIMIT = 50
const CATEGORIES = 'catering,commercial'

/**
 * Jaringan besar yang tidak boleh muncul: skala nasional atau internasional,
 * bukan UMKM. Ditulis tanpa spasi/tanda baca karena pembandingnya sudah
 * dinormalkan lebih dulu (huruf kecil, hanya a-z dan 0-9).
 *
 * Catatan: jangan menambahkan kata umum seperti "toko mas" atau "musik" —
 * toko emas dan toko musik lokal justru sasaran yang sah.
 */
const CHAIN_PATTERNS = [
  'indomaret',
  'alfamart',
  'alfamidi',
  'alfaria',
  'minimarket',
  'circlek',
  'lawson',
  'familymart',
  '7eleven',
  'seveneleven',
  'superindo',
  'hypermart',
  'carrefour',
  'transmart',
  'ramayana',
  'matahari',
  'alfacart',
  'indogrosir',
  'yogyagroup',
  'harihari',
  'tiptop',
  'jco',
  'dunkin',
  'starbucks',
  'kfc',
  'mcdonald',
  'burgerking',
  'pizzahut',
  'domino',
  'mixue',
  'chatime',
  'richie',
  'breadtalk',
  'sariroti',
  'toplaundry',
  'enzo',
  'kevinlaundry',
  // Jaringan cepat saji & restoran waralaba nasional
  'cfc',
  'californiafriedchicken',
  'hokben',
  'hokahokabento',
  'pizzaexpress',
  'richeese',
  'richeesefactory',
  'marugame',
  'marugameudon',
  'yoshinoya',
  'wendys',
  'subway',
  'pepperlunch',
  'ichiban',
  'ichibansushi',
  'bakmigm',
  'dcost',
  'shihlin',
  'wingstop',
  'tawan',
  'mujigae',
  'kintan',
  'shaburi',
  'awrestoran',
  'aandw',
  // Kedai kopi & toko roti jaringan
  'kopikenangan',
  'janjijiwa',
  'forecoffee',
  'pointcoffee',
  'tomorocoffee',
  'hollandbakery',
  'rotio',
  'rotiboy',
  'touslesjours',
  'breadlife',
  // Jaringan ritel, elektronik, dan mode.
  'gramedia',
  'gunungagung',
  'eiger',
  'erafone',
  'informa',
  'acehardware',
  'gokana',
  'solaria',
  'planetsports',
  'zara',
  'hm',
  'uniqlo',
  'miniso',
  'mrdiy',
  'guardian',
  'watsons',
  'century',
]

/**
 * Menormalkan nama untuk perbandingan jaringan: huruf kecil, tanpa tanda
 * baca, tanpa spasi. "McDonald's" -> "mcdonalds", "H&M" -> "hm",
 * "7-Eleven" -> "7eleven".
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

const CHAIN_PATTERN_SET = new Set(CHAIN_PATTERNS.map(normalizeName))

/** "H&M" -> "hm" terlalu pendek untuk pencocokan substring yang aman. */
const MIN_SUBSTRING_LEN = 3

/**
 * Mengembalikan true bila nama cocok dengan jaringan besar.
 *
 * Pencocokan memakai dua cara agar nama bervariasi tetap tertangkap
 * ("KFC Amacang", "Restoran McDonald's", "Gramedia Padang"):
 * - nama ternormalisasi sama persis dengan pola, atau
 * - nama ternormalisasi mengawali/mengakhiri/mengandung pola yang cukup
 *   panjang. Pola pendek ("hm") hanya dicocokkan persis agar tidak
 *   salah menandai nama lokal.
 */
export function isChain(name: string): boolean {
  const n = normalizeName(name)
  if (!n) return false
  if (CHAIN_PATTERN_SET.has(n)) return true

  for (const p of CHAIN_PATTERN_SET) {
    if (p.length < MIN_SUBSTRING_LEN) continue
    if (n.startsWith(p) || n.endsWith(p) || n.includes(p)) return true
  }
  return false
}

/** Kategori yang selalu dibuang. */
const EXCLUDED_CATEGORIES = ['commercial.shopping_mall', 'commercial.supermarket']

/**
 * Kategori Geoapify yang bukan usaha yang cocok untuk misi UMKM mahasiswa.
 * Dipakai sebagai cadangan bila `datasource.raw` tidak menyertakan tag OSM.
 */
const EXCLUDED_CATEGORY_PREFIXES = [
  'service.beauty',
  'service.vehicle',
  'commercial.elektronics',
  'commercial.hardware',
  'commercial.houseware',
  'commercial.pharmacy',
  'commercial.health_and_beauty',
  'commercial.medical',
  'commercial.fuel',
  'commercial.energy',
  'commercial.vehicle',
  'commercial.financial',
  'commercial.real_estate',
  'commercial.insurance',
  'commercial.education',
  'commercial.bank',
  'commercial.laundry',
  'commercial.dry_cleaning',
]

/**
 * Jenis usaha yang tidak cocok untuk misi UMKM mahasiswa (dealer mobil,
 * bengkel, salon, toko elektronik/komputer). Data OpenStreetMap di Indonesia
 * banyak berisi entri seperti ini di area komersial, dan akan mengacaukan
 * daftar pilihan. Dicocokkan persis pada nilai `raw.shop`/`raw.amenity`.
 */
const EXCLUDED_RAW_SHOPS = new Set([
  'car',
  'car_repair',
  'car_parts',
  'motorcycle',
  'motorcycle_repair',
  'motorcycle_parts',
  'bicycle',
  'hairdresser',
  'beauty',
  'electronics',
  'computer',
  'mobile_phone',
  'hardware',
  'doityourself',
  'laundry',
  'dry_cleaning',
  'travel_agency',
  'estate_agent',
  'bank',
  'money_lender',
  'fuel',
  'pharmacy',
  'chemist',
  'medical_supply',
  'optician',
  'hearing_aids',
  'funeral_directors',
  'caravan',
  'tyres',
  'paint',
  'glaziery',
])

function isExcludedByRawType(props: Record<string, any>): boolean {
  const raw = props.datasource?.raw || {}
  const shop = String(raw.shop || '').toLowerCase()
  const amenity = String(raw.amenity || '').toLowerCase()
  const craft = String(raw.craft || '').toLowerCase()
  return EXCLUDED_RAW_SHOPS.has(shop) || EXCLUDED_RAW_SHOPS.has(amenity) || EXCLUDED_RAW_SHOPS.has(craft)
}

function isExcludedByCategory(props: Record<string, any>): boolean {
  const cats = [props.categories, props.category]
    .flat()
    .filter(Boolean)
    .map((c: string) => String(c).toLowerCase())

  return cats.some(
    (c) =>
      EXCLUDED_CATEGORIES.some((ex) => c === ex || c.startsWith(ex + '.')) ||
      EXCLUDED_CATEGORY_PREFIXES.some((ex) => c === ex || c.startsWith(ex + '.')),
  )
}

/**
 * Memetakan kategori Geoapify ke chip jenis usaha.
 *
 * Memakai pencocokan awalan / substring karena Geoapify memakai dimensi
 * kategori yang bisa lebih dalam dari perkiraan (misalnya toko roti muncul
 * sebagai `commercial.food_and_drink.bakery`, bukan `catering.bakery`).
 * Bila kategori tidak dikenali, dicoba dari `datasource.raw.shop` dan
 * `datasource.raw.amenity` sebelum jatuh ke 'Lainnya'.
 */
export function mapCategoryToJenis(...categories: (string | undefined | null)[]): JenisUsaha {
  const list = categories
    .filter(Boolean)
    .flatMap((c) => String(c).toLowerCase().split(','))
    .map((c) => c.trim())
    .filter(Boolean)

  const has = (frag: string) => list.some((c) => c.includes(frag))

  // Kue dan roti didahulukan: `commercial.food_and_drink.bakery` tidak boleh
  // tertangkap aturan restoran.
  if (has('bakery') || has('cake') || has('pastry') || has('donut')) return 'Kue dan roti'

  if (list.some((c) => c.startsWith('catering.restaurant') || c.startsWith('catering.fast_food')))
    return 'Warung makan'
  if (list.some((c) => c.startsWith('catering.cafe'))) return 'Kedai kopi'
  // Pedagang makanan kecil (es krim, camilan jalanan) tetap warung makan.
  if (has('ice_cream') || has('catering.food_court') || has('catering.food_and_drink'))
    return 'Warung makan'
  if (list.some((c) => c.startsWith('commercial.convenience') || c.startsWith('commercial.greengrocer')))
    return 'Toko kelontong'
  if (list.some((c) => c.startsWith('catering.catering'))) return 'Jasa katering'
  if (list.some((c) => c.startsWith('commercial.clothing') || c.startsWith('commercial.art_and_craft')))
    return 'Toko pakaian/kriya'

  // Cadangan dari datasource mentah OpenStreetMap. Dicocokkan per nilai
  // persis agar `shop=computer` tidak tertangkap oleh aturan `shop=convenience`.
  const rawValues = list.filter((c) => c.includes('='))
  const rawIs = (...vals: string[]) => rawValues.some((c) => vals.includes(c))
  if (rawIs('shop=bakery', 'shop=confectionery', 'shop=pastry')) return 'Kue dan roti'
  if (rawIs('amenity=restaurant', 'amenity=fast_food', 'amenity=food_court')) return 'Warung makan'
  if (rawIs('amenity=cafe', 'amenity=coffee_shop')) return 'Kedai kopi'
  if (rawIs('amenity=ice_cream')) return 'Warung makan'
  if (rawIs('shop=convenience', 'shop=greengrocer', 'shop=kiosk', 'shop=general')) return 'Toko kelontong'
  if (rawIs('shop=clothes', 'shop=boutique', 'shop=fashion', 'shop=art', 'shop=craft', 'shop=gift'))
    return 'Toko pakaian/kriya'

  return 'Lainnya'
}

/** Label kategori Bahasa Indonesia untuk ditampilkan di kartu. */
const CATEGORY_LABELS: Record<JenisUsaha, string> = {
  'Warung makan': 'Warung makan',
  'Kedai kopi': 'Kedai kopi',
  'Kue dan roti': 'Kue dan roti',
  'Toko kelontong': 'Toko kelontong',
  'Jasa katering': 'Jasa katering',
  'Toko pakaian/kriya': 'Toko pakaian dan kriya',
  Lainnya: 'Usaha lokal',
}

export function categoryLabelFor(jenis: JenisUsaha): string {
  return CATEGORY_LABELS[jenis] ?? 'Usaha lokal'
}

/** Menyusun alamat ringkas dari properti Geoapify. */
function buildAddress(props: Record<string, any>): string {
  const name = String(props.name || '').trim().toLowerCase()
  const street = String(props.street || '').trim()
  const line1 = String(props.address_line1 || '').trim()
  // Geoapify kadang mengisi address_line1 dengan nama tempat itu sendiri.
  // Bila begitu, pakai `street` supaya alamat tidak mengulang nama usaha.
  const first = !line1 || line1.toLowerCase() === name ? street : line1

  const parts = [
    first
      ? props.housenumber
        ? `${first} No. ${props.housenumber}`
        : first
      : '',
    props.suburb || props.district,
    props.city || props.town || props.village,
  ]
    .filter(Boolean)
    .map((p: any) => String(p).trim())
    .filter((p, i, arr) => p && arr.indexOf(p) === i)

  if (parts.length > 0) {
    const joined = parts.join(', ')
    if (props.state && !joined.includes(String(props.state))) {
      return `${joined}, ${props.state}`.slice(0, 160)
    }
    return joined.slice(0, 160)
  }
  if (props.formatted) return String(props.formatted).slice(0, 160)
  return ''
}

/** Skor kelengkapan data, dipakai memilih entri terbaik saat ada duplikat. */
function richness(item: PlaceResult): number {
  return (
    (item.address ? 2 : 0) +
    (item.phone ? 3 : 0) +
    (item.openingHours ? 2 : 0) +
    (item.lat != null && item.lon != null ? 1 : 0)
  )
}

/**
 * Menormalkan satu fitur Geoapify. Mengembalikan null bila harus dibuang.
 * Diekspor agar bisa diuji tanpa memanggil jaringan.
 */
export function normalizeFeature(feature: any): PlaceResult | null {
  const props = feature?.properties
  if (!props) return null

  const name = String(props.name || props.address_line1 || '').trim()
  if (!name) return null

  // Buang entri yang punya penanda jaringan.
  if (props.brand || props['brand:wikidata'] || props['brand:wikipedia']) return null
  if (isChain(name)) return null
  if (isExcludedByCategory(props)) return null
  if (isExcludedByRawType(props)) return null

  const rawShop = props.datasource?.raw?.shop
  const rawAmenity = props.datasource?.raw?.amenity

  const jenisUsaha = mapCategoryToJenis(
    props.categories,
    props.category,
    rawShop ? `shop=${rawShop}` : undefined,
    rawAmenity ? `amenity=${rawAmenity}` : undefined,
  )

  const [lon, lat] = Array.isArray(feature.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [undefined, undefined]

  return {
    id: String(props.place_id || feature.id || `${name}-${lat}-${lon}`),
    name: name.slice(0, 80),
    categoryLabel: categoryLabelFor(jenisUsaha),
    jenisUsaha,
    address: buildAddress(props),
    openingHours: props.opening_hours ? String(props.opening_hours).slice(0, 120) : undefined,
    phone: props.contact?.phone || props.phone || undefined,
    lat: typeof lat === 'number' ? lat : undefined,
    lon: typeof lon === 'number' ? lon : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Cache dalam memori 10 menit                                         */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 10 * 60 * 1000
interface CacheEntry { at: number; results: PlaceResult[] }
const globalObj = globalThis as any
const cache: Map<string, CacheEntry> = (globalObj.__placesCache = globalObj.__placesCache || new Map<string, CacheEntry>())

function cacheKey(lat: number, lon: number, radiusKm: number): string {
  // Lokasi kasar: tiga angka desimal (~110 m) agar cache tetap terpakai
  // walau koordinat GPS sedikit berubah.
  return `${lat.toFixed(3)}|${lon.toFixed(3)}|${radiusKm}|${CATEGORIES}`
}

export function _clearPlacesCache() {
  cache.clear()
}

export function _placesCacheSize() {
  return cache.size
}

/* ------------------------------------------------------------------ */
/* Pembatas laju sederhana per IP                                      */
/* ------------------------------------------------------------------ */

/**
 * Batas pencarian per IP per menit.
 *
 * Angka ini melindungi kuota Geoapify, bukan membatasi pemakaian wajar:
 * pemilihan UMKM biasanya hanya butuh 2-3 pencarian. 60 memberi ruang
 * untuk mengulang alur (misalnya saat merekam demo) tanpa menghabiskan kuota.
 */
export const RATE_LIMIT = 60
export const RATE_WINDOW_MS = 60 * 1000
const hits: Map<string, number[]> = (globalObj.__placesHits = globalObj.__placesHits || new Map<string, number[]>())

/** Mengembalikan true bila permintaan masih diizinkan. */
export function checkRateLimit(ip: string, now = Date.now()): boolean {
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list)
    return false
  }
  list.push(now)
  hits.set(ip, list)
  return true
}

export function resetRateLimit(ip?: string) {
  if (ip) hits.delete(ip)
  else hits.clear()
}

/**
 * Sisa detik sampai jatah IP ini terbuka lagi.
 * Dipakai untuk header Retry-After agar UI bisa menghitung mundur dengan tepat.
 */
export function retryAfterSec(ip: string, now = Date.now()): number {
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length === 0) return 0
  // Jatah terbuka saat hit tertua keluar dari jendela waktu.
  const oldest = Math.min(...list)
  return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000))
}

/* ------------------------------------------------------------------ */
/* Handler utama                                                       */
/* ------------------------------------------------------------------ */

function clampRadius(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return RADIUS_MIN_KM
  return Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, Math.round(n)))
}

function validCoord(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  )
}

export async function handlePlacesRequest(
  req: PlacesRequest,
  opts: { apiKey?: string; ip?: string; now?: number } = {},
): Promise<PlacesResponse> {
  const apiKey = opts.apiKey ?? process.env.GEOAPIFY_API_KEY
  const now = opts.now ?? Date.now()

  if ((req as any)?._resetRateLimit) {
    resetRateLimit(opts.ip)
  }

  if (opts.ip && !checkRateLimit(opts.ip, now)) {
    return {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec(opts.ip, now)) },
      body: { error: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
    }
  }

  const radiusKm = clampRadius(req?.radiusKm)

  const hasUserLoc = validCoord(req?.lat, req?.lon)
  const lat = hasUserLoc ? (req.lat as number) : DEFAULT_CENTER.lat
  const lon = hasUserLoc ? (req.lon as number) : DEFAULT_CENTER.lon
  const source: 'user' | 'default' = hasUserLoc ? 'user' : 'default'

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: 'NO_MAPS_KEY',
        message: 'Pencarian lokasi belum dikonfigurasi. Tambahkan usaha secara manual.',
        center: { lat, lon, source },
        radiusKm,
      },
    }
  }

  const key = cacheKey(lat, lon, radiusKm)
  const cached = cache.get(key)
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return {
      status: 200,
      body: { results: cached.results, center: { lat, lon, source }, radiusKm },
    }
  }

  const params = new URLSearchParams({
    categories: CATEGORIES,
    filter: `circle:${lon},${lat},${radiusKm * 1000}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(LIMIT),
    lang: 'id',
    apiKey,
  })

  try {
    const res = await fetch(`https://api.geoapify.com/v2/places?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const detail = await res.text()
      return {
        status: 502,
        body: {
          error: 'PLACES_UPSTREAM',
          message: 'Pencarian sedang tidak tersedia. Coba lagi atau tambahkan usaha manual.',
          center: { lat, lon, source },
          radiusKm,
          detail: detail.slice(0, 200),
        },
      }
    }

    const data = await res.json()
    const features: any[] = Array.isArray(data?.features) ? data.features : []

    const seen = new Map<string, PlaceResult>()
    for (const f of features) {
      const item = normalizeFeature(f)
      if (!item) continue
      // Kunci dedupe memakai nama + jalan saja (tanpa nomor rumah), karena
      // OpenStreetMap sering menyimpan satu tempat dua kali dengan nomor
      // rumah berbeda. Yang lebih lengkap informasinya dipertahankan.
      const street = String(f?.properties?.street || '').toLowerCase().trim()
      const dedupeKey = `${item.name.toLowerCase()}|${street}`
      const prev = seen.get(dedupeKey)
      if (!prev) {
        seen.set(dedupeKey, item)
        continue
      }
      if (richness(item) > richness(prev)) seen.set(dedupeKey, item)
    }
    const results = [...seen.values()]

    results.sort((a, b) => a.name.localeCompare(b.name, 'id'))

    cache.set(key, { at: now, results })

    return {
      status: 200,
      body: { results, center: { lat, lon, source }, radiusKm },
    }
  } catch (err: any) {
    return {
      status: 502,
      body: {
        error: 'PLACES_UNREACHABLE',
        message: 'Tidak bisa menghubungi layanan peta. Coba lagi atau tambahkan usaha manual.',
        center: { lat, lon, source },
        radiusKm,
      },
    }
  }
}
