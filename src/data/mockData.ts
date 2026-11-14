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

export interface MissionMetricOption {
  id: string
  label: string
  unit: string
  sampleBefore: string
  sampleAfter: string
}

export interface Mission {
  id: string
  businessName: string
  businessType: string
  location: string
  ownerInitials: string
  ownerName: string
  icon: string
  problem: string
  summary: string
  target: string
  duration: string
  estimatedHours: number
  difficulty: 'Mudah' | 'Sedang' | 'Menantang'
  skills: string[]
  matchSignals: Signal[]
  deliverable: string
  roadmap: RoadmapStep[]
  metricsOptions: MissionMetricOption[]
  sampleTestimonial: string
  nextSteps: string[]
}

export const missions: Mission[] = [
  {
    id: 'm1',
    businessName: 'Warung Bu Sari',
    businessType: 'Warung makan rumahan',
    location: 'Sleman, Yogyakarta',
    ownerInitials: 'BS',
    ownerName: 'Bu Sari',
    icon: 'store',
    summary: 'Pembeli baru jarang datang karena warung belum dikenal di media sosial.',
    problem: 'Warung Bu Sari punya pelanggan setia, tetapi hampir tidak ada pembeli baru. Belum ada akun media sosial dan menu hanya ditulis tangan di papan.',
    target: 'Menyusun rencana konten 2 minggu dan membuat 5 contoh unggahan yang siap dipakai.',
    duration: '6 jam, 1 minggu',
    estimatedHours: 6,
    difficulty: 'Mudah',
    skills: ['Penulisan caption', 'Perencanaan konten', 'Desain sederhana'],
    matchSignals: ['komunikasi', 'visual'],
    deliverable: 'Impact Report berisi rencana konten, 5 contoh unggahan, dan catatan hasil dari pemilik warung.',
    metricsOptions: [
      { id: 'm1_post', label: 'Unggahan konten siap pakai', unit: 'unggahan', sampleBefore: '0', sampleAfter: '10' },
      { id: 'm1_follower', label: 'Pengikut media sosial', unit: 'pengikut', sampleBefore: '0', sampleAfter: '85' },
      { id: 'm1_buyer', label: 'Pembeli baru per minggu', unit: 'orang', sampleBefore: '2', sampleAfter: '7' },
    ],
    sampleTestimonial: 'Sekarang saya tahu mau unggah apa setiap hari. Pembeli baru mulai datang dan bilang tahu warung ini dari Instagram.',
    nextSteps: [
      'Pantau respon unggahan Instagram selama 2 minggu pertama dan catat menu yang paling disukai',
      'Ajak pembeli setia memberi ulasan di Google Maps atau menandai akun warung',
      'Coba misi berikutnya dengan pencatatan data keuangan atau inventaris stok',
    ],
    roadmap: [
      { id: 's1', title: 'Kenali warung', goal: 'Menggali keunikan warung dan siapa pembelinya.', tasks: ['Tulis 3 hal yang membuat warung ini berbeda', 'Tentukan 1 kelompok pembeli utama', 'Pilih 2 menu andalan untuk disorot'], mentorOpening: 'Halo! Sebelum membuat konten, kita perlu paham warungnya dulu. Menurutmu, apa satu hal yang tidak dimiliki warung lain di sekitar sini?' },
      { id: 's2', title: 'Susun rencana konten', goal: 'Membuat jadwal unggahan 2 minggu.', tasks: ['Tentukan 3 tema konten', 'Isi kalender 10 unggahan', 'Tulis gaya bahasa yang dipakai'], mentorOpening: 'Bagus, bahan dasarmu sudah ada. Sekarang tema apa yang menurutmu paling mudah dibuat Bu Sari sendiri setiap minggu?' },
      { id: 's3', title: 'Buat dan uji contoh', goal: 'Menghasilkan 5 contoh unggahan dan menguji ke pemilik.', tasks: ['Buat 5 caption dan visual', 'Tunjukkan ke Bu Sari dan catat tanggapannya', 'Perbaiki satu contoh berdasarkan masukan'], mentorOpening: 'Tahap terakhir. Coba mulai dari unggahan yang paling kamu yakini. Apa yang ingin dirasakan pembaca saat melihatnya?' },
    ],
  },
  {
    id: 'm2',
    businessName: 'Kopi Tetangga',
    businessType: 'Kedai kopi kecil',
    location: 'Cibiru, Bandung',
    ownerInitials: 'AR',
    ownerName: 'Arif',
    icon: 'coffee',
    summary: 'Pencatatan penjualan masih di buku, sehingga stok sering habis tanpa disadari.',
    problem: 'Arif mencatat penjualan di buku tulis. Ia sering kehabisan bahan di jam ramai dan tidak tahu menu mana yang paling laku.',
    target: 'Membuat templat pencatatan penjualan dan stok, lalu merangkum menu terlaris dari 1 minggu data.',
    duration: '5 jam, 1 minggu',
    estimatedHours: 5,
    difficulty: 'Sedang',
    skills: ['Spreadsheet', 'Analisis data sederhana', 'Penyusunan laporan'],
    matchSignals: ['analitis', 'organisasi'],
    deliverable: 'Impact Report berisi templat pencatatan, ringkasan menu terlaris, dan saran stok mingguan.',
    metricsOptions: [
      { id: 'm2_log', label: 'Pencatatan penjualan rutin', unit: 'hari/minggu', sampleBefore: '0', sampleAfter: '7' },
      { id: 'm2_outstock', label: 'Frekuensi kehabisan bahan baku', unit: 'kali/minggu', sampleBefore: '5', sampleAfter: '0' },
      { id: 'm2_menu', label: 'Menu terlaris yang teridentifikasi', unit: 'menu', sampleBefore: '0', sampleAfter: '3' },
    ],
    sampleTestimonial: 'Pencatatan penjualan dan stok jadi sangat rapi. Saya tidak pernah lagi kehabisan biji kopi di jam ramai.',
    nextSteps: [
      'Evaluasi data penjualan mingguan bersama Arif untuk menentukan jumlah stok optimal',
      'Terapkan kartu stok sederhana untuk bahan baku dengan perputaran paling cepat',
      'Coba misi visual dan penulisan untuk mempromosikan menu kopi yang paling menguntungkan',
    ],
    roadmap: [
      { id: 's1', title: 'Pahami alur kedai', goal: 'Memetakan apa saja yang dicatat dan dibeli.', tasks: ['Daftar semua menu dan bahan utamanya', 'Catat jam ramai dari cerita Arif', 'Tentukan 3 data yang wajib dicatat'], mentorOpening: 'Mari mulai dari kenyataannya. Menurut Arif, kapan saat paling sering kehabisan bahan, dan bahan apa?' },
      { id: 's2', title: 'Rancang templat', goal: 'Membuat templat yang mudah diisi saat sibuk.', tasks: ['Buat tabel penjualan harian', 'Buat tabel stok bahan', 'Uji coba isi dengan data contoh'], mentorOpening: 'Templat yang bagus itu cepat diisi. Kolom apa yang menurutmu paling penting dan mana yang bisa dibuang?' },
      { id: 's3', title: 'Baca hasilnya', goal: 'Merangkum data dan memberi saran.', tasks: ['Isi data 1 minggu bersama Arif', 'Temukan 3 menu terlaris', 'Tulis 2 saran stok'], mentorOpening: 'Datanya sudah terkumpul. Apa pola pertama yang kamu lihat saat membaca angkanya?' },
    ],
  },
  {
    id: 'm3',
    businessName: 'Batik Ibu Lastri',
    businessType: 'Pengrajin batik rumahan',
    location: 'Pekalongan, Jawa Tengah',
    ownerInitials: 'IL',
    ownerName: 'Ibu Lastri',
    icon: 'shirt',
    summary: 'Produk bagus, tetapi foto dan deskripsi di toko daring kurang menarik.',
    problem: 'Ibu Lastri mulai berjualan daring, namun foto produk gelap dan deskripsinya singkat, sehingga pengunjung toko jarang membeli.',
    target: 'Memperbaiki 5 halaman produk dengan foto lebih baik dan deskripsi yang menjelaskan nilai produknya.',
    duration: '7 jam, 1 sampai 2 minggu',
    estimatedHours: 7,
    difficulty: 'Sedang',
    skills: ['Fotografi ponsel', 'Penulisan deskripsi produk', 'Pemahaman pelanggan'],
    matchSignals: ['visual', 'empati', 'teknologi'],
    deliverable: 'Impact Report berisi perbandingan sebelum dan sesudah halaman produk serta tanggapan pemilik.',
    metricsOptions: [
      { id: 'm3_photo', label: 'Foto produk yang diperbarui', unit: 'produk', sampleBefore: '0', sampleAfter: '5' },
      { id: 'm3_desc', label: 'Deskripsi cerita nilai produk', unit: 'halaman', sampleBefore: '0', sampleAfter: '5' },
      { id: 'm3_inquiry', label: 'Pertanyaan atau chat calon pembeli', unit: 'chat/minggu', sampleBefore: '1', sampleAfter: '8' },
    ],
    sampleTestimonial: 'Foto kain jadi terlihat cerah dan deskripsi ceritanya membuat pembeli luar kota tertarik memesan lewat toko daring.',
    nextSteps: [
      'Perbarui foto sampul dan profil toko daring agar senada dengan foto produk baru',
      'Kumpulkan testimoni pembeli pertama untuk ditampilkan di etalase produk',
      'Coba misi promosi media sosial untuk mengenalkan filosofi motif batik ke audiens muda',
    ],
    roadmap: [
      { id: 's1', title: 'Pelajari produk', goal: 'Memahami cerita, bahan, dan calon pembeli.', tasks: ['Catat cerita dan proses tiap kain', 'Tulis siapa calon pembelinya', 'Pilih 5 produk untuk diperbaiki'], mentorOpening: 'Sebelum memotret, kita perlu tahu apa yang ingin dirasakan pembeli. Dari cerita Ibu Lastri, apa yang paling berkesan bagimu?' },
      { id: 's2', title: 'Perbaiki foto', goal: 'Memotret ulang dengan cahaya dan latar yang baik.', tasks: ['Siapkan latar dan cahaya alami', 'Ambil 3 sudut tiap produk', 'Pilih satu foto terbaik per produk'], mentorOpening: 'Cahaya biasanya menentukan segalanya. Di tempat Ibu Lastri, di mana posisi yang cahayanya paling lembut?' },
      { id: 's3', title: 'Tulis deskripsi', goal: 'Menulis deskripsi yang meyakinkan.', tasks: ['Tulis deskripsi 5 produk', 'Minta Ibu Lastri memeriksa', 'Bandingkan tampilan sebelum dan sesudah'], mentorOpening: 'Terakhir, kata-katanya. Bayangkan satu pembeli: apa pertanyaan pertama yang ia punya tentang kain ini?' },
    ],
  },
]

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

export interface ImpactReportMetric {
  label: string
  unit?: string
  before: string
  after: string
}

export interface SampleImpactReport {
  userName: string
  missionName: string
  date: string
  business: string
  summary: string
  provenSkills: string[]
  metrics: ImpactReportMetric[]
  hours: number
  ownerTestimonial: string
  sampleTestimonial?: string
  ownerName: string
  strengthenedPotential: string
  nextSteps: string[]
}

export const sampleImpactReport: SampleImpactReport = {
  userName: '',
  missionName: 'Rencana konten Warung Bu Sari',
  date: '12 Mei 2025',
  business: 'Warung Bu Sari, Sleman',
  summary: 'Menyusun rencana konten 2 minggu dan membuat contoh materi publikasi yang siap dipakai.',
  provenSkills: ['Penulisan caption', 'Perencanaan konten', 'Desain sederhana'],
  metrics: [
    { label: 'Unggahan konten siap pakai', unit: 'unggahan', before: '', after: '' },
    { label: 'Pengikut media sosial', unit: 'pengikut', before: '', after: '' },
    { label: 'Pembeli baru per minggu', unit: 'orang', before: '', after: '' },
  ],
  hours: 6,
  ownerTestimonial: '',
  sampleTestimonial: 'Sekarang saya tahu mau unggah apa setiap hari. Pembeli baru mulai datang dan bilang tahu warung ini dari Instagram.',
  ownerName: 'Bu Sari',
  strengthenedPotential: 'Pencerita merek',
  nextSteps: [
    'Pantau respon unggahan Instagram selama 2 minggu pertama dan catat menu yang paling disukai',
    'Ajak pembeli setia memberi ulasan di Google Maps atau menandai akun warung',
    'Coba misi berikutnya dengan pencatatan data keuangan atau inventaris stok',
  ],
}
