export interface AiRequest {
  task: 'analyzePotential' | 'mentorReply' | string
  payload: any
}

export interface AiResponse {
  status: number
  body: any
}

const ANALYZE_SYSTEM_PROMPT = `Kamu analis potensi untuk JejakBakat AI. Pilih 2 sampai 3 potensi dari daftar yang diberikan (pakai id-nya). Untuk tiap potensi beri confidence (Tinggi, Sedang, Awal) dan 1 sampai 2 bukti berupa kutipan PERSIS dari jawaban pengguna (teks bebas atau label pilihan) beserta penjelasan satu kalimat. Jangan mengarang kutipan. Jangan membuat diagnosis psikologis atau klaim pasti. Bila bukti tipis, beri confidence Awal. Bahasa Indonesia yang santai dan sopan. Keluarkan hanya JSON.`

const MENTOR_SYSTEM_PROMPT = `Kamu Jeje, mentor AI JejakBakat AI.
PERAN: Kamu memandu pengguna (peserta/anak muda yang sedang mengasah potensinya) mengerjakan misi UMKM pada langkah yang diberikan. Pemilik UMKM adalah pihak yang sedang dibantu (misalnya Kak Arif, Bu Sari, Ibu Lastri), BUKAN pengguna.
ATURAN MENJAWAB:
1. Jawab pertanyaan pengguna secara LANGSUNG, nyambung, dan relevan dengan maksud pesannya terlebih dahulu.
2. Bila pengguna bertanya tentang perannya ("aku siapa?"), jelaskan bahwa ia adalah peserta/relawan muda yang sedang belajar dan membantu pemilik UMKM tersebut.
3. Bila pengguna bertanya tentang identitasmu ("kamu siapa?"), perkenalkan dirimu sebagai Jeje, mentor AI di JejakBakat AI.
4. Bila pengguna bertanya arti misi atau tugas, jelaskan dengan ringkas dan mudah dipahami, lalu beri 1 pertanyaan pemantik atau petunjuk bertahap (jangan memberi hasil jadi).
5. Jangan mengulang perkenalan diri ("Halo, aku Jeje...") di setiap pesan bila percakapan sudah berjalan.
6. Rujuk catatan pengguna bila ada. Bila pesan menyimpang atau sapaan pendek ("oy", "halo"), tanggapi santai dan arahkan kembali ke tugas langkah ini.
7. Balas maksimal 3 kalimat dalam Bahasa Indonesia yang santai, suportif, dan ramah.`

const REPORT_SYSTEM_PROMPT = `Kamu Jeje, mentor AI JejakBakat AI. Tugasmu adalah menyusun ringkasan pencapaian dan hasil kerja pengguna untuk lembar Impact Report profesional.
Tulis 2 sampai 3 kalimat ringkas, jelas, dan mengapresiasi dalam bahasa Indonesia.
Rujuk nama usaha UMKM, target misi, dan poin-poin konkret dari catatan kerja pengguna yang diberikan.
Jangan mengarang data atau klaim yang tidak ada di catatan pengguna. Bila catatan pengguna minim atau kosong, buat ringkasan berbasis target misi dan langkah yang diselesaikan secara objektif tanpa mengarang angka palsu. Keluarkan hanya teks ringkasan tanpa pembuka atau penutup tambahan.`

function cleanJsonText(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  return match ? match[1].trim() : trimmed
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string, isJson: boolean): Promise<string> {
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const candidateModels = Array.from(
    new Set([preferredModel, 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'])
  )

  let lastError: any = null

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const body: any = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }

      if (isJson) {
        body.generationConfig.responseMimeType = 'application/json'
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorText = await res.text()
        if (res.status === 503 || res.status === 404) {
          lastError = new Error(`Gemini API error (${res.status}) on ${model}: ${errorText}`)
          continue
        }
        throw new Error(`Gemini API error (${res.status}): ${errorText}`)
      }

      const data = await res.json()
      const candidate = data.candidates?.[0]
      const parts = candidate?.content?.parts || []
      const textParts = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text)
      const text = textParts.length > 0 ? textParts.join('\n') : (parts[0]?.text || '')
      if (text) {
        return text
      }
    } catch (err: any) {
      lastError = err
    }
  }

  throw lastError || new Error('All Gemini model candidates failed')
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string, isJson: boolean): Promise<string> {
  let baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  let model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (process.env.GROQ_API_KEY && !process.env.OPENAI_BASE_URL) {
    baseUrl = 'https://api.groq.com/openai/v1'
    model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  } else if (process.env.OPENROUTER_API_KEY && !process.env.OPENAI_BASE_URL) {
    baseUrl = 'https://openrouter.ai/api/v1'
    model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct'
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  const body: any = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  }

  if (isJson) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('OpenAI API did not return content')
  }
  return text
}

async function callLLM(systemPrompt: string, userPrompt: string, isJson: boolean): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (geminiKey) {
    return await callGemini(geminiKey, systemPrompt, userPrompt, isJson)
  }

  const openaiKey =
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_API_KEY
  if (openaiKey) {
    return await callOpenAI(openaiKey, systemPrompt, userPrompt, isJson)
  }

  throw new Error('NO_API_KEY_CONFIGURED')
}

export async function handleAiRequest(req: AiRequest): Promise<AiResponse> {
  const { task, payload } = req

  if (!task) {
    return { status: 400, body: { error: 'Task parameter is required' } }
  }

  try {
    if (task === 'analyzePotential') {
      const { answersSummary, availablePotentials } = payload || {}
      const userPrompt = `Berikut adalah daftar potensi yang tersedia di JejakBakat:
${JSON.stringify(availablePotentials, null, 2)}

Berikut adalah rangkuman jawaban pengguna (pilihan ganda, nilai frekuensi/kesenangan, dan teks bebas):
${JSON.stringify(answersSummary, null, 2)}

Pilih 2 sampai 3 potensi dari daftar di atas yang paling sesuai berdasarkan bukti jawaban pengguna.
Format output WAJIB JSON:
{
  "potentials": [
    {
      "potentialId": "id potensi, misalnya p1",
      "confidence": "Tinggi" | "Sedang" | "Awal",
      "evidence": [
        {
          "quote": "kutipan PERSIS dari jawaban teks atau label pilihan pengguna",
          "explanation": "penjelasan satu kalimat singkat dan sopan"
        }
      ]
    }
  ]
}`

      const raw = await callLLM(ANALYZE_SYSTEM_PROMPT, userPrompt, true)
      const parsed = JSON.parse(cleanJsonText(raw))

      if (!parsed || !Array.isArray(parsed.potentials) || parsed.potentials.length === 0) {
        throw new Error('Invalid JSON structure: potentials array missing or empty')
      }

      // Validasi item
      const validPotentials = parsed.potentials.slice(0, 3).map((item: any) => {
        const id = String(item.potentialId || '').trim()
        const conf = ['Tinggi', 'Sedang', 'Awal'].includes(item.confidence) ? item.confidence : 'Awal'
        const rawEv = Array.isArray(item.evidence) ? item.evidence : []
        const evidence = rawEv.slice(0, 2).map((ev: any) => ({
          quote: String(ev.quote || '').trim(),
          explanation: String(ev.explanation || '').trim(),
        }))
        return { potentialId: id, confidence: conf, evidence }
      })

      return { status: 200, body: { result: { potentials: validPotentials } } }
    }

    if (task === 'mentorReply') {
      const { mission, step, userNotes, recentChats, message, intent } = payload || {}

      const userPrompt = `KONTEKS MISI UMKM:
- Usaha: ${mission?.businessName || '-'} (${mission?.businessType || '-'}, ${mission?.location || '-'})
- Pemilik UMKM: ${mission?.ownerName || '-'}
- Pengguna: Peserta/relawan muda yang sedang belajar dan menyelesaikan misi untuk membantu ${mission?.ownerName || 'pemilik usaha'}
- Masalah UMKM: ${mission?.problem || '-'}
- Target capaian misi: ${mission?.target || '-'}

LANGKAH AKTIF:
- Langkah: ${step?.title || '-'}
- Tujuan langkah ini: ${step?.goal || '-'}
- Tugas yang harus dikerjakan: ${(step?.tasks || []).join(', ')}

CATATAN KERJA PENGGUNA PADA LANGKAH INI:
${userNotes ? `"${userNotes}"` : '(belum ada catatan)'}

RIWAYAT PERCAKAPAN SEBELUMNYA:
${(recentChats || []).map((c: any) => `${c.from === 'mentor' ? 'Jeje' : 'Pengguna'}: ${c.text}`).join('\n')}

PESAN TERBARU DARI PENGGUNA:
"${message || ''}"

TIPE BANTUAN YANG DIMINTA PENGGUNA:
${intent || 'general'} (hint = petunjuk, check = periksa kerjaan, example = contoh, general = tanya jawab bebas)`

      const reply = await callLLM(MENTOR_SYSTEM_PROMPT, userPrompt, false)
      return { status: 200, body: { result: reply.trim() } }
    }

    if (task === 'buildReportSummary') {
      const { mission, userNotes, userName } = payload || {}

      const userPrompt = `KONTEKS MISI UMKM:
- Usaha: ${mission?.businessName || '-'} (${mission?.businessType || '-'}, ${mission?.location || '-'})
- Masalah UMKM: ${mission?.problem || '-'}
- Target capaian: ${mission?.target || '-'}
- Pemilik: ${mission?.ownerName || '-'}
- Nama peserta: ${userName || 'Peserta'}

CATATAN KERJA DARI LANGKAH-LANGKAH YANG DISELESAIKAN:
${Array.isArray(userNotes) && userNotes.length > 0 ? userNotes.map((n: string, i: number) => `Langkah ${i + 1}: "${n}"`).join('\n') : '(Tidak ada catatan kerja tambahan)'}

Susun 2 sampai 3 kalimat ringkasan pencapaian misi ini untuk Impact Report.`

      const summary = await callLLM(REPORT_SYSTEM_PROMPT, userPrompt, false)
      return { status: 200, body: { result: summary.trim() } }
    }

    return { status: 400, body: { error: `Unsupported task: ${task}` } }
  } catch (err: any) {
    if (err.message === 'NO_API_KEY_CONFIGURED') {
      return {
        status: 503,
        body: { error: 'NO_API_KEY_CONFIGURED', message: 'API key not configured in environment' },
      }
    }
    return {
      status: 500,
      body: { error: err.message || 'LLM_CALL_FAILED' },
    }
  }
}

