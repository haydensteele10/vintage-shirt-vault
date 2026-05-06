const EBAY_CLIENT_ID     = Deno.env.get('EBAY_APP_ID')         ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET')  ?? ''
const ANTHROPIC_API_KEY  = (Deno.env.get('ANTHROPIC_API_KEY')  ?? '').trim().replace(/[^\x20-\x7E]/g, '')

const OAUTH_URL  = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

// Appended to every eBay query to push out cheap reprints and modern items
const NEG_KEYWORDS = '-reprint -reproduction -inspired -style -new -NWT -modern -remake'

function vintageQuery(base: string): string {
  return `${base} ${NEG_KEYWORDS}`
}

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

// ─── eBay helpers ─────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
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
    throw new Error(`eBay OAuth failed (${res.status}): ${body}`)
  }
  const { access_token } = await res.json()
  return access_token
}

// deno-lint-ignore no-explicit-any
async function browseSearch(
  token: string,
  query: string,
  limit = 8,
  minPrice = 40,
  maxPrice?: number,
): Promise<any[]> {
  const priceRange = maxPrice != null ? `${minPrice}..${maxPrice}` : `${minPrice}..`
  const priceFilter = `price:[${priceRange}],priceCurrency:USD`

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    filter: priceFilter,
  })

  console.log('[ebay-discover] searching:', query, `filter:${priceFilter}`)

  const res = await fetch(`${BROWSE_URL}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    console.warn('[ebay-discover] search failed for:', query, res.status)
    return []
  }

  const data = await res.json()
  return data?.itemSummaries ?? []
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
// Scores every listing 1-10 for vintage authenticity in a single Claude call.
// Items scoring < 7 are dropped; survivors are sorted highest-score-first.

type RawGroup = { id: string; title: string; query: string; items: ReturnType<typeof mapItem>[] }
type FilteredGroup = { id: string; title: string; query: string; listings: ReturnType<typeof mapItem>[] }

async function batchScoreWithAI(groups: RawGroup[]): Promise<FilteredGroup[]> {
  const tagged: (ReturnType<typeof mapItem> & { groupId: string })[] = []
  for (const group of groups) {
    for (const item of group.items) {
      tagged.push({ ...item, groupId: group.id })
    }
  }

  // Default: borderline pass so non-AI path still surfaces some results
  let scores: number[] = tagged.map(() => 7)

  if (ANTHROPIC_API_KEY && tagged.length > 0) {
    const numbered = tagged.map((l, i) => `${i + 1}. ${l.title}`).join('\n')

    const prompt = `You are a vintage clothing authenticator. Score each eBay listing title 1-10 for likelihood of being an authentic vintage original.

SCORING GUIDE:
9-10 — Definitely vintage: contains specific year, tour date, copyright line, or explicit material signals (single stitch, screen stars, fruit of the loom, hanes, deadstock, made in usa, paper thin, 80s, 90s)
7-8  — Likely vintage: mentions era, has event-specific or era-specific text, or seller language matches genuine vintage listings
5-6  — Uncertain: could be vintage or modern reprint; insufficient signals to decide
3-4  — Probably not vintage: generic or suspicious title, missing any era or authenticity signals
1-2  — Definitely not vintage: reprint, bootleg, modern reproduction, fan-made, or explicitly "inspired by" item

Listings:
${numbered}

Return a JSON number array with one integer score per listing.
Example for 4 listings: [9, 2, 7, 8]
Return ONLY the JSON array, no other text.`

    try {
      const res = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text: string = data.content?.[0]?.text ?? ''
        console.log('[ebay-discover] AI scores (first 120):', text.substring(0, 120))

        const match = text.match(/\[[\s\S]*?\]/)
        if (match) {
          const arr = JSON.parse(match[0])
          if (Array.isArray(arr) && arr.length === tagged.length) {
            scores = arr.map((v) => Number(v) || 0)
          }
        }
      } else {
        console.warn('[ebay-discover] AI score HTTP error:', res.status)
      }
    } catch (err) {
      console.warn('[ebay-discover] AI score error:', (err as Error).message)
    }
  }

  // Reassemble groups: keep score >= 7, sort highest first
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
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const results: string[] = []
  const seen = new Set<string>()
  for (const val of arr) {
    const key = val.toLowerCase().trim()
    if (!seen.has(key) && sorted.find(([k]) => k === key)) {
      seen.add(key)
      results.push(val)
      if (results.length >= n) break
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
    const { shirts } = await req.json()

    if (!Array.isArray(shirts) || shirts.length === 0) {
      return new Response(JSON.stringify({ groups: [] }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const token = await getAccessToken()

    // ── Analyse the collection ─────────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    const brands = shirts.map((s: any) => s.brand).filter(Boolean) as string[]
    // deno-lint-ignore no-explicit-any
    const eras   = shirts.map((s: any) => s.era).filter(Boolean) as string[]
    // deno-lint-ignore no-explicit-any
    const styles = shirts.map((s: any) => s.style).filter(Boolean) as string[]
    const values = shirts
      // deno-lint-ignore no-explicit-any
      .map((s: any) => Number(s.current_est_value))
      .filter((v: number) => v > 0) as number[]

    const topBrands = topN(brands, 3)
    const topEra    = topN(eras, 1)[0] ?? null
    const topStyle  = topN(styles, 1)[0] ?? null
    const avgValue  = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null

    // ── Build search task list (up to 10 total) ────────────────────────────
    type SearchTask = { id: string; title: string; query: string; limit: number; minPrice?: number; maxPrice?: number }
    const tasks: SearchTask[] = []

    // 1 — More from top artists
    if (topBrands.length > 0) {
      const label = topBrands.slice(0, 2).join(' & ')
      for (const brand of topBrands.slice(0, 2)) {
        tasks.push({ id: 'artists', title: `More from ${label}`, query: vintageQuery(`${brand} vintage tee single stitch`), limit: 6 })
      }
    }

    // 2 — Similar era
    if (topEra) {
      const decadeMatch = topEra.match(/\d{2}s/)
      const decade = decadeMatch ? decadeMatch[0] : topEra
      tasks.push({ id: 'era', title: `More from the ${decade}`, query: vintageQuery(`vintage ${decade} tee single stitch`), limit: 8 })
    }

    // 3 — Same style
    if (topStyle) {
      tasks.push({
        id: 'style',
        title: `More ${styleLabel(topStyle)}`,
        query: vintageQuery(`${styleQuery(topStyle)} single stitch`),
        limit: 8,
      })
    }

    // 4 — In your price range (only if meaningful average exists above the min threshold)
    if (avgValue && avgValue >= 40) {
      const minP = Math.max(40, Math.round(avgValue * 0.5))
      const maxP = Math.round(avgValue * 1.75)
      tasks.push({ id: 'price_range', title: 'In your price range', query: vintageQuery('vintage tee single stitch'), limit: 8, minPrice: minP, maxPrice: maxP })
    }

    // 5-10 — Fixed discovery categories
    tasks.push(
      { id: 'trending',      title: 'Trending in vintage',    query: vintageQuery('vintage tee 80s 90s single stitch'),      limit: 8 },
      { id: 'single_stitch', title: 'Single stitch gems',     query: vintageQuery('vintage single stitch tee'),              limit: 8 },
      { id: 'tour_tees',     title: 'Rare tour tees',         query: vintageQuery('vintage tour tee concert single stitch'), limit: 8 },
      { id: 'sportswear',    title: 'Vintage sportswear',     query: vintageQuery('vintage jersey sports single stitch'),    limit: 8 },
      { id: 'grails',        title: 'High value grails',      query: vintageQuery('vintage rare tee deadstock'),             limit: 8, minPrice: 100 },
      { id: 'deadstock',     title: 'Deadstock finds',        query: vintageQuery('deadstock vintage tee screen stars'),     limit: 8 },
    )

    // ── Run all searches in parallel ───────────────────────────────────────
    const searchResults = await Promise.all(
      tasks.map((t) => browseSearch(token, t.query, t.limit, t.minPrice ?? 40, t.maxPrice))
    )

    // Merge tasks that share the same group id (e.g., multiple brand searches → one 'artists' group)
    const groupMap = new Map<string, RawGroup>()
    tasks.forEach((task, i) => {
      if (!groupMap.has(task.id)) {
        groupMap.set(task.id, { id: task.id, title: task.title, query: task.query, items: [] })
      }
      groupMap.get(task.id)!.items.push(...searchResults[i].map(mapItem))
    })

    // Deduplicate group order (first appearance wins)
    const seen = new Set<string>()
    const rawGroups: RawGroup[] = []
    for (const task of tasks) {
      if (!seen.has(task.id)) {
        seen.add(task.id)
        const g = groupMap.get(task.id)
        if (g && g.items.length > 0) rawGroups.push(g)
      }
    }

    // ── AI score all results in one batch call, drop < 7 ─────────────────
    const filtered = await batchScoreWithAI(rawGroups)

    const groups = filtered
      .filter((g) => g.listings.length > 0)
      .map((g) => ({ ...g, listings: g.listings.slice(0, 12) }))
      .slice(0, 10)

    console.log('[ebay-discover] groups returned:', groups.map((g) => `${g.id}(${g.listings.length})`).join(', '))

    return new Response(JSON.stringify({ groups }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ebay-discover] error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
