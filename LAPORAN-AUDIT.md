# LAPORAN AUDIT — JejakBakat AI

> [!IMPORTANT]
> **DOKUMEN INI SUDAH KEDALUWARSA — HANYA UNTUK CATATAN SEJARAH.**
>
> Audit ini dibuat pada 14 November 2026 terhadap snapshot kode **sebelum**
> pengerjaan ulang alur misi. Temuannya — terutama tentang tiga misi UMKM
> bawaan ("Warung Bu Sari", "Kopi Tetangga", "Batik Ibu Lastri"), data metrik
> dan testimoni contoh, serta klaim bahwa tidak ada panggilan LLM — **sudah
> tidak berlaku** pada kode saat ini.
>
> Kondisi terkini: pengguna memilih UMKM sendiri (cari di sekitar lewat
> Geoapify atau tambah manual), menceritakan masalahnya, lalu LLM merancang
> misi 3 hari. Tiga misi bawaan sudah dihapus dari seluruh kode, dan tidak ada
> nama usaha, angka dampak, atau testimoni bawaan yang tampil di layar mana
> pun. Lihat `README`/riwayat commit untuk keadaan sekarang.

**Tanggal audit:** 14 November 2026  
**Auditor:** AI (Antigravity / Claude Sonnet 4.6 Thinking)  
**Versi kode:** snapshot 14 Nov 2026, 14:09 WIB (tidak ada git history)  
**Server saat audit:** `http://localhost:8443` — HTTP 200 OK terverifikasi  
**Total baris kode src/:** 1.858 baris TypeScript/TSX  

---

## 1. RINGKASAN

JejakBakat AI adalah aplikasi web React (Vite + Tailwind CSS v4) yang memandu pengguna menemukan potensi diri melalui 10 pertanyaan, lalu membuktikannya lewat misi nyata untuk UMKM. Alur lengkap dari kuesioner hingga Impact Report **sudah berjalan** di lingkungan lokal tanpa error build. Namun seluruh fitur yang diklaim sebagai "AI" — analisis potensi, mentor, dan Impact Report — **sepenuhnya menggunakan algoritma berbasis aturan dan data teks statis hardcode**, tanpa panggilan ke LLM atau layanan eksternal mana pun. Risiko terbesar saat demo adalah **Impact Report lintas misi menampilkan metrik, testimoni, dan angka dampak yang identik** (selalu milik Warung Bu Sari) meskipun misi yang dipilih berbeda, sehingga jika juri memeriksa laporan dari dua misi berbeda secara berurutan, inkonsistensi ini akan langsung terlihat.

---

## 2. PETA PROYEK

### File Utama `src/`

| File | Fungsi |
|---|---|
| `App.tsx` | Router berbasis `state.screen`; merender layar aktif dan backdrop dekoratif |
| `lib.ts` | Hook `useAppState`: satu-satunya penyimpan state global via `localStorage` |
| `main.tsx` | Entry point React; mounts ke `#root` |
| `index.css` | Semua token Tailwind v4, CSS global, animasi, dan class utilitas kustom |
| `vite-env.d.ts` | Deklarasi tipe Vite (1 baris) |
| `screens/Landing.tsx` | Halaman beranda (Welcome) dengan fitur-preview dan pratinjau misi |
| `screens/Intro2.tsx` | Layar perkenalan maskot Jeje sebelum kuesioner |
| `screens/Intro.tsx` | Komponen `Quiz` (10 pertanyaan) dan `Loading` (animasi analisis) |
| `screens/Results.tsx` | Layar hasil potensi (flip cards + radar) dan Detail Misi |
| `screens/Workspace.tsx` | Ruang kerja misi: roadmap, checklist tugas, chat mentor |
| `screens/Report.tsx` | Impact Report akhir dengan tombol cetak/salin/bagikan |
| `components/Mentor.tsx` | Maskot Jeje sebagai SVG animasi; 6 mood state |
| `components/mentor.css` | Keyframe dan variabel CSS maskot Jeje (197 baris) |
| `components/Companion.tsx` | `MentorSay`: gelembung ucapan Jeje kontekstual per layar |
| `components/ui.tsx` | Komponen bersama: `Nav`, `Page`, `BottomBar`, `BackButton` |
| `components/PotensiRadar.tsx` | Grafik radar SVG 6 sumbu + sistem arketipe karakter |
| `components/ResultsBackdrop.tsx` | Dekorasi latar lavender untuk layar hasil/workspace/report |
| `ai/analyzePotential.ts` | "AI" analisis potensi — **simulasi lokal, bukan LLM** |
| `ai/mentor.ts` | "AI" mentor dan pembuat laporan — **data statis, bukan LLM** |
| `ai/types.ts` | Definisi tipe TypeScript untuk sistem AI |
| `data/mockData.ts` | Semua data master: soal, potensi, misi UMKM, balasan mentor, laporan contoh |

### Urutan Layar (Alur Pengguna)

```
welcome → intro → quiz → loading → results → mission → workspace → report
```

---

## 3. IMPLEMENTASI AI (bobot nilai 25%)

### 3.1 Analisis Potensi

**Status: PALSU (simulasi lokal)**

**Bukti:** `src/ai/analyzePotential.ts` baris 7–9 (komentar resmi pengembang):
```ts
/**
 * Versi simulasi. Ganti isi fungsi ini dengan panggilan ke LLM lewat fungsi serverless;
 * bentuk input dan output tidak perlu berubah.
 */
```

**Mekanisme sebenarnya** (baris 11–70): Fungsi `analyzePotential` adalah komputasi murni lokal:
1. Setiap pilihan ganda dipetakan ke sinyal (misalnya pilihan `'b'` di Q1 → `['komunikasi', 'empati']`).
2. Bobot dihitung: `weight = 1 + (frequency + enjoyment) / 200` → nilai 1,0–2,0.
3. Jawaban teks di-scan substring untuk kata kunci hardcode (misalnya `'bantu'` → empati).
4. 6 profil potensi diberi skor, diurutkan, diambil 3 teratas.
5. Fungsi menunggu `await wait(1500)` (setTimeout 1,5 detik) untuk mensimulasikan "AI berpikir".

**Tidak ada:** panggilan `fetch`, `axios`, endpoint API, atau pemanggilan LLM mana pun (diverifikasi dengan pencarian pola jaringan di seluruh `src/` — hasil nol).

**Model dan penyedia:** Tidak ada. Murni JavaScript.

**Potongan kode fungsi pemanggil** (`src/ai/analyzePotential.ts`, baris 11–70, seluruh fungsi):
```ts
export async function analyzePotential(answers: Answers): Promise<AnalysisResult> {
  const signalScores = Object.fromEntries(SIGNALS.map((s) => [s, 0])) as Record<Signal, number>
  const evidenceBySignal: Record<Signal, Evidence[]> = Object.fromEntries(SIGNALS.map((s) => [s, []])) as never

  for (const q of questions) {
    const a = answers[q.id]
    if (!a) continue
    const weight = 1 + ((a.frequency ?? 50) + (a.enjoyment ?? 50)) / 200
    for (const id of a.choice ?? []) {
      const opt = q.options?.find((o) => o.id === id)
      if (!opt) continue
      for (const s of opt.signals) {
        signalScores[s] += weight
        evidenceBySignal[s].push({
          quote: opt.label,
          explanation: `Pilihan ini menunjukkan kecenderungan ${signalMap[s].label.toLowerCase()}.`,
        })
      }
    }
    const text = a.text?.trim()
    if (text) {
      const lower = text.toLowerCase()
      for (const s of SIGNALS) {
        const hits = signalMap[s].keywords.filter((k) => lower.includes(k))
        if (hits.length) {
          signalScores[s] += hits.length * 1.5
          evidenceBySignal[s].unshift({
            quote: text.length > 140 ? text.slice(0, 137) + '...' : text,
            explanation: `Kata "${hits[0]}" dalam ceritamu mengarah pada ${signalMap[s].label.toLowerCase()}.`,
          })
        }
      }
    }
  }
  const scored = potentials
    .map((p) => ({ p, score: p.signals.reduce((sum, s) => sum + signalScores[s], 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 3)
  const result: AnalysisResult = {
    signalScores,
    potentials: scored.map(({ p, score }, i) => {
      const seen = new Set<string>()
      const evidence = p.signals.flatMap((s) => evidenceBySignal[s])
        .filter((e) => (seen.has(e.quote) ? false : (seen.add(e.quote), true))).slice(0, 2)
      const confidence = i === 0 && score >= 6 ? 'Tinggi' : score >= 3 ? 'Sedang' : 'Awal'
      return { potentialId: p.id, score, confidence, evidence }
    }),
  }
  await wait(1500)
  return result
}
```

**Prompt sistem:** Tidak ada. Tidak ada LLM.

**Penanganan gagal/lambat:** `src/screens/Intro.tsx` baris 127–131 menangkap error lewat `.catch(() => live && setErr(true))`. Jika terjadi error JavaScript (bukan jaringan karena tidak ada), layar error tampil dengan pesan **"Koneksi terputus. Periksa internetmu lalu coba lagi."** — pesan ini **menyesatkan** karena analisis sama sekali tidak melibatkan jaringan.

**Kutipan "Bukti dari jawabanmu":** **YA, diambil dari jawaban pengguna sungguhan.** Kutipan berasal dari dua sumber: (1) label opsi yang dipilih, diformat sebagai `Pilihan ini menunjukkan kecenderungan X.`; (2) teks bebas pengguna yang mengandung kata kunci, dikutip langsung (dipotong 140 karakter). Ini adalah satu fitur yang benar-benar memakai data pengguna.

---

### 3.2 Mentor Chat

**Status: PALSU (data statis berputar)**

**Bukti:** `src/ai/mentor.ts` baris 7: `/** Versi simulasi. Ganti dengan panggilan LLM; mentor bertanya balik dan memberi petunjuk bertahap. */`

Fungsi `mentorReply` (baris 8–13): memilih string dari array statis (`mentorReplies` di `mockData.ts`) menggunakan counter yang berputar (round-robin). **Pesan pengguna (`_message`, diawali `_`) sama sekali tidak dibaca.**

Jumlah balasan per kategori (seluruhnya di `src/data/mockData.ts` baris 266–284):
- `hint`: 3 string statis
- `check`: 3 string statis  
- `example`: 2 string statis
- `general`: 3 string statis

Delay buatan: `await wait(900 + Math.random() * 500)` untuk mensimulasikan respons.

Counter (`counters`) adalah variabel module-level in-memory — reset saat halaman di-refresh, sehingga urutan balasan selalu mulai dari awal setelah refresh.

---

### 3.3 Impact Report

**Status: PALSU (template hardcode dengan subsitusi parsial)**

**Bukti:** `src/ai/mentor.ts` baris 23: `/** Versi simulasi. Menimpa contoh laporan dengan data misi dan catatan pengguna. */`

Fungsi `buildImpactReport` (baris 24–37): menyebarkan (`...base`) objek `sampleImpactReport` dari `mockData.ts`, lalu menimpa hanya 7 field:
- **Ditimpa per misi:** `userName`, `missionName`, `business`, `summary` (+ catatan user), `provenSkills`, `ownerName`, `strengthenedPotential`, `date`
- **TIDAK ditimpa (selalu dari data Warung Bu Sari):** `metrics`, `hours`, `nextSteps`, `ownerTestimonial`

Ini berarti untuk misi Kopi Tetangga atau Batik Ibu Lastri, Impact Report akan menampilkan:
- Metrik *"Unggahan siap pakai: 0 → 10"*, *"Pengikut akun: 0 → 85"*, *"Pembeli baru per minggu: 2 → 7"* — tidak relevan untuk kedai kopi atau pengrajin batik.
- Jam kerja selalu **6 jam** (meski durasi misi berbeda).
- Testimoni default: *"Sekarang saya tahu mau unggah apa setiap hari. Pembeli baru mulai datang dan bilang tahu warung ini dari Instagram."* — jelas dari Warung Bu Sari, bukan Arif atau Ibu Lastri.

---

## 4. TES ALUR DENGAN 3 SKENARIO JAWABAN

> Skenario diuji secara analitis menggunakan kalkulasi manual sesuai algoritma di `analyzePotential.ts`. Tidak ada browser automation yang dijalankan; semua nilai dihitung berdasarkan kode yang terbaca.

### Skenario A — Pendengar Empatik

**Jawaban yang dimasukkan:**
- Q1: `b` — "Ngobrol dan mendengarkan cerita teman" (sinyal: komunikasi, empati)
- Q2: `d` — "Mendengarkan curhat" (sinyal: empati)
- Q4: `d` — "Penengah bila ada perbedaan pendapat" (sinyal: empati, komunikasi)
- Q5: `b` — "Bertanya ke orang yang mengalaminya" (sinyal: empati, komunikasi)
- Q8: `b` — "Ada orang yang terbantu secara nyata" (sinyal: empati)
- Q3, Q7, Q10: teks kosong

**Skor sinyal (weight default 1,5 kecuali Q5 yang tidak punya slider):**

| Sinyal | Skor |
|---|---|
| Empati | 7,0 |
| Komunikasi | 4,0 |
| Visual, Analitis, Organisasi, Teknologi | 0 |

**Potensi yang keluar:**
1. **Pendengar Peka** — skor 11,0 — confidence **Tinggi** ✅
2. **Pencerita Merek** — skor 4,0 — confidence Sedang
3. **Penggerak Rapi** — skor 4,0 — confidence Sedang

**Bukti kutipan:** "Ngobrol dan mendengarkan cerita teman" → *"Pilihan ini menunjukkan kecenderungan empati."*

**Misi yang direkomendasikan:** Warung Bu Sari (matchSignals: komunikasi, visual; terdekat dengan top signals empati+komunikasi)

**Grafik radar:** Empati: 7,0 | Komunikasi: 4,0 | lainnya: 0

---

### Skenario B — Teknis/Developer

**Jawaban yang dimasukkan:**
- Q1: `d` — "Mengutak-atik aplikasi, gawai, atau kode" (teknologi, analitis)
- Q2: `f` — "Membereskan masalah gawai" (teknologi)
- Q5: `c` — "Mencoba alat atau cara baru sampai berhasil" (teknologi)
- Q6: `d` — "Alat pemrograman atau no-code" (teknologi)
- Q8: `c` — "Angkanya naik dan bisa dibuktikan" (analitis)
- Q3 teks: "saya membuat website dan berhasil membuat data lebih rapi" → keyword hit: `website` (+1,5 teknologi), `data` (+1,5 analitis)
- Q7 teks: "ingin membuat aplikasi untuk warga" → `aplikasi` (+1,5 teknologi), `warga` (+1,5 empati)

**Skor sinyal:**

| Sinyal | Skor |
|---|---|
| Teknologi | 11,5 |
| Analitis | 4,5 |
| Empati | 1,5 |
| lainnya | 0 |

**Potensi yang keluar:**
1. **Pembangun Solusi Digital** — skor 16,0 — confidence **Tinggi** ✅
2. **Perancang Visual** — skor 11,5 — confidence Sedang
3. **Pemecah Masalah Berbasis Data** — skor 4,5 — confidence Sedang

**Misi yang direkomendasikan:** Kopi Tetangga (matchSignals: analitis, organisasi; cocok dengan teknologi+analitis)

**Grafik radar:** Teknologi: 11,5 | Analitis: 4,5 | Empati: 1,5 | lainnya: 0

---

### Skenario C — Semua Pilihan Pertama, Teks Kosong

**Jawaban yang dimasukkan:** Q1:`a`, Q2:`a`, Q4:`a`, Q5:`a`, Q6:`a`, Q8:`a`; Q3, Q7, Q10 dikosongkan.

**Skor sinyal:**

| Sinyal | Skor |
|---|---|
| Visual | 4,5 |
| Teknologi | 1,5 |
| Komunikasi | 1,5 |
| Organisasi | 1,5 |
| Analitis | 1,0 |
| Empati | 0 |

**Potensi yang keluar** (skor p1 dan p2 identik = 6,0; urutan ditentukan posisi array asli di V8 stable sort):
1. **Pencerita Merek** — skor 6,0 — confidence **Tinggi** (threshold: `i===0 && score>=6`)
2. **Perancang Visual** — skor 6,0 — confidence Sedang
3. **Penggerak Rapi** — skor 3,0 — confidence Sedang

**Catatan kritis:** Ketika dua potensi memiliki skor sama dan keduanya di posisi `i===0` sesudah sort, hanya satu yang mendapat label "Tinggi" bergantung pada urutan asli array. Ini adalah **tie-breaking yang tidak terdokumentasi** dan bisa berubah di runtime berbeda.

**Misi yang direkomendasikan:** Warung Bu Sari (matchSignals komunikasi+visual cocok)

---

### Kesimpulan Diferensiasi

**BERFUNGSI** — Ketiga skenario menghasilkan TOP-1 yang berbeda (Pendengar Peka / Pembangun Digital / Pencerita Merek). Algoritma cukup sensitif terhadap input yang berbeda secara signifikan. Namun jika pengguna memberikan jawaban yang seimbang antara dua sinyal, hasilnya bisa berbeda hanya karena urutan array internal (tidak transparan ke pengguna).

---

## 5. FUNGSIONALITAS DAN TEKNIS (bobot nilai 20%)

### Alur Penuh
**BERFUNGSI** — Build produksi berhasil (`vite build` exit code 0, 2.098 modul, 8,08 detik). Server dev aktif di `http://localhost:8443`, HTTP 200 terverifikasi.

### Refresh Halaman di Tengah Alur
**BERFUNGSI** — `lib.ts` baris 31–38: state dipulihkan dari `localStorage`. Satu pengaman: jika layar adalah `loading`, dipulihkan ke `results` (jika ada result) atau `quiz`.

### Tombol Kembali Browser
**TIDAK BISA DIVERIFIKASI** — Tidak ada `useHistory` / React Router. Navigasi berbasis state, bukan URL. Tombol Kembali browser akan keluar dari halaman, bukan navigasi antar layar — ini **bisa mengejutkan pengguna** saat demo.

### Jawaban Terbuka Dikosongkan
**BERFUNGSI** — `Intro.tsx` baris 86: `q.type === 'text' ? true : ...` membuat tombol Lanjut selalu aktif untuk pertanyaan teks. Semua pertanyaan teks bisa dilewati.

### Teks Sangat Panjang
**SEBAGIAN** — Textarea Q3/Q7/Q10 memiliki `maxLength={300}` (baris 66). Input chat Workspace tidak memiliki maxLength — teks tidak terbatas bisa dikirim ke mentor (meski tidak diproses).

### Error & Peringatan di Konsol
**TIDAK BISA DIVERIFIKASI PENUH** (tidak ada browser automation). Berdasarkan analisis kode:
- Google Fonts (`index.css` baris 1) dimuat dari `fonts.googleapis.com` — peringatan Content Security Policy mungkin muncul di beberapa environment.
- `vite.config.ts` baris 27 mencetak: `[PLUGIN_TIMINGS] Warning: Your build spent significant time in plugin figma-linked-package-sourcemaps` — terlihat saat build, tidak muncul di runtime.
- Tidak ada `console.log` atau `console.error` yang ditemukan di `src/`.

### API Key / Rahasia di Kode
**TIDAK ADA.** Pencarian pola `API_KEY`, `api_key`, `VITE_`, `process.env.`, `import.meta.env` di seluruh `src/` menemukan **hanya satu hasil**: `vite.config.ts` baris 16 menggunakan `process.env.FIGMA_PUBLIC_URL` sebagai base URL — ini adalah variabel build environment Figma, bukan API key/secret. Tidak ada nilai sensitif yang hardcode.

### Penyimpanan Data
**BERFUNGSI** — Semua data tersimpan di `localStorage` dengan kunci `'jejakbakat:v1'` (`lib.ts` baris 29). Isi: seluruh objek `AppState` (jawaban, hasil analisis, progres misi, catatan, riwayat chat). **Tidak ada data yang dikirim ke server atau LLM** — dikonfirmasi dengan pencarian pola `fetch`, `axios`, `XMLHttpRequest`, `http`, `api.` di `src/` — hasil nol.

Satu panggilan jaringan yang ada: Google Fonts (`fonts.googleapis.com`) dimuat di CSS untuk font Inter dan Source Serif 4. Ini adalah aset statis, bukan data pengguna.

---

## 6. DAFTAR FITUR DAN STATUSNYA

| Fitur | Status | Bukti |
|---|---|---|
| Kuesioner 10 pertanyaan | BERFUNGSI | `mockData.ts` baris 21–131: array `questions` berisi 10 item (q1–q10); `Quiz` di `Intro.tsx` baris 82–116 |
| Slider "Seberapa sering" dan "Seberapa menyenangkan" | BERFUNGSI | `Intro.tsx` baris 73–76: komponen `Scale` muncul setelah soal `hasFrequency:true` dijawab |
| Loading / animasi analisis | BERFUNGSI | `Intro.tsx` baris 118–169: animasi trail + dot-gather + delay 1,5 detik |
| Hasil potensi (3 kartu) | BERFUNGSI | `Results.tsx` baris 186–191: `result.potentials.map()` — maks 3 kartu |
| Kartu flip 3D | BERFUNGSI | `Results.tsx` baris 100–151: class `.flip` + CSS `index.css` baris 115–143 |
| Grafik radar | BERFUNGSI | `PotensiRadar.tsx` baris 63–138: SVG 6-sumbu; skor dihitung real-time dari jawaban |
| Label "Contoh data" di radar | BERFUNGSI | `PotensiRadar.tsx` baris 131: `{!real && <figcaption>Contoh data...</figcaption>}` |
| Rekomendasi misi (urutan relevansi) | BERFUNGSI | `Results.tsx` baris 158–163: diurutkan berdasarkan overlap sinyal dengan top potensi |
| Detail misi | BERFUNGSI | `Results.tsx` baris 249–340: komponen `MissionDetail` |
| Ruang kerja mentor (chat) | PALSU | `Workspace.tsx` baris 51–58: chat terhubung ke `mentorReply` yang hanya merotasi 3 string statis; pesan pengguna tidak dibaca |
| Roadmap 3 langkah dengan penguncian | BERFUNGSI | `Workspace.tsx` baris 83–106: langkah terkunci jika sebelumnya belum selesai |
| Checklist tugas per langkah | BERFUNGSI | `Workspace.tsx` baris 111–123: checkbox persisten ke localStorage |
| Catatan hasil per langkah | BERFUNGSI | `Workspace.tsx` baris 124–127: textarea disimpan ke `state.notes` |
| Impact Report | SEBAGIAN | Misi-spesifik sebagian; metrik, jam, dan testimoni selalu dari data Warung Bu Sari (lihat Bagian 3.3) |
| Unduh/Cetak PDF | BERFUNGSI | `Report.tsx` baris 95: `window.print()` — mencetak halaman sebagai PDF via browser |
| Salin untuk CV | BERFUNGSI | `Report.tsx` baris 32–34: `navigator.clipboard.writeText(text)` |
| Bagikan | BERFUNGSI | `Report.tsx` baris 36–39: `navigator.share()` dengan fallback clipboard |
| Maskot Jeje (6 mood, animasi) | BERFUNGSI | `Mentor.tsx` baris 30–197: SVG dengan 6 kelas mood; `mentor.css`: keyframe breathe, blink, tilt, twitch, tap |
| Jeje interaktif (klik → salto) | BERFUNGSI | `PotensiRadar.tsx` baris 133–135: `jeje-tumble` animation + `interactive` prop |
| Intro perkenalan mentor | BERFUNGSI | `screens/Intro2.tsx`: layar `intro` menampilkan Jeje + teks perkenalan |
| ChunkyButton | BELUM ADA | Tidak ditemukan komponen bernama `ChunkyButton` di seluruh `src/` |
| MentorIntro sebagai komponen | BELUM ADA | Tidak ada komponen bernama `MentorIntro`; fungsinya ada di `screens/Intro2.tsx` |
| Progress bar kuesioner | BERFUNGSI | `Intro.tsx` baris 12–24: `Trail` menghitung jumlah pertanyaan yang sudah dijawab |
| Riwayat chat persisten | BERFUNGSI | `Workspace.tsx` baris 32: `patch({ chats })` menyimpan ke localStorage via `state.chats` (`lib.ts` baris 21) |
| Auto scroll-to-top antar layar | BERFUNGSI | `App.tsx` baris 19: `window.scrollTo({ top: 0, behavior: 'instant' })` |

---

## 7. DATA CONTOH

Semua data berikut ditulis langsung di kode (`src/data/mockData.ts`) dan tampil ke pengguna sebagai hasil nyata.

### Misi UMKM

| Data | Lokasi | Tampil sebagai | Label "contoh" di UI? |
|---|---|---|---|
| Warung Bu Sari (semua detail) | `mockData.ts` baris 190–211 | Misi nyata | TIDAK |
| Kopi Tetangga (semua detail) | `mockData.ts` baris 212–233 | Misi nyata | TIDAK |
| Batik Ibu Lastri (semua detail) | `mockData.ts` baris 234–255 | Misi nyata | TIDAK |

### Balasan Mentor (muncul di chat Workspace)

| Kategori | Jumlah | Lokasi | Tampil sebagai | Label "contoh"? |
|---|---|---|---|---|
| `hint` | 3 string | `mockData.ts` baris 266–270 | Respons AI | TIDAK |
| `check` | 3 string | baris 271–275 | Respons AI | TIDAK |
| `example` | 2 string | baris 276–279 | Respons AI | TIDAK |
| `general` | 3 string | baris 280–284 | Respons AI | TIDAK |

### Impact Report (data contoh yang tidak diganti per misi)

| Field | Nilai hardcode | Lokasi | Misi yang terpengaruh | Label "contoh"? |
|---|---|---|---|---|
| `metrics[0]` | Unggahan siap pakai: 0 → 10 | `mockData.ts` baris 310 | SEMUA misi | TIDAK |
| `metrics[1]` | Pengikut akun: 0 → 85 | baris 311 | SEMUA misi | TIDAK |
| `metrics[2]` | Pembeli baru per minggu: 2 → 7 | baris 312 | SEMUA misi | TIDAK |
| `hours` | 6 | baris 314 | SEMUA misi | TIDAK |
| `ownerTestimonial` | "Sekarang saya tahu mau unggah apa setiap hari…" (teks Bu Sari) | baris 315 | SEMUA misi (default) | TIDAK |
| `nextSteps` | 3 saran spesifik Warung Bu Sari | baris 317–319 | SEMUA misi | TIDAK |

### Radar di Halaman Beranda (sebelum kuesioner)

Data contoh radar: `komunikasi:6.2, visual:8.4, analitis:3.1, organisasi:5.0, empati:7.3, teknologi:4.2` (`PotensiRadar.tsx` baris 10). **Label "Contoh data" BERFUNGSI** — terlihat sebagai `<figcaption>` kecil di bawah grafik (`PotensiRadar.tsx` baris 131). Ini satu-satunya data contoh yang diberi label.

---

## 8. KEPATUHAN DESAIN

> Tidak ada file `Guidelines.md` atau dokumen desain formal di repositori. Penilaian didasarkan pada perbandingan internal antar-file dan konsistensi visual.

### Palet Warna
**BERFUNGSI** — Token warna didefinisikan di `index.css` baris 4–20 (`@theme`). Komponen menggunakan token ini secara konsisten (`text-muted`, `text-ink`, `bg-paper`, `bg-clay-soft`, dll.). Ditemukan beberapa nilai hex hardcode langsung di JSX (misalnya `bg-[#7c4dff]`, `bg-[#e9e2ff]`), terutama di `Results.tsx` — tidak ideal tapi tidak inkonsisten secara visual.

### Font
**BERFUNGSI** — Dua font: `Source Serif 4` untuk `font-display` (judul h1–h3) dan `Inter` untuk `font-sans` (body). Keduanya dimuat dari Google Fonts (`index.css` baris 1) dan didefinisikan sebagai token Tailwind v4 (`index.css` baris 5–6).

### Kartu / Sheet
**BERFUNGSI** — Kelas `.sheet` (`index.css` baris 63: `border-radius: 24px`, `border: 1.5px solid var(--color-line)`) dipakai konsisten. Kartu flip menggunakan `border-radius: 28px` (sedikit berbeda — dapat diterima).

### Aturan "Satu Mentor per Layar"
**SEBAGIAN** — Sebagian besar layar mengikuti aturan ini. Pengecualian: di layar `Results.tsx` (Detail Misi), terdapat `<Mentor mood="idle" size={240}>` di sidebar dan `<MentorSay>` tidak tampil di sana. Di `Workspace.tsx`, `MentorSay` muncul di panel chat (bukan sebagai elemen mandiri terpisah). Secara umum tidak ada dua maskot Jeje yang terlihat bersamaan.

### Teks Bahasa Inggris / Placeholder
**BERFUNGSI** — Tidak ditemukan teks UI berbahasa Inggris yang terlihat ke pengguna. Semua teks label, placeholder, tooltip, dan error message dalam Bahasa Indonesia. Satu pengecualian non-UI: `site.json` baris 2 berisi deskripsi berbahasa Inggris (`"A web app designed to present..."`) — ini metadata Figma Make, tidak terlihat pengguna.

---

## 9. TEKS PRIVASI

### Teks yang tampil ke pengguna (disalin persis):

**Di halaman beranda (Landing.tsx baris 59):**
> "Jawabanmu hanya tersimpan di perangkatmu."

**Di footer beranda (Landing.tsx baris 154):**
> "Jawabanmu hanya tersimpan di perangkatmu."

**Di bawah tombol Mulai (Landing.tsx baris 59, dimunculkan saat ada data):**
> "Jawabanmu hanya tersimpan di perangkatmu."

### Kesesuaian dengan kenyataan teknis:

**BERFUNGSI — klaim ini AKURAT.** Verifikasi:
1. `lib.ts` baris 29–44: satu-satunya penyimpanan adalah `localStorage.setItem('jejakbakat:v1', JSON.stringify(state))`.
2. Pencarian menyeluruh di `src/` untuk `fetch`, `axios`, `XMLHttpRequest`, `http`, `api.` — **hasil nol**. Tidak ada panggilan jaringan yang mengirim data pengguna.
3. Satu panggilan jaringan yang ada (Google Fonts) hanya mengunduh file CSS/font, tidak mengirim data pengguna.

Klaim privasi sepenuhnya valid secara teknis. Data pengguna (jawaban, nama, catatan, testimoni yang diketik) tidak pernah meninggalkan perangkat.

---

## 10. MASALAH DAN RISIKO

Diurutkan dari paling berbahaya untuk demo:

| # | Masalah | Lokasi | Risiko | Saran (1 kalimat) |
|---|---|---|---|---|
| 1 | **Impact Report selalu pakai metrik Warung Bu Sari** untuk semua misi: angka pengikut, unggahan, testimoni "Instagram" muncul di laporan Kopi Tetangga/Batik Ibu Lastri | `mentor.ts` baris 24–37; `mockData.ts` baris 309–319 | KRITIS — langsung terlihat jika juri uji 2 misi | Tambahkan `metrics` dan `ownerTestimonial` yang spesifik per misi di `mockData.ts` dan override di `buildImpactReport` |
| 2 | **Mentor tidak membaca pesan pengguna sama sekali** (`_message` parameter diabaikan); balasan adalah rotasi string statis | `mentor.ts` baris 8: `_message` | TINGGI — mudah terbongkar saat demo interaktif | Integrasikan LLM nyata atau minimal echo kata kunci dari pesan pengguna ke dalam respons |
| 3 | **Tombol Kembali browser keluar dari halaman**, bukan kembali ke layar sebelumnya (tidak ada routing URL) | `App.tsx` — tidak ada React Router | TINGGI — pengguna bisa kehilangan progres | Tambahkan React Router atau manajemen history |
| 4 | **Pesan error loading menyesatkan**: "Koneksi terputus. Periksa internetmu" padahal analisis sepenuhnya lokal | `Intro.tsx` baris 149 | SEDANG — membingungkan jika error terjadi saat demo | Ganti pesan menjadi "Terjadi kesalahan. Muat ulang halaman." |
| 5 | **Tie-breaking skor tidak deterministik** di Skenario C: dua potensi dengan skor sama bergantung urutan array internal | `analyzePotential.ts` baris 53 | SEDANG — hasil bisa berbeda di browser berbeda | Tambahkan kriteria tie-breaking eksplisit (misalnya bobot `q.hasFrequency`) |
| 6 | **nextSteps di Impact Report tidak misi-spesifik**: saran selalu "coba misi dengan data atau angka" meskipun misi yang baru selesai justru misi data | `mockData.ts` baris 317–319; `mentor.ts` baris 24 | SEDANG — terlihat janggal oleh juri yang cermat | Tambahkan `nextSteps` per misi di `mockData.ts` dan override di `buildImpactReport` |
| 7 | **Google Fonts bergantung koneksi internet**: jika jaringan lambat saat demo, font tidak termuat, tampilan berubah | `index.css` baris 1 | SEDANG — risiko tampilan demo | Self-host font atau gunakan font-display=swap dengan fallback yang sesuai |
| 8 | **Counter mentor reset setiap refresh**: rotasi balasan selalu dari awal, pengguna yang refresh berulang selalu melihat pesan yang sama | `mentor.ts` baris 5: `const counters = {}` | RENDAH | Simpan counter ke `sessionStorage` |
| 9 | **Teks terbuka q10 bisa kosong sepenuhnya** dan ini diperbolehkan, tapi ini tidak benar-benar merepresentasikan "AI yang membaca pola" jika sebagian besar soal teks tidak diisi | Desain sistem — `analyzePotential.ts` | RENDAH — lebih ke kualitas hasil | Tambahkan saran di UI untuk mengisi setidaknya satu soal teks |

---

## 11. YANG TIDAK BISA DIVERIFIKASI

Hal-hal berikut **tidak dapat diuji** dalam audit ini dan perlu dicek manual oleh manusia:

| Item | Alasan tidak dapat diverifikasi |
|---|---|
| **Tampilan di perangkat mobile fisik (HP Android/iOS)** | Tidak ada perangkat fisik; hanya bisa diakses di browser desktop lokal |
| **Perilaku di resolusi 390 px (iPhone 14)** | Tidak ada browser automation — tidak bisa mengatur lebar viewport dan mengambil screenshot |
| **Error dan peringatan di konsol browser** | Tidak ada DevTools yang terbuka; audit hanya menganalisis kode statis |
| **Performa animasi (60fps vs jank)** | Memerlukan profiling di browser nyata |
| **Fungsi `window.print()` / Unduh PDF** | Memerlukan browser nyata untuk menjalankan dialog print |
| **`navigator.share()` di iOS/Android** | API berbeda antar platform; perlu uji fisik |
| **Perilaku di jaringan lambat / offline** | Tidak bisa disimulasikan tanpa tools seperti Lighthouse throttling |
| **Kredit/kuota API** | Tidak ada API — tidak relevan; tapi jika LLM diintegrasikan nanti, ini perlu dipantau |
| **Aksesibilitas layar (screen reader NVDA/JAWS)** | Memerlukan software screen reader yang berjalan |
| **Perilaku localStorage di private/incognito mode** | Beberapa browser membatasi localStorage di mode ini |
| **Font Google Fonts jika pengguna memblokir tracker** | Beberapa ekstensi browser memblokir fonts.googleapis.com |
| **Keamanan HTTPS saat deploy ke publik** | Saat ini hanya HTTP lokal; perlu uji setelah deploy |

---

*Tidak ada kode yang diubah selama audit ini.*

