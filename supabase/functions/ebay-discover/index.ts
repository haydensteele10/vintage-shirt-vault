const EBAY_CLIENT_ID     = Deno.env.get('EBAY_APP_ID')         ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET')  ?? ''

const OAUTH_URL  = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

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
async function browseSearch(token: string, query: string, limit = 8): Promise<any[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  console.log('[ebay-discover] searching:', query)
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
function mapListings(items: any[]) {
  return items.map((item) => ({
    title: item.title ?? '',
    price: parseFloat(item.price?.value ?? '0'),
    url:   item.itemWebUrl ?? '',
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
  }))
}

// Returns the top-N most frequent values from an array
function topN(arr: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const val of arr) {
    const key = val.toLowerCase().trim()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  // Sort by count desc, map back to original casing
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
  // Re-sort results by frequency
  return results
    .sort((a, b) => (counts.get(b.toLowerCase().trim()) ?? 0) - (counts.get(a.toLowerCase().trim()) ?? 0))
    .slice(0, n)
}

function styleLabel(style: string): string {
  switch (style) {
    case 'band_tee':  return 'vintage band tees'
    case 'sports':    return 'vintage sports tees'
    case 'workwear':  return 'vintage workwear'
    case 'souvenir':  return 'vintage souvenir tees'
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

    // ── Analyse the collection ──────────────────────────────────────────────
    const brands = shirts.map((s: { brand?: string }) => s.brand).filter(Boolean) as string[]
    const eras   = shirts.map((s: { era?: string })   => s.era).filter(Boolean) as string[]
    const styles = shirts.map((s: { style?: string }) => s.style).filter(Boolean) as string[]

    const topBrands = topN(brands, 3)
    const topEra    = topN(eras, 1)[0] ?? null
    const topStyle  = topN(styles, 1)[0] ?? null

    const groups: { id: string; title: string; listings: ReturnType<typeof mapListings> }[] = []

    // ── Group 1: More from artists/brands you collect ───────────────────────
    if (topBrands.length > 0) {
      // Run brand searches in parallel
      const brandResults = await Promise.all(
        topBrands.map((brand) => browseSearch(token, `${brand} vintage tee`, 6))
      )
      const brandListings = brandResults.flatMap(mapListings)

      if (brandListings.length > 0) {
        const brandNames = topBrands.slice(0, 2).join(' & ')
        groups.push({
          id: 'artists',
          title: `More from ${brandNames}`,
          listings: brandListings.slice(0, 15),
        })
      }
    }

    // ── Group 2: Similar era shirts ─────────────────────────────────────────
    if (topEra) {
      // "Mid 90s" → "90s", "Early 80s" → "80s"
      const decadeMatch = topEra.match(/\d{2}s/)
      const decade = decadeMatch ? decadeMatch[0] : topEra

      const items = await browseSearch(token, `vintage ${decade} tee`, 10)
      const listings = mapListings(items)

      if (listings.length > 0) {
        groups.push({
          id: 'era',
          title: `More from the ${decade}`,
          listings,
        })
      }
    }

    // ── Group 3: Same style ──────────────────────────────────────────────────
    if (topStyle) {
      const items = await browseSearch(token, styleQuery(topStyle), 10)
      const listings = mapListings(items)

      if (listings.length > 0) {
        groups.push({
          id: 'style',
          title: `More ${styleLabel(topStyle)}`,
          listings,
        })
      }
    }

    console.log('[ebay-discover] groups returned:', groups.map(g => `${g.id}(${g.listings.length})`).join(', '))

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
