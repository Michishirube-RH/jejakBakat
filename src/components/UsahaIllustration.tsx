import type { JenisUsaha } from '../data/umkmTypes'

/**
 * Ilustrasi sederhana per jenis usaha, digambar langsung sebagai SVG.
 * Dipakai pada kartu di layar Pilih UMKM sebagai pengganti foto usaha,
 * karena Geoapify Places tidak menyediakan foto tempat.
 *
 * Gaya: bidang warna lembut, garis tebal, tanpa detail kecil agar tetap
 * jelas pada layar sempit. Setiap jenis punya bentuk pembeda yang khas,
 * bukan hanya kotak dengan atap berbeda warna.
 */

type Props = {
  jenis: JenisUsaha
  className?: string
}

/** Latar berbeda per jenis agar kartu tidak terlihat seragam. */
const LATAR: Record<string, string> = {
  'Warung makan': '#ffe9cc',
  'Kedai kopi': '#d8f5e1',
  'Kue dan roti': '#fde4ef',
  'Toko kelontong': '#e9e2ff',
  'Jasa katering': '#fff3c4',
  'Toko pakaian/kriya': '#dcecff',
  Lainnya: '#ece7dd',
}

const TINTA = '#3b2a1a'

function Badan({ jenis }: { jenis: JenisUsaha }) {
  switch (jenis) {
    /* Warung makan: tenda bergaris + meja saji dengan piring menonjol. */
    case 'Warung makan':
      return (
        <>
          {/* Tenda warung bergaris vertikal */}
          <path d="M18 30h84l-6-13H24z" fill="#e04f3d" />
          <path d="M36 17v13M52 17v13M68 17v13M84 17v13" stroke="#fff" strokeWidth="4" opacity=".85" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          {/* Etalase kaca di sisi kiri */}
          <rect x="28" y="38" width="30" height="24" rx="2" fill="#ffe9cc" stroke={TINTA} strokeWidth="2" />
          <circle cx="37" cy="50" r="4.5" fill="#f7c948" stroke={TINTA} strokeWidth="1.6" />
          <circle cx="50" cy="50" r="4.5" fill="#e8a86a" stroke={TINTA} strokeWidth="1.6" />
          {/* Meja panjang + piring besar */}
          <rect x="62" y="52" width="32" height="5" rx="2" fill={TINTA} opacity=".25" />
          <ellipse cx="78" cy="50" rx="12" ry="6" fill="#fff" stroke={TINTA} strokeWidth="2.2" />
          <ellipse cx="78" cy="50" rx="6" ry="3" fill="#f7c948" />
          {/* Uap hangat */}
          <path d="M74 40c1.5-2.5 0-5 0-5M82 40c1.5-2.5 0-5 0-5" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" opacity=".5" fill="none" />
        </>
      )

    /* Kedai kopi: cangkir besar menonjol + papan nama menggantung. */
    case 'Kedai kopi':
      return (
        <>
          <path d="M18 30h84l-6-13H24z" fill="#2f7d4f" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          {/* Papan nama kayu */}
          <rect x="34" y="37" width="52" height="13" rx="3" fill="#8b5a2b" stroke={TINTA} strokeWidth="2.2" />
          <path d="M42 43.5h36" stroke="#fff8ee" strokeWidth="2.4" strokeLinecap="round" opacity=".85" />
          {/* Cangkir besar di tengah meja */}
          <path d="M48 58h24v9a12 12 0 0 1-24 0z" fill="#c98a4b" stroke={TINTA} strokeWidth="2.5" />
          <path d="M72 60h4.5a4.5 4.5 0 0 1 0 9H72" stroke={TINTA} strokeWidth="2.5" fill="none" />
          <ellipse cx="60" cy="58" rx="12" ry="3.4" fill="#5b3a1a" stroke={TINTA} strokeWidth="2" />
          {/* Uap */}
          <path d="M55 52c1.6-2.6 0-5.4 0-5.4M65 52c1.6-2.6 0-5.4 0-5.4" stroke={TINTA} strokeWidth="1.9" strokeLinecap="round" opacity=".55" fill="none" />
          <rect x="22" y="72" width="76" height="6" fill={TINTA} opacity=".16" />
        </>
      )

    /* Kue dan roti: rak bertingkat penuh kue + roti panjang. */
    case 'Kue dan roti':
      return (
        <>
          <path d="M18 30h84l-5-13H23z" fill="#e2739f" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          {/* Rak atas: kue bulat berwarna */}
          <line x1="28" y1="48" x2="92" y2="48" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" />
          {[
            { x: 35, c: '#f7c948' },
            { x: 47, c: '#e2739f' },
            { x: 59, c: '#8b5a2b' },
            { x: 71, c: '#f7c948' },
            { x: 84, c: '#e2739f' },
          ].map((k) => (
            <g key={k.x}>
              <circle cx={k.x} cy="41" r="5.5" fill={k.c} stroke={TINTA} strokeWidth="1.8" />
              <circle cx={k.x} cy="39" r="1.6" fill="#fff" opacity=".9" />
            </g>
          ))}
          {/* Rak bawah: roti panjang + talenan */}
          <ellipse cx="45" cy="63" rx="17" ry="8" fill="#e8a86a" stroke={TINTA} strokeWidth="2.5" />
          <path d="M34 62c5-3 16-3 22 0M38 66c5-2 13-2 17 0" stroke={TINTA} strokeWidth="1.5" fill="none" opacity=".55" />
          <rect x="66" y="55" width="20" height="16" rx="2.5" fill="#fde4ef" stroke={TINTA} strokeWidth="2.2" />
          <path d="M70 63h12" stroke="#e2739f" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="22" y="72" width="76" height="6" fill={TINTA} opacity=".14" />
        </>
      )

    /* Toko kelontong: rak tiga baris penuh barang berwarna. */
    case 'Toko kelontong':
      return (
        <>
          <path d="M18 30h84l-6-13H24z" fill="#5b8def" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          {/* Rak */}
          <line x1="28" y1="45" x2="74" y2="45" stroke={TINTA} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="28" y1="58" x2="74" y2="58" stroke={TINTA} strokeWidth="2.2" strokeLinecap="round" />
          {[
            { y: 36, cs: ['#f7c948', '#7ec98f', '#e2739f', '#8b5a2b'] },
            { y: 49, cs: ['#7ec98f', '#f7c948', '#8b5a2b', '#e2739f'] },
          ].map((baris) =>
            baris.cs.map((c, i) => (
              <rect
                key={`${baris.y}-${i}`}
                x={31 + i * 11}
                y={baris.y}
                width="8"
                height="8"
                rx="1.6"
                fill={c}
                stroke={TINTA}
                strokeWidth="1.5"
              />
            )),
          )}
          {/* Botol tinggi di ujung rak bawah */}
          <rect x="66" y="47" width="6" height="10" rx="2" fill="#8b5a2b" stroke={TINTA} strokeWidth="1.5" />
          {/* Kasir di kanan bawah */}
          <rect x="76" y="56" width="18" height="16" rx="2.5" fill="#e9e2ff" stroke={TINTA} strokeWidth="2.2" />
          <rect x="80" y="60" width="10" height="5" rx="1.2" fill={TINTA} opacity=".25" />
          <rect x="22" y="72" width="76" height="6" fill={TINTA} opacity=".14" />
        </>
      )

    /* Jasa katering: nampan besar berisi piring tertutup + tutup saji. */
    case 'Jasa katering':
      return (
        <>
          {/* Tutup saji melengkung */}
          <path d="M30 52c0-16 12-24 30-24s30 8 30 24z" fill="#f2b8cd" stroke={TINTA} strokeWidth="2.5" />
          <circle cx="60" cy="25" r="4" fill="#e2739f" stroke={TINTA} strokeWidth="2" />
          <path d="M40 44c6-8 34-8 40 0" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".7" />
          {/* Nampan bawah */}
          <rect x="22" y="52" width="76" height="9" rx="3" fill="#e04f3d" stroke={TINTA} strokeWidth="2.5" />
          {/* Kaki nampan */}
          <path d="M38 61v10M82 61v10" stroke={TINTA} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="30" y="71" width="60" height="4" rx="2" fill={TINTA} opacity=".18" />
        </>
      )

    /* Toko pakaian/kriya: gantungan baju + kaus dan benang. */
    case 'Toko pakaian/kriya':
      return (
        <>
          <path d="M18 30h84l-6-13H24z" fill="#7c4dff" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          {/* Palang gantungan */}
          <line x1="30" y1="38" x2="80" y2="38" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" />
          {/* Kaus di gantungan */}
          <path d="M46 42l-8 5 4 6 4-2v14h16V51l4 2 4-6-8-5-4 3h-4z" fill="#5b8def" stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round" />
          {/* Gulungan benang */}
          <circle cx="80" cy="60" r="7" fill="#e2739f" stroke={TINTA} strokeWidth="2.2" />
          <path d="M74 58h12M74 62h12" stroke={TINTA} strokeWidth="1.5" opacity=".55" />
          <rect x="22" y="72" width="76" height="6" fill={TINTA} opacity=".14" />
        </>
      )

    /* Jenis yang belum punya ilustrasi khusus: bentuk toko umum. */
    default:
      return (
        <>
          <path d="M18 30h84l-6-13H24z" fill="#8d8577" />
          <rect x="22" y="30" width="76" height="46" rx="3" fill="#fff8ee" stroke={TINTA} strokeWidth="2.5" />
          <rect x="30" y="40" width="24" height="20" rx="2" fill="#e6c9a8" stroke={TINTA} strokeWidth="2.2" />
          <rect x="62" y="40" width="24" height="20" rx="2" fill="#e6c9a8" stroke={TINTA} strokeWidth="2.2" />
          <path d="M34 50h16M66 50h16" stroke={TINTA} strokeWidth="1.6" opacity=".6" />
          <rect x="52" y="62" width="16" height="18" rx="2" fill="#8d8577" stroke={TINTA} strokeWidth="2.2" />
          <rect x="22" y="72" width="76" height="6" fill={TINTA} opacity=".14" />
        </>
      )
  }
}

export function UsahaIllustration({ jenis, className = '' }: Props) {
  const latar = LATAR[jenis] ?? LATAR.Lainnya
  return (
    <svg
      viewBox="0 0 120 96"
      role="img"
      aria-label={`Ilustrasi ${jenis}`}
      className={className}
      style={{ background: latar }}
      preserveAspectRatio="xMidYMid meet"
    >
      <Badan jenis={jenis} />
    </svg>
  )
}
