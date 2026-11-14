import { useId, useRef, useState, type KeyboardEvent } from 'react'
import './mentor.css'

export const MENTOR_NAME = 'Jeje'

export type MentorMood = 'idle' | 'talking' | 'thinking' | 'happy' | 'celebrate' | 'greet'

export interface MentorProps {
  mood?: MentorMood
  size?: number
  entrance?: boolean
  interactive?: boolean
  className?: string
  onClick?: () => void
}

const STAR = 'M0 -9 Q1 -1 9 0 Q1 1 0 9 Q-1 1 -9 0 Q-1 -1 0 -9Z'
// posisi bintang: [x, y, dx, dy, tunda, warna]
const SPARKS: [number, number, number, number, number, string][] = [
  [30, 70, -22, -26, 0, 'var(--mt-scarf)'],
  [210, 62, 22, -28, 0.15, 'var(--mt-cheek)'],
  [18, 150, -26, 4, 0.35, 'var(--mt-fur-top)'],
  [224, 150, 26, 0, 0.5, 'var(--mt-skin-shade)'],
  [60, 20, -10, -26, 0.7, 'var(--mt-skin-shade)'],
  [182, 18, 12, -26, 0.9, 'var(--mt-scarf)'],
  [34, 220, -22, 14, 1.05, 'var(--mt-cheek)'],
  [210, 224, 22, 14, 1.2, 'var(--mt-fur-top)'],
]

export default function Mentor({ mood = 'idle', size = 160, entrance = true, interactive = false, className = '', onClick }: MentorProps) {
  const uid = useId().replace(/:/g, '')
  const [tapped, setTapped] = useState(false)
  const timer = useRef<number>(0)
  const id = (n: string) => `${n}-${uid}`

  const tap = () => {
    setTapped(false)
    requestAnimationFrame(() => setTapped(true))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTapped(false), 1100)
    onClick?.()
  }
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap() } }

  const fur = `url(#${id('fur')})`
  const skin = 'var(--mt-skin)'

  return (
    <div
      className={['mt-root', `mt-${mood}`, entrance && 'mt-entrance', tapped && 'mt-tap', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size * 1.25 }}
      {...(interactive ? { role: 'button', tabIndex: 0, 'aria-label': `${MENTOR_NAME}, maskot mentor`, onClick: tap, onKeyDown: key } : { role: 'img', 'aria-label': `${MENTOR_NAME}, maskot mentor` })}
    >
      <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id={id('fur')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--mt-fur-top)' }} />
            <stop offset="1" style={{ stopColor: 'var(--mt-fur-bottom)' }} />
          </linearGradient>
          <radialGradient id={id('hi')} cx="0.28" cy="0.2" r="0.6">
            <stop offset="0" style={{ stopColor: 'var(--mt-light)', stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: 'var(--mt-light)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={id('skin')} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" style={{ stopColor: 'var(--mt-skin)' }} />
            <stop offset="1" style={{ stopColor: 'var(--mt-skin-shade)' }} />
          </radialGradient>
          <filter id={id('sh')} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--mt-ink)" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* bayangan tanah */}
        <ellipse cx="120" cy="286" rx="64" ry="8" style={{ fill: 'var(--mt-ink)' }} opacity="0.28" />

        <g className="mt-figure">
          {/* kaki */}
          <g className="mt-foot-l">
            <ellipse cx="96" cy="256" rx="21" ry="24" fill={fur} />
            <ellipse cx="92" cy="277" rx="22" ry="10" fill={`url(#${id('skin')})`} filter={`url(#${id('sh')})`} />
            <path d="M80 275 v4 M91 276 v4 M102 275 v4" stroke="var(--mt-skin-shade)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g className="mt-foot-r">
            <ellipse cx="144" cy="256" rx="21" ry="24" fill={fur} />
            <ellipse cx="148" cy="277" rx="22" ry="10" fill={`url(#${id('skin')})`} filter={`url(#${id('sh')})`} />
            <path d="M138 275 v4 M149 276 v4 M160 275 v4" stroke="var(--mt-skin-shade)" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* badan */}
          <g className="mt-body" filter={`url(#${id('sh')})`}>
            <ellipse cx="120" cy="200" rx="60" ry="64" fill={fur} />
            <ellipse cx="120" cy="212" rx="36" ry="41" fill={`url(#${id('skin')})`} />
            <ellipse cx="120" cy="200" rx="60" ry="64" fill={`url(#${id('hi')})`} />
          </g>

          {/* syal */}
          <g className="mt-scarf">
            <path d="M74 166 Q120 198 166 166 L162 184 Q120 214 78 184 Z" style={{ fill: 'var(--mt-scarf)' }} />
            <path d="M80 170 Q120 196 160 170" fill="none" stroke="var(--mt-light)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
            <g className="mt-tail-l"><path d="M117 192 L96 228 L122 216 Z" style={{ fill: 'var(--mt-scarf)' }} /><path d="M117 192 L106 212" stroke="var(--mt-ink)" strokeWidth="2" opacity="0.2" /></g>
            <g className="mt-tail-r"><path d="M123 192 L146 226 L120 214 Z" style={{ fill: 'var(--mt-scarf)' }} /><path d="M123 192 L134 212" stroke="var(--mt-ink)" strokeWidth="2" opacity="0.2" /></g>
            <circle cx="120" cy="192" r="9" style={{ fill: 'var(--mt-scarf)' }} /><circle cx="117" cy="189" r="3" fill="var(--mt-light)" opacity="0.5" />
          </g>

          {/* lengan kiri (sisi kiri layar) */}
          <g className="mt-arm-l">
            <rect x="55" y="160" width="26" height="70" rx="13" fill={fur} filter={`url(#${id('sh')})`} />
            <circle cx="68" cy="234" r="12" fill={`url(#${id('skin')})`} />
            <circle cx="77" cy="240" r="5" fill="var(--mt-skin)" />
          </g>
          {/* lengan kanan */}
          <g className="mt-arm-r">
            <rect x="159" y="160" width="26" height="70" rx="13" fill={fur} filter={`url(#${id('sh')})`} />
            <circle cx="172" cy="234" r="12" fill={`url(#${id('skin')})`} />
            <circle cx="163" cy="240" r="5" fill="var(--mt-skin)" />
          </g>

          {/* kepala */}
          <g className="mt-head">
            <g className="mt-ears">
              <g className="mt-ear-l"><circle cx="58" cy="116" r="23" fill={`url(#${id('skin')})`} /><circle cx="61" cy="117" r="13" fill="var(--mt-skin-shade)" opacity="0.7" /></g>
              <g className="mt-ear-r"><circle cx="182" cy="116" r="23" fill={`url(#${id('skin')})`} /><circle cx="179" cy="117" r="13" fill="var(--mt-skin-shade)" opacity="0.7" /></g>
            </g>
            <g filter={`url(#${id('sh')})`}>
              <ellipse cx="120" cy="106" rx="70" ry="64" fill={fur} />
            </g>
            <ellipse cx="120" cy="106" rx="70" ry="64" fill={`url(#${id('hi')})`} />

            {/* topeng wajah */}
            <g className="mt-face">
              <circle cx="100" cy="102" r="28" style={{ fill: skin }} />
              <circle cx="140" cy="102" r="28" style={{ fill: skin }} />
              <ellipse cx="120" cy="124" rx="47" ry="37" style={{ fill: skin }} />
              <ellipse cx="120" cy="146" rx="34" ry="14" fill="var(--mt-skin-shade)" opacity="0.35" />

              {/* mata */}
              <g className="mt-eyes">
                {[100, 140].map((x, i) => (
                  <g key={x} className={i === 0 ? 'mt-eye-l' : 'mt-eye-r'}>
                    <g className="mt-pupil">
                      <circle cx={x} cy="108" r="10" style={{ fill: 'var(--mt-ink)' }} />
                      <circle cx={x - 3.5} cy="104" r="4" style={{ fill: 'var(--mt-light)' }} />
                      <circle cx={x + 3.5} cy="112.5" r="1.8" style={{ fill: 'var(--mt-light)' }} opacity="0.8" />
                    </g>
                  </g>
                ))}
              </g>
              <g className="mt-happy-face">
                <path d="M90 110 Q100 98 110 110 M130 110 Q140 98 150 110" fill="none" stroke="var(--mt-ink)" strokeWidth="3.5" strokeLinecap="round" />
              </g>

              {/* hidung dan pipi */}
              <ellipse cx="120" cy="124" rx="8" ry="5.5" fill="var(--mt-skin-shade)" />
              <circle cx="117" cy="124" r="1.4" style={{ fill: 'var(--mt-ink)' }} opacity="0.55" /><circle cx="123" cy="124" r="1.4" style={{ fill: 'var(--mt-ink)' }} opacity="0.55" />
              <ellipse cx="82" cy="128" rx="10" ry="7" style={{ fill: 'var(--mt-cheek)' }} opacity="0.55" />
              <ellipse cx="158" cy="128" rx="10" ry="7" style={{ fill: 'var(--mt-cheek)' }} opacity="0.55" />

              {/* mulut */}
              <path className="mt-calm-mouth" d={mood === 'thinking' ? 'M110 142 Q120 137 130 143' : 'M108 137 Q120 148 132 137'} fill="none" stroke="var(--mt-ink)" strokeWidth="2.6" strokeLinecap="round" />
              <g className="mt-open-mouth">
                <g className="mt-mouth-open">
                  <ellipse cx="120" cy="140" rx="10" ry="8" style={{ fill: 'var(--mt-ink)' }} />
                  <ellipse cx="120" cy="144" rx="6" ry="3.5" style={{ fill: 'var(--mt-cheek)' }} />
                </g>
              </g>
              <g className="mt-happy-face">
                <path d="M100 133 Q120 134 140 133 Q136 158 120 158 Q104 158 100 133 Z" style={{ fill: 'var(--mt-ink)' }} />
                <ellipse cx="120" cy="150" rx="9" ry="5" style={{ fill: 'var(--mt-cheek)' }} />
                <path d="M105 134 Q120 137 135 134" stroke="var(--mt-light)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />
              </g>
            </g>
          </g>

          {/* tangan di dagu saat berpikir */}
          <g className="mt-think-arm">
            <path d="M172 180 L184 206 L142 168" fill="none" stroke={fur} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="136" cy="160" r="12" fill={`url(#${id('skin')})`} />
          </g>

          {/* titik berpikir */}
          <g className="mt-dots">
            {[0, 1, 2].map((i) => <circle key={i} className="mt-dot" cx={150 + i * 16} cy={26 - i * 6} r="4.5" style={{ fill: 'var(--mt-fur-top)' }} />)}
          </g>
        </g>

        {/* percikan perayaan */}
        <g className="mt-fx">
          {SPARKS.map(([x, y, dx, dy, d, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path className="mt-spark" d={STAR} style={{ fill: c, animationDelay: `${d}s`, ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px` }} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
