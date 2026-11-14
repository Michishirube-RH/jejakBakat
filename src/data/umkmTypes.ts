import type { RoadmapStep } from './mockData'

/** Pilihan jenis usaha tetap. Tidak bergantung pada Places API agar formulir
 *  "Tambah sendiri" tetap berjalan walau pencarian gagal. */
export const JENIS_USAHA = [
  'Warung makan',
  'Kedai kopi',
  'Kue dan roti',
  'Toko kelontong',
  'Jasa katering',
  'Toko pakaian/kriya',
  'Lainnya',
] as const

export type JenisUsaha = (typeof JENIS_USAHA)[number]

/** Batas panjang input pengguna. Ditegakkan di UI dan kembali diperiksa di server. */
export const LIMITS = {
  businessName: 80,
  address: 160,
  problem: 600,
  city: 60,
  jenisUsahaLain: 40,
  introMessage: 800,
} as const

export interface Umkm {
  id: string
  /** 'places' bila dipilih dari hasil pencarian, 'manual' bila diisi sendiri. */
  source: 'places' | 'manual'
  name: string
  jenisUsaha: JenisUsaha
  /** Diisi hanya bila jenisUsaha === 'Lainnya'. */
  jenisUsahaLain?: string
  city: string
  address: string
  phone?: string
  openingHours?: string
  /** Label kategori Bahasa Indonesia dari /api/places. */
  categoryLabel?: string
  lat?: number
  lon?: number
}

/** Jenis usaha dalam bentuk teks siap tampil (memperhitungkan pilihan "Lainnya"). */
export function jenisUsahaLabel(u: Pick<Umkm, 'jenisUsaha' | 'jenisUsahaLain'>): string {
  if (u.jenisUsaha === 'Lainnya') return u.jenisUsahaLain?.trim() || 'Usaha lain'
  return u.jenisUsaha
}

export interface Mission {
  id: string
  umkmId: string
  usaha: string
  lokasi: string
  jenisUsaha: string
  /** Teks masalah dari pengguna. Boleh string kosong. */
  masalah: string
  ringkasan: string
  target: string
  skills: string[]
  durasi: string
  jam: number
  kesulitan: 'Mudah' | 'Sedang' | 'Menantang'
  /** Nama potensi teratas pengguna. */
  cocokDengan: string
  /** Asumsi yang dibuat perancang misi, ditampilkan dengan tanda khusus. */
  asumsi: string[]
  /** true bila pengguna mencentang "Sudah izin pemilik". */
  ownerPermissionGranted: boolean
  roadmap: RoadmapStep[]
  createdAt: string
}

/** Saran chip masalah per jenis usaha. */
export const PROBLEM_SUGGESTIONS: Record<JenisUsaha, string[]> = {
  'Warung makan': [
    'Pembeli baru jarang datang',
    'Belum punya foto menu yang menarik',
    'Belum dikenal di media sosial',
    'Pencatatan penjualan masih manual',
  ],
  'Kedai kopi': [
    'Sepi di jam tertentu',
    'Stok bahan sering habis',
    'Belum tahu menu paling laku',
    'Belum punya promosi rutin',
  ],
  'Kue dan roti': [
    'Produk cepat basi karena tidak terjual',
    'Pesanan hanya dari mulut ke mulut',
    'Foto produk kurang menggugah',
    'Belum punya daftar harga yang rapi',
  ],
  'Toko kelontong': [
    'Stok sering kosong tanpa disadari',
    'Tidak ada catatan penjualan harian',
    'Kalah bersaing dengan minimarket',
    'Pembeli tidak tahu ada layanan antar',
  ],
  'Jasa katering': [
    'Pesanan tidak menentu',
    'Belum punya paket harga yang jelas',
    'Sulit menjangkau pelanggan baru',
    'Belum punya portofolio menu',
  ],
  'Toko pakaian/kriya': [
    'Foto produk gelap dan kurang jelas',
    'Deskripsi produk terlalu singkat',
    'Belum berjualan daring',
    'Pembeli sulit menghubungi penjual',
  ],
  Lainnya: [
    'Belum dikenal calon pembeli',
    'Belum ada pencatatan yang rapi',
    'Promosi masih dari mulut ke mulut',
    'Belum punya materi promosi',
  ],
}

/** Hasil satu tempat dari /api/places, siap ditampilkan di kartu. */
export interface PlaceResult {
  id: string
  name: string
  categoryLabel: string
  jenisUsaha: JenisUsaha
  address: string
  openingHours?: string
  phone?: string
  lat?: number
  lon?: number
}

/** Batas panjang yang dipakai bersama oleh UI dan validasi server. */
export function clampText(value: string, max: number): string {
  return value.slice(0, max)
}
