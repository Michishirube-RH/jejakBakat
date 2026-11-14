import type { RoadmapStep } from './mockData'
import type { JenisUsaha } from './umkmTypes'

/**
 * Template misi cadangan. Dipakai hanya bila LLM gagal merancang misi.
 *
 * Semua template netral: tidak menyebut nama usaha, nama pemilik, atau angka
 * dampak tertentu. Placeholder {{usaha}}, {{lokasi}}, dan {{jenis}} diganti
 * saat runtime dari data UMKM yang dipilih pengguna.
 */
export interface MissionTemplate {
  /** Kunci template, dipakai untuk pemetaan dari jenis usaha. */
  key: string
  label: string
  ringkasan: string
  target: string
  skills: string[]
  durasi: string
  jam: number
  kesulitan: 'Mudah' | 'Sedang' | 'Menantang'
  roadmap: RoadmapStep[]
}

const LANGKAH_IZIN_WAWANCARA: RoadmapStep = {
  id: 's1',
  title: 'Temui pemilik dan minta izin',
  goal: 'Memperkenalkan diri, meminta izin, lalu mewawancarai pemilik tentang masalah yang ia rasakan.',
  tasks: [
    'Perkenalkan diri dan jelaskan maksud kedatanganmu',
    'Minta izin tertulis atau lisan untuk membantu usaha ini',
    'Tanyakan apa masalah yang paling sering dikeluhkan pembeli',
    'Catat 3 hal yang ingin pemilik ubah dari usahanya',
  ],
  mentorOpening:
    'Halo! Sebelum masuk ke kerja teknis, kita mulai dari yang paling penting: izin dan cerita pemilik. Menurutmu, apa satu hal yang paling ingin ia ubah dari usahanya?',
}

function templateKonten(): MissionTemplate {
  return {
    key: 'konten',
    label: 'Konten dan promosi',
    ringkasan: 'Menyusun bahan promosi sederhana yang bisa dipakai pemilik sendiri setelah kamu selesai.',
    target: 'Menghasilkan rencana konten satu minggu dan tiga contoh materi promosi siap pakai.',
    skills: ['Penulisan caption', 'Perencanaan konten', 'Desain sederhana'],
    durasi: '3 hari, sekitar 6 jam',
    jam: 6,
    kesulitan: 'Mudah',
    roadmap: [
      LANGKAH_IZIN_WAWANCARA,
      {
        id: 's2',
        title: 'Susun rencana konten',
        goal: 'Membuat jadwal unggahan satu minggu yang realistis untuk pemilik.',
        tasks: [
          'Tentukan 3 tema yang paling mudah dibuat pemilik',
          'Isi jadwal 7 unggahan untuk satu minggu',
          'Tentukan gaya bahasa yang sesuai pembeli setempat',
        ],
        mentorOpening:
          'Bahan dasarnya sudah ada. Sekarang tema apa yang menurutmu paling mungkin dibuat sendiri oleh pemilik setiap minggu?',
      },
      {
        id: 's3',
        title: 'Buat contoh dan uji',
        goal: 'Menghasilkan contoh materi lalu meminta pendapat pemilik.',
        tasks: [
          'Buat 3 contoh caption atau visual',
          'Tunjukkan ke pemilik dan catat tanggapannya',
          'Perbaiki satu contoh berdasarkan masukan itu',
        ],
        mentorOpening:
          'Tahap terakhir. Mulai dari unggahan yang paling kamu yakini. Apa yang ingin dirasakan pembaca saat melihatnya?',
      },
    ],
  }
}

function templateData(): MissionTemplate {
  return {
    key: 'data',
    label: 'Pencatatan dan data',
    ringkasan: 'Membuat cara mencatat sederhana agar pemilik punya gambaran jelas soal penjualan dan stok.',
    target: 'Menghasilkan satu templat pencatatan sederhana dan panduan mengisinya dalam lima menit sehari.',
    skills: ['Pencatatan sederhana', 'Membaca data', 'Menyusun laporan'],
    durasi: '3 hari, sekitar 5 jam',
    jam: 5,
    kesulitan: 'Sedang',
    roadmap: [
      LANGKAH_IZIN_WAWANCARA,
      {
        id: 's2',
        title: 'Rancang templat pencatatan',
        goal: 'Membuat templat yang cepat diisi saat pemilik sedang sibuk.',
        tasks: [
          'Daftar data yang benar-benar ingin diketahui pemilik',
          'Buat templat dengan maksimal 5 kolom',
          'Uji isi templat dengan data satu hari bersama pemilik',
        ],
        mentorOpening:
          'Templat yang bagus itu cepat diisi. Kolom apa yang menurutmu paling penting, dan mana yang bisa dibuang?',
      },
      {
        id: 's3',
        title: 'Baca dan simpulkan',
        goal: 'Menunjukkan satu temuan berguna dari data yang sudah dicatat.',
        tasks: [
          'Kumpulkan data minimal tiga hari',
          'Temukan satu pola yang bisa ditindaklanjuti',
          'Tulis dua saran singkat untuk pemilik',
        ],
        mentorOpening:
          'Datanya sudah terkumpul. Apa pola pertama yang kamu lihat saat membaca catatannya?',
      },
    ],
  }
}

function templateVisual(): MissionTemplate {
  return {
    key: 'visual',
    label: 'Visual dan deskripsi produk',
    ringkasan: 'Memperbaiki tampilan dan deskripsi produk agar calon pembeli lebih yakin.',
    target: 'Memperbaiki foto dan deskripsi untuk tiga produk andalan.',
    skills: ['Fotografi ponsel', 'Penulisan deskripsi produk', 'Memahami calon pembeli'],
    durasi: '3 hari, sekitar 7 jam',
    jam: 7,
    kesulitan: 'Sedang',
    roadmap: [
      LANGKAH_IZIN_WAWANCARA,
      {
        id: 's2',
        title: 'Perbaiki foto produk',
        goal: 'Memotret ulang dengan cahaya dan latar yang lebih baik.',
        tasks: [
          'Cari posisi dengan cahaya alami terbaik',
          'Ambil tiga sudut untuk setiap produk',
          'Pilih satu foto terbaik per produk',
        ],
        mentorOpening:
          'Cahaya biasanya menentukan segalanya. Di lokasi usaha ini, di mana posisi yang cahayanya paling lembut?',
      },
      {
        id: 's3',
        title: 'Tulis deskripsi produk',
        goal: 'Menulis deskripsi singkat yang menjawab pertanyaan calon pembeli.',
        tasks: [
          'Tulis deskripsi untuk tiga produk',
          'Minta pemilik memeriksa kebenarannya',
          'Bandingkan tampilan sebelum dan sesudah',
        ],
        mentorOpening:
          'Terakhir, kata-katanya. Bayangkan satu calon pembeli: apa pertanyaan pertama yang ia punya tentang produk ini?',
      },
    ],
  }
}

function templateUmum(): MissionTemplate {
  return {
    key: 'umum',
    label: 'Perbaikan umum',
    ringkasan: 'Mengurai satu masalah nyata menjadi langkah kecil yang bisa diselesaikan dalam tiga hari.',
    target: 'Menghasilkan satu perbaikan konkret yang bisa langsung dirasakan pemilik atau pembelinya.',
    skills: ['Memecah masalah', 'Komunikasi', 'Menyusun langkah kerja'],
    durasi: '3 hari, sekitar 5 jam',
    jam: 5,
    kesulitan: 'Sedang',
    roadmap: [
      LANGKAH_IZIN_WAWANCARA,
      {
        id: 's2',
        title: 'Pilih satu perbaikan',
        goal: 'Memilih satu masalah yang paling layak dikerjakan dalam tiga hari.',
        tasks: [
          'Daftar tiga masalah yang mungkin dikerjakan',
          'Pilih satu yang paling berdampak dan paling mungkin selesai',
          'Sepakati hasil seperti apa yang dianggap berhasil',
        ],
        mentorOpening:
          'Kita tidak bisa mengerjakan semua sekaligus. Dari yang kamu dengar tadi, mana yang paling ingin diselesaikan pemilik lebih dulu?',
      },
      {
        id: 's3',
        title: 'Kerjakan dan tunjukkan',
        goal: 'Menjalankan perbaikan lalu meminta tanggapan pemilik.',
        tasks: [
          'Kerjakan perbaikan yang sudah dipilih',
          'Tunjukkan hasilnya ke pemilik',
          'Catat tanggapan dan satu saran lanjutan',
        ],
        mentorOpening:
          'Saatnya menunjukkan hasil. Apa bagian yang paling ingin kamu minta pendapatnya dari pemilik?',
      },
    ],
  }
}

/** Semua template, berurutan sesuai prioritas pencocokan. */
export const missionTemplates: MissionTemplate[] = [
  templateKonten(),
  templateData(),
  templateVisual(),
  templateUmum(),
]

/** Memilih template yang paling relevan untuk sebuah jenis usaha. */
export function templateForJenis(jenisUsaha: string): MissionTemplate {
  const j = jenisUsaha.toLowerCase()
  if (/warung|kopi|roti|kue|makan|kafe|cafe/.test(j)) return missionTemplates[0]
  if (/kelontong|katering|sembako|toko kebutuhan/.test(j)) return missionTemplates[1]
  if (/pakaian|kriya|batik|fashion|kerajinan/.test(j)) return missionTemplates[2]
  return missionTemplates[3]
}

/** Mengganti placeholder dengan data UMKM. Tidak pernah menyisakan nama bawaan. */
export function fillTemplate(
  text: string,
  data: { usaha: string; lokasi: string; jenis: string },
): string {
  return text
    .replace(/\{\{usaha\}\}/g, data.usaha)
    .replace(/\{\{lokasi\}\}/g, data.lokasi)
    .replace(/\{\{jenis\}\}/g, data.jenis)
}
