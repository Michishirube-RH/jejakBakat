import { Check, MapPin, Phone } from 'lucide-react'
import { UsahaIllustration } from './UsahaIllustration'
import { cx } from '../lib'
import type { PlaceResult } from '../data/umkmTypes'

/**
 * Kartu bergambar untuk satu hasil pencarian usaha.
 *
 * Isinya hanya data yang benar-benar diketahui sebelum misi dirancang:
 * nama, jenis usaha, alamat, jam buka, telepon, dan jarak. Durasi, tingkat
 * kesulitan, serta kecocokan potensi sengaja tidak ditampilkan karena baru
 * dihitung AI setelah pengguna memilih usaha dan menceritakan masalahnya.
 */
export function UsahaCard({
  place,
  picked,
  center,
  onPick,
}: {
  place: PlaceResult
  picked: boolean
  /** Titik pusat pencarian, untuk menghitung jarak bila tersedia. */
  center?: { lat: number; lon: number } | null
  onPick: () => void
}) {
  const jarak = jarakKm(center, place)

  return (
    <button
      onClick={onPick}
      data-usaha-card="true"
      className={cx(
        'sheet flex w-full items-stretch gap-0 overflow-hidden p-0 text-left transition-colors hover:bg-clay-soft',
        picked && 'ring-2 ring-[#7c4dff]',
      )}
    >
      <UsahaIllustration
        jenis={place.jenisUsaha}
        className="h-[112px] w-[104px] flex-none self-center sm:h-[128px] sm:w-[132px]"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-6">{place.name}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{place.categoryLabel}</p>
          </div>
          {picked && (
            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#7c4dff]" aria-hidden>
              <Check size={15} strokeWidth={3} color="#fff" />
            </span>
          )}
        </div>

        {place.address && (
          <p className="flex items-start gap-1.5 text-sm leading-5 text-muted">
            <MapPin size={14} strokeWidth={1.75} className="mt-1 flex-none" aria-hidden />
            <span className="line-clamp-2">{place.address}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {jarak != null && <span>{jarak} km dari titik pusat</span>}
          {place.openingHours && <span className="truncate">Buka: {place.openingHours}</span>}
          {place.phone && (
            <span className="flex items-center gap-1">
              <Phone size={13} strokeWidth={1.75} aria-hidden />
              {place.phone}
            </span>
          )}
        </div>

        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-clay-soft px-3 py-1 text-sm font-semibold text-ink">
          Pilih usaha ini
        </span>
      </div>
    </button>
  )
}

/** Jarak garis lurus dalam km, dibulatkan satu desimal. */
function jarakKm(
  center?: { lat: number; lon: number } | null,
  place?: { lat?: number; lon?: number },
): string | null {
  if (!center || place?.lat == null || place?.lon == null) return null
  const R = 6371
  const dLat = ((place.lat - center.lat) * Math.PI) / 180
  const dLon = ((place.lon - center.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) * Math.cos((place.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  const d = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
  return d < 0.05 ? '<0,1' : d.toFixed(1).replace('.', ',')
}
