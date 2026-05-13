import { requireAuth, checkRateLimit, sanitizeInput } from '../_shared/rateLimiter.ts'

const EBAY_CLIENT_ID     = Deno.env.get('EBAY_APP_ID')         ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET')  ?? ''
const ANTHROPIC_API_KEY  = (Deno.env.get('ANTHROPIC_API_KEY')  ?? '').trim().replace(/[^\x20-\x7E]/g, '')

const OAUTH_URL  = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

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
async function browseSearch(token: string, query: string, limit = 10, offset = 0): Promise<any[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit), offset: String(offset) })
  console.log('[ebay-search] trying query:', query, offset > 0 ? `offset:${offset}` : '')

  const res = await fetch(`${BROWSE_URL}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Browse API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  const items = data?.itemSummaries ?? []
  console.log('[ebay-search] results for "' + query + '":', items.length)
  return items
}

// ─── AI comp filter ───────────────────────────────────────────────────────────
// Asks Claude to identify which listing titles are genuine vintage originals.
// Returns a boolean[] parallel to the input titles array.
// Any error falls back to keeping all listings.

async function filterListingsWithAI(titles: string[]): Promise<boolean[]> {
  if (!ANTHROPIC_API_KEY || titles.length === 0) return titles.map(() => true)

  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const prompt = `You are a vintage clothing expert. Review these eBay listing titles and identify which ones are genuine vintage originals.

REMOVE (return false) items that are:
- Reprints, bootlegs, modern reproductions, or licensed re-releases
- Fan-made or tribute items
- New/recent items described as "style" or "inspired by"
- Missing any vintage indicators (no year, no tour, suspiciously generic)

KEEP (return true) items that appear to be:
- Authentic vintage originals from the original era
- Items with clear vintage signals: specific year, tour dates, single stitch, screen stars, copyright lines, event-specific text
- Items where the title matches what a genuine vintage seller would write

Listings:
${numbered}

Return a JSON boolean array with one value per listing (true = keep, false = remove).
Example for 4 listings: [true, false, true, true]
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
        model: 'claude-sonnet-4-6',
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      console.warn('[ebay-search] AI filter HTTP error:', res.status)
      return titles.map(() => true)
    }

    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    console.log('[ebay-search] AI filter response:', text)

    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return titles.map(() => true)

    const arr = JSON.parse(match[0])
    if (Array.isArray(arr) && arr.length === titles.length) {
      return arr.map((v) => Boolean(v))
    }
  } catch (err) {
    console.warn('[ebay-search] AI filter error:', (err as Error).message)
  }

  return titles.map(() => true)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const userId = await requireAuth(req)
    await checkRateLimit(userId, 'ebay-search', 50)

    const body = await req.json()
    console.log('[ebay-search] received body:', JSON.stringify(body))

    const brand             = sanitizeInput(body.brand,            100)
    const style             = sanitizeInput(body.style,             20)
    const era               = sanitizeInput(body.era,               20)
    const year              = body.year
    const tour_or_event     = sanitizeInput(body.tour_or_event,    100)
    const graphic_keywords  = sanitizeInput(body.graphic_keywords, 100)
    const sport             = sanitizeInput(body.sport,             50)
    const location          = sanitizeInput(body.location,         100)
    const directQuery       = sanitizeInput(body.query,            200)
    const offset            = Math.min(Math.max(0, Number(body.offset) || 0), 500)

    const token = await getAccessToken()

    // deno-lint-ignore no-explicit-any
    let items: any[] = []
    let usedQuery = ''

    if (directQuery) {
      // ── Direct query from Search tab (or pagination) — skip field-based building
      console.log('[ebay-search] direct query mode:', directQuery, offset > 0 ? `offset:${offset}` : '')
      items = await browseSearch(token, directQuery, 10, offset)
      usedQuery = directQuery
    } else {
      // ── Field-based query building from Add Shirt form ─────────────────────
      const yearStr = year ? String(year) : ''
      const yearNum = year ? Math.floor(Number(year)) : 0
      const decade  = era
        ? era.replace(/^(early|mid|late)\s+/i, '').trim()
        : yearNum ? `${Math.floor(yearNum / 10) * 10}s` : ''
      const datePart = yearStr || decade

      const join = (...parts: (string | null | undefined)[]) =>
        parts.filter(Boolean).join(' ')

      const queries: string[] = []

      if (style === 'band_tee') {
        if (tour_or_event && datePart) queries.push(join(brand, tour_or_event, datePart, 'tee'))
        if (tour_or_event)             queries.push(join(brand, tour_or_event, 'tee'))
        if (graphic_keywords)          queries.push(join(brand, graphic_keywords, 'vintage tee', decade))
        if (datePart)                  queries.push(join(brand, datePart, 'vintage tee'))
        if (brand)                     queries.push(join(brand, 'vintage tee'))
        if (brand)                     queries.push(brand)

      } else if (style === 'sports') {
        if (tour_or_event && datePart) queries.push(join('vintage', brand, tour_or_event, datePart, 'tee'))
        if (tour_or_event)             queries.push(join('vintage', brand, tour_or_event, 'tee'))
        if (sport && datePart)         queries.push(join('vintage', brand, sport, datePart, 'tee'))
        if (datePart)                  queries.push(join('vintage', brand, datePart, 'tee'))
        if (sport)                     queries.push(join('vintage', brand, sport, 'tee'))
                                       queries.push(join('vintage', brand, 'tee'))
        if (brand)                     queries.push(brand)

      } else if (style === 'souvenir') {
        const place = join(brand, location) || 'vintage'
        if (tour_or_event && datePart) queries.push(join(place, tour_or_event, datePart, 'vintage tee'))
        if (tour_or_event)             queries.push(join(place, tour_or_event, 'vintage tee'))
        if (datePart)                  queries.push(join('vintage', place, datePart, 'tee'))
                                       queries.push(join('vintage', place, 'souvenir tee'))
                                       queries.push(join('vintage', place, 'tee'))
        if (place)                     queries.push(place)

      } else {
        const brandWithLocation = join(brand, location) || 'vintage tee'
        if (graphic_keywords && datePart) queries.push(join(brandWithLocation, graphic_keywords, datePart, 'vintage tee'))
        if (graphic_keywords)             queries.push(join(brandWithLocation, graphic_keywords, 'vintage tee'))
        if (tour_or_event)                queries.push(join(brandWithLocation, tour_or_event, 'vintage tee'))
        if (datePart)                     queries.push(join(brandWithLocation, datePart, 'vintage tee'))
                                          queries.push(join(brandWithLocation, 'vintage tee'))
                                          queries.push(brandWithLocation)
      }

      // Deduplicate while preserving order — filter out any falsy entries
      const seen = new Set<string>()
      const uniqueQueries = queries.filter((q) => {
        if (!q) return false
        const k = q.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

      for (const q of uniqueQueries) {
        items = await browseSearch(token, q, 10)
        if (items.length > 0) {
          usedQuery = q
          break
        }
      }
    }

    console.log('[ebay-search] final query used:', usedQuery, '| raw listings:', items.length)

    // deno-lint-ignore no-explicit-any
    const allListings = items.map((item: any) => ({
      title: item.title ?? '',
      price: parseFloat(item.price?.value ?? '0'),
      url:   item.itemWebUrl ?? '',
      image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
    }))

    // AI filter: identify reprints / reproductions
    const keptFlags = await filterListingsWithAI(allListings.map((l) => l.title))
    const listings  = allListings.map((l, i) => ({ ...l, kept: keptFlags[i] }))

    const keptListings = listings.filter((l) => l.kept)
    const avgPrice = keptListings.length > 0
      ? keptListings.reduce((s, l) => s + l.price, 0) / keptListings.length
      : null

    console.log(
      '[ebay-search] AI filter: kept', keptListings.length, 'of', listings.length,
      '| avgPrice:', avgPrice?.toFixed(2) ?? 'none',
    )

    return new Response(JSON.stringify({ listings, query: usedQuery, avgPrice }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const e = err as Error & { status?: number }
    console.error('[ebay-search] error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.status ?? 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
