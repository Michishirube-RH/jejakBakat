import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, Copy, Download, Share2, Check } from 'lucide-react'
import { missions, potentials, type SampleImpactReport } from '../data/mockData'
import { buildImpactReport } from '../ai/mentor'
import { MentorSay } from '../components/Companion'
import { Page } from '../components/ui'
import { matchFor } from './Results'
import type { AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

export function Report({ state, patch }: P) {
  const mission = missions.find((m) => m.id === state.missionId)
  const [rep, setRep] = useState<SampleImpactReport | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!mission) return
    const pot = state.result?.potentials[0] ? potentials.find((p) => p.id === state.result!.potentials[0].potentialId) : matchFor(mission, state)
    buildImpactReport({ mission, userName: state.userName, notes: state.notes, potentialName: pot?.name ?? matchFor(mission, state).name }).then(setRep)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!mission) { patch({ screen: 'results' }); return null }
  if (!rep) return <Page><p className="text-muted" role="status">Menyusun laporan...</p></Page>

  const note = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const updateMetric = (optId: string, field: 'before' | 'after', val: string) => {
    const current = state.metricsData?.[optId] || { before: '', after: '' }
    patch({
      metricsData: {
        ...state.metricsData,
        [optId]: { ...current, [field]: val },
      },
    })
  }

  // Filter hanya metrik yang diisi pengguna
  const enteredMetrics = (mission.metricsOptions || [])
    .map((opt) => {
      const u = state.metricsData?.[opt.id]
      const before = u?.before?.trim()
      const after = u?.after?.trim()
      if (!before && !after) return null
      const unitStr = opt.unit ? ` ${opt.unit}` : ''
      if (before && after) return `${opt.label} dari ${before}${unitStr} menjadi ${after}${unitStr}`
      if (after) return `${opt.label} mencapai ${after}${unitStr}`
      return `${opt.label} awal: ${before}${unitStr}`
    })
    .filter(Boolean)

  const metricsSection = enteredMetrics.length > 0 ? ` Hasil: ${enteredMetrics.join('; ')}.` : ''
  const testimonialSection = state.ownerTestimonial?.trim()
    ? ` Testimoni pemilik (${state.ownerName?.trim() || mission.ownerName}): "${state.ownerTestimonial.trim()}".`
    : ''

  const name = state.userName?.trim() || 'Peserta'
  const text = `${name}: ${rep.missionName} (${rep.date}). ${rep.summary} Skill: ${rep.provenSkills.join(', ')}. ${rep.hours} jam kerja untuk ${rep.business}.${metricsSection}${testimonialSection}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); note('Teks CV disalin') } catch { note('Gagal menyalin. Salin manual dari lembar laporan.') }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: rep.missionName, text })
      else { await navigator.clipboard.writeText(text); note('Ringkasan disalin untuk dibagikan') }
    } catch { /* dibatalkan */ }
  }
  const field = 'w-full rounded-full bg-white px-4 py-2 ring-1 ring-line text-ink placeholder:text-ink/60'

  return (
    <Page narrow={false}>
      <MentorSay state={state} size={130} tone="white" className="mx-auto mb-6 max-w-[720px]" />
      <article className="report-sheet mx-auto max-w-[720px] rounded-[24px] bg-white p-7 text-ink md:p-10">
        <header className="border-b border-ink/10 pb-5">
          <p className="text-sm font-medium text-muted">Impact Report · JejakBakat AI</p>
          <h1 className="mt-2 text-[32px] leading-[1.15] tracking-[-0.02em] md:text-[44px]">{rep.missionName}</h1>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <label className="font-semibold">Nama kamu
              <input className={field + ' mt-1 font-normal'} value={state.userName} placeholder="Contoh: Rian Pratama" onChange={(e) => patch({ userName: e.target.value })} />
            </label>
            <div><p className="font-semibold">Tanggal</p><p className="mt-1 py-2">{rep.date}</p></div>
            <div><p className="font-semibold">UMKM</p><p>{rep.business}</p></div>
            <div className="flex items-center gap-1.5"><Clock size={16} strokeWidth={1.75} /><p><span className="font-semibold">{rep.hours} jam</span> kerja</p></div>
          </div>
        </header>

        <section className="mt-6"><h2 className="text-xl leading-[26px]">Ringkasan misi</h2><p className="mt-2 text-ink/80 leading-relaxed">{rep.summary}</p></section>

        <section className="mt-6"><h2 className="text-xl leading-[26px]">Skill yang terbukti</h2>
          <div className="mt-2 flex flex-wrap gap-2">{rep.provenSkills.map((s) => <span key={s} className="rounded-full bg-clay-soft px-3 py-1 text-sm font-medium text-ink">{s}</span>)}</div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h2 className="text-xl leading-[26px]">Hasil dan dampak</h2>
            <span className="text-xs text-muted">Isi angka sebelum dan sesudah kegiatan</span>
          </div>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                <th className="py-2 font-semibold">Ukuran</th>
                <th className="py-2 font-semibold w-28 sm:w-36">Sebelum</th>
                <th className="py-2 font-semibold w-28 sm:w-36">Sesudah</th>
              </tr>
            </thead>
            <tbody>
              {(mission.metricsOptions || []).map((opt) => {
                const u = state.metricsData?.[opt.id]
                const before = u?.before ?? ''
                const after = u?.after ?? ''
                return (
                  <tr key={opt.id} className="border-b border-ink/10">
                    <td className="py-2.5 pr-2">
                      <span className="font-medium text-ink">{opt.label}</span>
                      {opt.unit && <span className="ml-1 text-xs text-muted">({opt.unit})</span>}
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        className="w-full rounded-full bg-paper px-3 py-1 text-sm font-normal text-ink ring-1 ring-line placeholder:text-ink/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss print:hidden"
                        value={before}
                        placeholder={`Contoh: ${opt.sampleBefore}`}
                        onChange={(e) => updateMetric(opt.id, 'before', e.target.value)}
                      />
                      <span className="hidden print:inline text-sm font-normal text-ink">
                        {before || '-'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <input
                        type="text"
                        className="w-full rounded-full bg-paper px-3 py-1 text-sm font-semibold text-moss ring-1 ring-line placeholder:text-moss/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss print:hidden"
                        value={after}
                        placeholder={`Contoh: ${opt.sampleAfter}`}
                        onChange={(e) => updateMetric(opt.id, 'after', e.target.value)}
                      />
                      <span className="hidden print:inline text-sm font-semibold text-moss">
                        {after || '-'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-6 rounded-[20px] bg-paper p-5 print:bg-white print:p-0 print:border-t print:border-ink/10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl leading-[26px]">Verifikasi UMKM</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2.5 py-0.5 text-xs font-semibold text-ink"><BadgeCheck size={14} strokeWidth={1.75} />Diisi oleh pemilik usaha</span>
          </div>

          <div className="print:hidden">
            <label className="mt-3 block text-sm font-semibold">Testimoni
              <textarea
                rows={3}
                className={field + ' mt-1 resize-none !rounded-[24px] font-normal'}
                value={state.ownerTestimonial}
                placeholder={`Contoh: "${rep.sampleTestimonial || mission.sampleTestimonial}"`}
                onChange={(e) => patch({ ownerTestimonial: e.target.value })}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">Nama pemilik usaha
              <input
                className={field + ' mt-1 font-normal'}
                value={state.ownerName}
                placeholder={`Contoh: ${mission.ownerName}`}
                onChange={(e) => patch({ ownerName: e.target.value })}
              />
            </label>
          </div>

          <div className="hidden print:block mt-3 text-sm">
            {state.ownerTestimonial?.trim() ? (
              <>
                <blockquote className="italic text-ink/90">"{state.ownerTestimonial.trim()}"</blockquote>
                <p className="mt-2 font-semibold text-ink">— {state.ownerName?.trim() || mission.ownerName}</p>
              </>
            ) : (
              <p className="italic text-muted">Testimoni belum diisi.</p>
            )}
          </div>
        </section>

        <section className="mt-6"><h2 className="text-xl leading-[26px]">Potensi yang diperkuat</h2><p className="mt-2 font-semibold text-ink">{rep.strengthenedPotential}</p></section>
        <section className="mt-6"><h2 className="text-xl leading-[26px]">Saran langkah berikutnya</h2>
          <ul className="mt-2 list-disc pl-5 text-ink/80 leading-relaxed">{rep.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </article>

      <div className="no-print mx-auto mt-6 flex max-w-[720px] flex-wrap justify-center gap-3">
        <button className="btn-primary" onClick={() => window.print()}><Download size={18} strokeWidth={1.75} />Unduh PDF</button>
        <button className="btn-secondary" onClick={copy}><Copy size={18} strokeWidth={1.75} />Salin untuk CV</button>
        <button className="btn-secondary" onClick={share}><Share2 size={18} strokeWidth={1.75} />Bagikan</button>
        <button className="btn-secondary" onClick={() => patch({ screen: 'results' })}>Coba misi lain</button>
      </div>
      {toast && <div role="status" className="sheet fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 px-5 py-3 text-sm"><Check size={16} strokeWidth={2} className="text-moss" />{toast}</div>}
    </Page>
  )
}
