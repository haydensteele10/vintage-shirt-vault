import { requireAuth, checkRateLimit, sanitizeInput } from '../_shared/rateLimiter.ts'

const EBAY_CLIENT_ID     = Deno.env.get('EBAY_APP_ID')         ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET')  ?? ''
const ANTHROPIC_API_KEY  = (Deno.env.get('ANTHROPIC_API_KEY')  ?? '').trim().replace(/[^\x20-\x7E]/g, '')

const OAUTH_URL  = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

const NEG_KEYWORDS = '-reprint -reproduction -inspired -style -new -NWT -modern -remake'

function vintageQuery(base: string): string {
  return `${base} ${NEG_KEYWORDS}`
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function jsonErr(msg: string, status = 500) {
  console.error('[ebay-discover] error response:', msg)
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// ─── eBay helpers ─────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error('eBay credentials not configured (EBAY_APP_ID / EBAY_CLIENT_SECRET missing)')
  }
  const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`)
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`eBay OAuth failed (${res.status}): ${body.substring(0, 200)}`)
  }
  const { access_token } = await res.json()
  if (!access_token) throw new Error('eBay OAuth returned no access_token')
  return access_token
}

// deno-lint-ignore no-explicit-any
async function browseSearch(
  token: string,
  query: string,
  limit = 8,
  minPrice?: number,
  maxPrice?: number,
): Promise<any[]> {
  try {
    const filterParts: string[] = ['priceCurrency:USD']
    if (minPrice != null || maxPrice != null) {
      const lo = minPrice ?? 0
      const hi = maxPrice != null ? String(maxPrice) : ''
      filterParts.unshift(`price:[${lo}..${hi}]`)
    }
    const filter = filterParts.join(',')

    // Build URL manually to avoid URLSearchParams double-encoding the filter brackets
    const params = `q=${encodeURIComponent(query)}&limit=${limit}${filter ? `&filter=${encodeURIComponent(filter)}` : ''}`
    console.log('[ebay-discover] searching:', query, filter ? `filter:${filter}` : 'no price filter')

    const res = await fetch(`${BROWSE_URL}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn(`[ebay-discover] browse failed (${res.status}) for "${query}":`, body.substring(0, 200))
      return []
    }

    const data = await res.json()
    const items = data?.itemSummaries ?? []
    console.log(`[ebay-discover] "${query}" → ${items.length} results`)
    return items
  } catch (err) {
    console.warn('[ebay-discover] browseSearch threw for', query, (err as Error).message)
    return []
  }
}

// deno-lint-ignore no-explicit-any
function mapItem(item: any) {
  return {
    title: item.title ?? '',
    price: parseFloat(item.price?.value ?? '0'),
    url:   item.itemWebUrl ?? '',
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
  }
}

// ─── AI scoring ───────────────────────────────────────────────────────────────

type RawGroup = { id: string; title: string; query: string; items: ReturnType<typeof mapItem>[] }
type FilteredGroup = { id: string; title: string; query: string; listings: ReturnType<typeof mapItem>[] }

async function batchScoreWithAI(groups: RawGroup[]): Promise<FilteredGroup[]> {
  const tagged: (ReturnType<typeof mapItem> & { groupId: string })[] = []
  for (const group of groups) {
    for (const item of group.items) {
      tagged.push({ ...item, groupId: group.id })
    }
  }

  // Default: borderline pass so non-AI path still surfaces results
  let scores: number[] = tagged.map(() => 7)

  if (ANTHROPIC_API_KEY && tagged.length > 0) {
    const numbered = tagged.map((l, i) => `${i + 1}. ${l.title}`).join('\n')

    const prompt = `You are a vintage clothing authenticator. Score each eBay listing title 1-10 for likelihood of being an authentic vintage original.

SCORING GUIDE:
9-10 — Definitely vintage: specific year, tour date, copyright line, or material signals (single stitch, screen stars, fruit of the loom, hanes, deadstock, made in usa, 80s/90s)
7-8  — Likely vintage: mentions era, event-specific text, or genuine vintage seller language
5-6  — Uncertain: could be vintage or modern reprint
3-4  — Probably not vintage: generic or suspicious title
1-2  — Definitely not vintage: reprint, bootleg, modern reproduction, or explicitly "inspired by"

Listings:
${numbered}

Return a JSON number array with one integer score per listing.
Example for 4 listings: [9, 2, 7, 8]
Return ONLY the JSON array, no other text.`

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20_000)

      const res = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const text: string = data.content?.[0]?.text ?? ''
        console.log('[ebay-discover] AI scores:', text.substring(0, 120))
        const match = text.match(/\[[\s\S]*?\]/)
        if (match) {
          const arr = JSON.parse(match[0])
          if (Array.isArray(arr) && arr.length === tagged.length) {
            scores = arr.map((v) => Number(v) || 0)
          }
        }
      } else {
        console.warn('[ebay-discover] AI HTTP error:', res.status)
      }
    } catch (err) {
      console.warn('[ebay-discover] AI error (falling back to defaults):', (err as Error).message)
    }
  } else {
    console.log('[ebay-discover] skipping AI scoring — no key or no items')
  }

  const byGroup = new Map<string, { listing: ReturnType<typeof mapItem>; score: number }[]>()
  for (const g of groups) byGroup.set(g.id, [])

  tagged.forEach((item, i) => {
    if (scores[i] >= 7) {
      byGroup.get(item.groupId)!.push({
        listing: { title: item.title, price: item.price, url: item.url, image: item.image },
        score: scores[i],
      })
    }
  })

  return groups.map((g) => ({
    id:       g.id,
    title:    g.title,
    query:    g.query,
    listings: (byGroup.get(g.id) ?? [])
      .sort((a, b) => b.score - a.score)
      .map((x) => x.listing),
  }))
}

// ─── Collection analysis helpers ──────────────────────────────────────────────

function topN(arr: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const val of arr) {
    const key = val.toLowerCase().trim()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const seen = new Set<string>()
  const results: string[] = []
  for (const val of arr) {
    const key = val.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.add(key)
      results.push(val)
      if (results.length >= n * 3) break
    }
  }
  return results
    .sort((a, b) => (counts.get(b.toLowerCase().trim()) ?? 0) - (counts.get(a.toLowerCase().trim()) ?? 0))
    .slice(0, n)
}

function styleLabel(style: string): string {
  switch (style) {
    case 'band_tee':  return 'band tees'
    case 'sports':    return 'sports tees'
    case 'workwear':  return 'workwear'
    case 'souvenir':  return 'souvenir tees'
    default:          return 'vintage tees'
  }
}

function styleQuery(style: string): string {
  switch (style) {
    case 'band_tee':  return 'vintage band tee'
    case 'sports':    return 'vintage sports tee'
    case 'workwear':  return 'vintage workwear shirt'
    case 'souvenir':  return 'vintage souvenir tee'
    default:          return 'vintage tee'
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    console.log('[ebay-discover] invoked, method:', req.method)

    const userId = await requireAuth(req)
    await checkRateLimit(userId, 'ebay-discover', 30)

    let body: { shirts?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      console.warn('[ebay-discover] could not parse request body, using empty')
    }

    const { shirts } = body

    if (!Array.isArray(shirts) || shirts.length === 0) {
      console.log('[ebay-discover] no shirts in collection, returning empty groups')
      return jsonOk({ groups: [] })
    }

    if (shirts.length > 500) {
      throw new Error('shirts array exceeds maximum of 500 items')
    }

    console.log('[ebay-discover] collection size:', shirts.length)

    const token = await getAccessToken()
    console.log('[ebay-discover] eBay token obtained')

    // ── Analyse the collection ─────────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    const brands = (shirts as any[]).map((s) => sanitizeInput(s.brand, 100)).filter(Boolean) as string[]
    // deno-lint-ignore no-explicit-any
    const eras   = (shirts as any[]).map((s) => sanitizeInput(s.era, 100)).filter(Boolean) as string[]
    // deno-lint-ignore no-explicit-any
    const styles = (shirts as any[]).map((s) => sanitizeInput(s.style, 100)).filter(Boolean) as string[]

    const topBrands = topN(brands, 3)
    const topEra    = topN(eras, 1)[0] ?? null
    const topStyle  = topN(styles, 1)[0] ?? null

    console.log('[ebay-discover] topBrands:', topBrands, '| topEra:', topEra, '| topStyle:', topStyle)

    // ── Build search task list ────────────────────────────────────────────
    type SearchTask = { id: string; title: string; query: string; limit: number; minPrice?: number; maxPrice?: number }
    const tasks: SearchTask[] = []

    if (topBrands.length > 0) {
      const label = topBrands.slice(0, 2).join(' & ')
      for (const brand of topBrands.slice(0, 2)) {
        tasks.push({ id: 'artists', title: `More from ${label}`, query: vintageQuery(`${brand} vintage tee`), limit: 6 })
      }
    }

    if (topEra) {
      const decadeMatch = topEra.match(/\d{2}s/)
      const decade = decadeMatch ? decadeMatch[0] : topEra
      tasks.push({ id: 'era', title: `More from the ${decade}`, query: vintageQuery(`vintage ${decade} tee single stitch`), limit: 8 })
    }

    if (topStyle) {
      tasks.push({ id: 'style', title: `More ${styleLabel(topStyle)}`, query: vintageQuery(styleQuery(topStyle)), limit: 8 })
    }

    // Fixed discovery categories — no minimum price so results aren't blocked
    tasks.push(
      { id: 'trending',      title: 'Trending in vintage',    query: vintageQuery('vintage tee 80s 90s single stitch'),      limit: 8 },
      { id: 'single_stitch', title: 'Single stitch gems',     query: vintageQuery('vintage single stitch tee'),              limit: 8 },
      { id: 'tour_tees',     title: 'Rare tour tees',         query: vintageQuery('vintage tour tee concert single stitch'), limit: 8 },
      { id: 'sportswear',    title: 'Vintage sportswear',     query: vintageQuery('vintage jersey sports tee'),              limit: 8 },
      { id: 'grails',        title: 'High value grails',      query: vintageQuery('vintage rare tee deadstock'),             limit: 8, minPrice: 75 },
      { id: 'deadstock',     title: 'Deadstock finds',        query: vintageQuery('deadstock vintage tee screen stars'),     limit: 8 },
    )

    // ── Run all searches in parallel ──────────────────────────────────────
    console.log('[ebay-discover] running', tasks.length, 'searches in parallel')
    const searchResults = await Promise.all(
      tasks.map((t) => browseSearch(token, t.query, t.limit, t.minPrice, t.maxPrice))
    )

    const groupMap = new Map<string, RawGroup>()
    tasks.forEach((task, i) => {
      if (!groupMap.has(task.id)) {
        groupMap.set(task.id, { id: task.id, title: task.title, query: task.query, items: [] })
      }
      groupMap.get(task.id)!.items.push(...searchResults[i].map(mapItem))
    })

    const seen = new Set<string>()
    const rawGroups: RawGroup[] = []
    for (const task of tasks) {
      if (!seen.has(task.id)) {
        seen.add(task.id)
        const g = groupMap.get(task.id)
        if (g && g.items.length > 0) rawGroups.push(g)
      }
    }

    console.log('[ebay-discover] raw groups with results:', rawGroups.map((g) => `${g.id}(${g.items.length})`).join(', '))

    // ── AI score all results in one batch call ────────────────────────────
    const filtered = await batchScoreWithAI(rawGroups)

    const groups = filtered
      .filter((g) => g.listings.length > 0)
      .map((g) => ({ ...g, listings: g.listings.slice(0, 12) }))
      .slice(0, 8)

    console.log('[ebay-discover] final groups:', groups.map((g) => `${g.id}(${g.listings.length})`).join(', '))

    return jsonOk({ groups })
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error'
    const status = (err as any).status ?? 500
    console.error('[ebay-discover] unhandled error:', msg)
    return jsonErr(msg, status)
  }
})
