/** Hiasan latar halaman Potensimu: gumpalan warna lembut, pola titik, dan jejak putus-putus. Statis dan tidak ramai. */
export function ResultsBackdrop() {
  return (
    <div aria-hidden className="no-print pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* gumpalan warna */}
      <div className="absolute -left-40 top-24 h-[420px] w-[420px] rounded-full bg-[#c9b8ff] opacity-50 blur-[90px]" />
      <div className="absolute -right-32 top-[18%] h-[380px] w-[380px] rounded-full bg-[#b9f0cf] opacity-60 blur-[90px]" />
      <div className="absolute -left-28 top-[48%] h-[360px] w-[360px] rounded-full bg-[#ffd9b8] opacity-50 blur-[90px]" />
      <div className="absolute -right-40 top-[74%] h-[420px] w-[420px] rounded-full bg-[#d9ccff] opacity-60 blur-[90px]" />
      <div className="absolute bottom-0 left-1/4 h-[320px] w-[480px] rounded-full bg-[#c9b8ff] opacity-40 blur-[100px]" />

      {/* pola titik yang memudar ke bawah */}
      <div className="absolute inset-x-0 top-0 h-[900px] opacity-60"
        style={{
          backgroundImage: 'radial-gradient(#b7a6f5 1.2px, transparent 1.4px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 0, transparent 100%)',
        }} />

      {/* jejak putus-putus */}
      <svg className="absolute left-0 top-[8%] w-full" viewBox="0 0 1200 300" fill="none" preserveAspectRatio="none" style={{ height: 300 }}>
        <path d="M-20 220 C 180 60, 320 300, 560 150 S 960 20, 1220 130" stroke="#8b6cff" strokeOpacity=".35" strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      <svg className="absolute left-0 top-[58%] w-full" viewBox="0 0 1200 300" fill="none" preserveAspectRatio="none" style={{ height: 260 }}>
        <path d="M1220 60 C 980 240, 820 0, 560 140 S 160 260, -20 90" stroke="#16a34a" strokeOpacity=".3" strokeWidth="2.5" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>

      {/* bintang kecil */}
      {[['8%', '14%'], ['90%', '9%'], ['94%', '44%'], ['5%', '66%'], ['88%', '88%']].map(([l, t], i) => (
        <svg key={i} className="absolute h-5 w-5 text-[#8b6cff] opacity-50" style={{ left: l, top: t }} viewBox="-10 -10 20 20">
          <path d="M0 -9 Q1 -1 9 0 Q1 1 0 9 Q-1 1 -9 0 Q-1 -1 0 -9Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  )
}
