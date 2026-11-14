export type Signal = 'komunikasi' | 'visual' | 'analitis' | 'organisasi' | 'empati' | 'teknologi'

export type QuestionType = 'single' | 'multi' | 'text'

export interface Option {
  id: string
  label: string
  signals: Signal[]
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  hint?: string
  options?: Option[]
  hasFrequency: boolean
  placeholder?: string
}

export const questions: Question[] = [
  {
    id: 'q1',
    type: 'single',
    text: 'Saat waktu luang, kegiatan apa yang paling sering kamu lakukan?',
    hasFrequency: true,
    options: [
      { id: 'a', label: 'Mengedit foto atau video, atau membuat desain', signals: ['visual', 'teknologi'] },
      { id: 'b', label: 'Ngobrol dan mendengarkan cerita teman', signals: ['komunikasi', 'empati'] },
      { id: 'c', label: 'Mengatur jadwal, catatan, atau barang-barangku', signals: ['organisasi', 'analitis'] },
      { id: 'd', label: 'Mengutak-atik aplikasi, gawai, atau kode', signals: ['teknologi', 'analitis'] },
    ],
  },
  {
    id: 'q2',
    type: 'multi',
    text: 'Pilih hal yang biasanya diminta orang lain darimu.',
    hint: 'Boleh lebih dari satu.',
    hasFrequency: true,
    options: [
      { id: 'a', label: 'Membantu menulis atau merapikan teks', signals: ['komunikasi'] },
      { id: 'b', label: 'Membuat poster atau slide', signals: ['visual'] },
      { id: 'c', label: 'Memimpin atau membagi tugas kelompok', signals: ['organisasi'] },
      { id: 'd', label: 'Mendengarkan curhat', signals: ['empati'] },
      { id: 'e', label: 'Menghitung atau merapikan data', signals: ['analitis'] },
      { id: 'f', label: 'Membereskan masalah gawai', signals: ['teknologi'] },
    ],
  },
  {
    id: 'q3',
    type: 'text',
    text: 'Ceritakan satu hal yang pernah kamu kerjakan dan membuatmu bangga.',
    hasFrequency: false,
    placeholder: 'Contoh: aku membuat poster acara kampus dan banyak yang bertanya siapa pembuatnya.',
  },
  {
    id: 'q4',
    type: 'single',
    text: 'Di kerja kelompok, biasanya kamu mengambil peran apa?',
    hasFrequency: true,
    options: [
      { id: 'a', label: 'Penyusun rencana dan pengingat tenggat', signals: ['organisasi'] },
      { id: 'b', label: 'Juru bicara saat presentasi', signals: ['komunikasi'] },
      { id: 'c', label: 'Pembuat tampilan dan materi visual', signals: ['visual'] },
      { id: 'd', label: 'Penengah bila ada perbedaan pendapat', signals: ['empati', 'komunikasi'] },
    ],
  },
  {
    id: 'q5',
    type: 'single',
    text: 'Bila menemukan masalah yang rumit, apa yang kamu lakukan pertama kali?',
    hasFrequency: false,
    options: [
      { id: 'a', label: 'Mencari pola dan angka di baliknya', signals: ['analitis'] },
      { id: 'b', label: 'Bertanya ke orang yang mengalaminya', signals: ['empati', 'komunikasi'] },
      { id: 'c', label: 'Mencoba alat atau cara baru sampai berhasil', signals: ['teknologi'] },
      { id: 'd', label: 'Membuat daftar langkah yang rapi', signals: ['organisasi'] },
    ],
  },
  {
    id: 'q6',
    type: 'multi',
    text: 'Aplikasi atau alat apa yang sudah kamu pakai dengan nyaman?',
    hint: 'Boleh lebih dari satu.',
    hasFrequency: true,
    options: [
      { id: 'a', label: 'Canva, CapCut, atau sejenisnya', signals: ['visual'] },
      { id: 'b', label: 'Spreadsheet', signals: ['analitis', 'organisasi'] },
      { id: 'c', label: 'Media sosial untuk membuat konten', signals: ['komunikasi', 'visual'] },
      { id: 'd', label: 'Alat pemrograman atau no-code', signals: ['teknologi'] },
    ],
  },
  {
    id: 'q7',
    type: 'text',
    text: 'Tulis satu masalah di sekitarmu yang ingin kamu bantu selesaikan.',
    hasFrequency: false,
    placeholder: 'Contoh: warung dekat rumahku sepi karena tidak punya akun media sosial.',
  },
  {
    id: 'q8',
    type: 'single',
    text: 'Apa yang paling membuatmu merasa puas setelah bekerja?',
    hasFrequency: true,
    options: [
      { id: 'a', label: 'Hasilnya terlihat indah dan rapi', signals: ['visual'] },
      { id: 'b', label: 'Ada orang yang terbantu secara nyata', signals: ['empati'] },
      { id: 'c', label: 'Angkanya naik dan bisa dibuktikan', signals: ['analitis'] },
      { id: 'd', label: 'Semuanya berjalan teratur tanpa kekacauan', signals: ['organisasi'] },
    ],
  },
  {
    id: 'q9',
    type: 'single',
    text: 'Bagaimana kamu belajar hal baru?',
    hasFrequency: false,
    options: [
      { id: 'a', label: 'Menonton tutorial lalu langsung mencoba', signals: ['teknologi', 'visual'] },
      { id: 'b', label: 'Bertanya dan berdiskusi dengan orang', signals: ['komunikasi'] },
      { id: 'c', label: 'Membaca dan mencatat dengan sistematis', signals: ['analitis', 'organisasi'] },
      { id: 'd', label: 'Mengamati langsung dari orang yang ahli', signals: ['empati'] },
    ],
  },
  {
    id: 'q10',
    type: 'text',
    text: 'Bila punya waktu 3 jam seminggu, apa yang ingin kamu coba pelajari?',
    hasFrequency: false,
    placeholder: 'Tulis dengan bebasnya. Boleh dilewati.',
  },
]

export const signalMap: Record<Signal, { label: string; keywords: string[] }> = {
  komunikasi: { label: 'Komunikasi', keywords: ['tulis', 'cerita', 'presentasi', 'bicara', 'konten', 'caption', 'promosi', 'media sosial'] },
  visual: { label: 'Visual', keywords: ['desain', 'poster', 'foto', 'video', 'logo', 'tampilan', 'warna', 'edit'] },
  analitis: { label: 'Analitis', keywords: ['data', 'angka', 'hitung', 'laporan', 'pola', 'analisis', 'harga'] },
  organisasi: { label: 'Organisasi', keywords: ['jadwal', 'rencana', 'atur', 'rapi', 'panitia', 'tugas', 'stok'] },
  empati: { label: 'Empati', keywords: ['bantu', 'teman', 'dengar', 'curhat', 'masalah', 'warga', 'orang'] },
  teknologi: { label: 'Teknologi', keywords: ['aplikasi', 'kode', 'website', 'digital', 'online', 'gawai', 'otomatis'] },
}

export type Confidence = 'Tinggi' | 'Sedang' | 'Awal'

export interface Potential {
  id: string
  name: string
  description: string
  signals: Signal[]
  color: 'violet' | 'teal' | 'rose'
  icon: string
}

export const potentials: Potential[] = [
  { id: 'p1', name: 'Pencerita merek', description: 'Kamu pandai mengubah hal biasa menjadi cerita yang membuat orang peduli.', signals: ['komunikasi', 'visual'], color: 'violet', icon: 'megaphone' },
  { id: 'p2', name: 'Perancang visual', description: 'Kamu peka pada warna, susunan, dan kesan pertama.', signals: ['visual', 'teknologi'], color: 'rose', icon: 'palette' },
  { id: 'p3', name: 'Pemecah masalah berbasis data', description: 'Kamu nyaman mencari pola dan membuat keputusan dari angka.', signals: ['analitis', 'organisasi'], color: 'teal', icon: 'chart' },
  { id: 'p4', name: 'Penggerak yang rapi', description: 'Kamu membuat kekacauan menjadi rencana yang bisa dijalankan.', signals: ['organisasi', 'komunikasi'], color: 'teal', icon: 'compass' },
  { id: 'p5', name: 'Pendengar yang peka', description: 'Kamu memahami kebutuhan orang sebelum mereka selesai bicara.', signals: ['empati', 'komunikasi'], color: 'rose', icon: 'heart' },
  { id: 'p6', name: 'Pembangun solusi digital', description: 'Kamu senang mencoba alat baru sampai masalah teratasi.', signals: ['teknologi', 'analitis'], color: 'violet', icon: 'code' },
]

export interface RoadmapStep {
  id: string
  title: string
  goal: string
  tasks: string[]
  mentorOpening: string
}

export interface MentorReplies {
  hint: string[]
  check: string[]
  example: string[]
  general: string[]
}

export const mentorReplies: MentorReplies = {
  hint: [
    'Mulai dari yang paling kecil. Coba tulis satu kalimat saja dulu, tidak perlu sempurna. Apa yang pertama terlintas?',
    'Coba tanyakan pada pemilik usaha: "Apa yang paling sering ditanyakan pelanggan?" Jawabannya biasanya jadi petunjuk. Apa yang kamu dapat?',
    'Bandingkan dengan usaha sejenis di sekitarmu. Apa satu hal yang mereka lakukan dan usaha ini belum?',
  ],
  check: [
    'Aku sudah membaca catatanmu. Bagian yang paling jelas adalah tujuannya. Bagian mana yang menurutmu masih ragu?',
    'Arahnya sudah tepat. Satu pertanyaan untukmu: apakah pemilik usaha bisa menjalankan ini sendiri tanpa kamu?',
    'Ada dasar yang baik di sini. Coba tambahkan satu bukti nyata, misalnya angka atau kutipan dari pemilik. Bisa kamu carikan?',
  ],
  example: [
    'Sebagai gambaran dari bidang lain: kedai roti menulis "Dipanggang pukul 5 pagi, habis sebelum siang". Apa versi untuk usaha ini?',
    'Contoh bentuknya: judul singkat, satu alasan, satu ajakan. Coba isi tiga bagian itu dengan versimu sendiri.',
  ],
  general: [
    'Menarik. Apa alasanmu memilih itu?',
    'Aku mengerti. Menurutmu langkah kecil apa yang bisa kamu lakukan hari ini?',
    'Bagus. Apa yang akan kamu ubah bila hasilnya belum sesuai harapan?',
  ],
}

