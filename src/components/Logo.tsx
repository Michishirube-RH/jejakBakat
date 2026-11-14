/**
 * Komponen Logo resmi JejakBakat AI.
 * Menggunakan lambang otak analitis & grafik potensi dengan panah bintang keberhasilan,
 * diwarnai sesuai palet tema: Violet (#7c5cff) & Emas (#f59e0b).
 */
export function Logo({
  className = 'h-9 w-9',
  alt = 'Logo JejakBakat AI',
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`object-contain flex-none ${className}`}
      draggable={false}
    />
  )
}
