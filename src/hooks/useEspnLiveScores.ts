import { useState, useEffect, useRef } from 'react'

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const POLL_MS = 10_000

const ALIASES: Record<string, string> = {
  'south korea': 'korea republic',
  'czechia': 'czech republic',
  'usa': 'united states',
  'ir iran': 'iran',
  "côte d'ivoire": "côte d'ivoire",
  'dr congo': 'congo dr',
  'cape verde': 'cape verde islands',
  'cabo verde': 'cape verde islands',
  'turkiye': 'turkey',
  'türkiye': 'turkey',
  'türkiye milli': 'turkey',
  "ivory coast": "côte d'ivoire",
  "cote d'ivoire": "côte d'ivoire",
}

export function espnNorm(name: string): string {
  const lower = (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return ALIASES[lower] ?? lower
}

export interface EspnScore {
  status: string
  placarA: number
  placarB: number
  placarPenaltisA: number | null
  placarPenaltisB: number | null
  resultadoPeriodo: 'REGULAR' | 'EXTRA_TIME' | 'PENALTIES' | null
  minuto: number | null
  acrescimos: number | null
}

function parseClock(c: string): { minuto: number | null; acrescimos: number | null } {
  const m = c.match(/^(\d+)'\+(\d+)/)
  if (m) return { minuto: parseInt(m[1], 10), acrescimos: parseInt(m[2], 10) || null }
  const m2 = c.match(/^(\d+)'/)
  if (m2) return { minuto: parseInt(m2[1], 10), acrescimos: null }
  return { minuto: null, acrescimos: null }
}

async function fetchEspnScores(): Promise<Map<string, EspnScore>> {
  const res = await fetch(ESPN_URL)
  if (!res.ok) return new Map()
  const data = await res.json()
  const map = new Map<string, EspnScore>()

  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0]
    if (!comp) continue

    const statusType = comp.status?.type
    const state: string = statusType?.state ?? ''
    if (state !== 'in' && state !== 'post') continue

    const competitors: any[] = comp.competitors ?? []
    const home = competitors.find((c) => c.homeAway === 'home')
    const away = competitors.find((c) => c.homeAway === 'away')
    if (!home || !away) continue

    const detail: string = statusType?.detail ?? ''
    const displayClock: string = comp.status?.displayClock ?? ''

    let status: string
    let minuto: number | null = null
    let acrescimos: number | null = null

    const lowerDetail = detail.toLowerCase()
    const resultadoPeriodo =
      lowerDetail.includes('pen') ? 'PENALTIES' : lowerDetail.includes('aet') || lowerDetail.includes('extra') ? 'EXTRA_TIME' : state === 'post' ? 'REGULAR' : null

    if (state === 'post') {
      status = resultadoPeriodo === 'PENALTIES' ? 'PEN' : resultadoPeriodo === 'EXTRA_TIME' ? 'AET' : 'FT'
      minuto = 90
    } else if (detail === 'HT') {
      status = 'HT'
      minuto = 45
    } else if (detail.startsWith('ET') || detail.toLowerCase().includes('extra')) {
      status = 'ET'
      ;({ minuto, acrescimos } = parseClock(displayClock))
    } else if (detail.toLowerCase().includes('pen')) {
      status = 'PEN_LIVE'
    } else {
      status = 'LIVE'
      ;({ minuto, acrescimos } = parseClock(displayClock))
    }

    const key = `${espnNorm(home.team.displayName)}|${espnNorm(away.team.displayName)}`
    map.set(key, {
      status,
      placarA: parseInt(home.score ?? '0', 10),
      placarB: parseInt(away.score ?? '0', 10),
      placarPenaltisA: Number.isFinite(Number(home.shootoutScore)) ? Number(home.shootoutScore) : null,
      placarPenaltisB: Number.isFinite(Number(away.shootoutScore)) ? Number(away.shootoutScore) : null,
      resultadoPeriodo,
      minuto,
      acrescimos,
    })
  }

  return map
}

export function useEspnLiveScores(): Map<string, EspnScore> {
  const [scores, setScores] = useState<Map<string, EspnScore>>(new Map())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    const poll = async () => {
      try {
        const map = await fetchEspnScores()
        if (active) setScores(map)
      } catch {
        // falha silenciosa — dados do banco continuam como fallback
      }
    }

    poll()
    timerRef.current = setInterval(poll, POLL_MS)

    return () => {
      active = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return scores
}
