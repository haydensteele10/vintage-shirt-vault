const EBAY_CLIENT_ID = Deno.env.get('EBAY_APP_ID') ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET') ?? ''
const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

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
async function browseSearch(token: string, query: string): Promise<any[]> {
  const params = new URLSearchParams({ q: query, limit: '3' })
  console.log('[ebay-search] trying query:', query)

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const body = await req.json()
    console.log('[ebay-search] received body:', JSON.stringify(body))

    const { brand, style, era, year, tour_or_event, graphic_keywords, sport, location } = body

    const token = await getAccessToken()

    // Normalise era to short decade form ("Early 90s" → "90s") — eBay listings use the short form.
    const yearStr = year ? String(year) : ''
    const yearNum = year ? Math.floor(Number(year)) : 0
    const decade = era
      ? era.replace(/^(early|mid|late)\s+/i, '').trim()
      : yearNum ? `${Math.floor(yearNum / 10) * 10}s` : ''
    const datePart = yearStr || decade

    const q = (...parts: (string | null | undefined)[]) =>
      parts.filter(Boolean).join(' ')

    const queries: string[] = []

    if (style === 'band_tee') {
      // Tour name is the strongest eBay signal for band tees
      if (tour_or_event && datePart) queries.push(q(brand, tour_or_event, datePart, 'tee'))
      if (tour_or_event)             queries.push(q(brand, tour_or_event, 'tee'))
      if (graphic_keywords)          queries.push(q(brand, graphic_keywords, 'vintage tee', decade))
      if (datePart)                  queries.push(q(brand, datePart, 'vintage tee'))
                                     queries.push(q(brand, 'vintage tee'))
                                     queries.push(brand)

    } else if (style === 'sports') {
      // Championship/event is the strongest signal; then sport+year; then team+era
      if (tour_or_event && datePart) queries.push(q('vintage', brand, tour_or_event, datePart, 'tee'))
      if (tour_or_event)             queries.push(q('vintage', brand, tour_or_event, 'tee'))
      if (sport && datePart)         queries.push(q('vintage', brand, sport, datePart, 'tee'))
      if (datePart)                  queries.push(q('vintage', brand, datePart, 'tee'))
      if (sport)                     queries.push(q('vintage', brand, sport, 'tee'))
                                     queries.push(q('vintage', brand, 'tee'))
                                     queries.push(brand)

    } else if (style === 'souvenir') {
      // Location + event + year is the key combination for souvenir tees
      const place = location ? q(brand, location) : brand
      if (tour_or_event && datePart) queries.push(q(place, tour_or_event, datePart, 'vintage tee'))
      if (tour_or_event)             queries.push(q(place, tour_or_event, 'vintage tee'))
      if (datePart)                  queries.push(q('vintage', place, datePart, 'tee'))
                                     queries.push(q('vintage', place, 'souvenir tee'))
                                     queries.push(q('vintage', place, 'tee'))
                                     queries.push(place)

    } else {
      // workwear / other — brand tees (Harley Davidson, Hard Rock Cafe, NASCAR, movie merch, etc.)
      // Graphic keywords + location are the key eBay differentiators for these
      const brandWithLocation = location ? q(brand, location) : brand
      if (graphic_keywords && datePart) queries.push(q(brandWithLocation, graphic_keywords, datePart, 'vintage tee'))
      if (graphic_keywords)             queries.push(q(brandWithLocation, graphic_keywords, 'vintage tee'))
      if (tour_or_event)                queries.push(q(brandWithLocation, tour_or_event, 'vintage tee'))
      if (datePart)                     queries.push(q(brandWithLocation, datePart, 'vintage tee'))
                                        queries.push(q(brandWithLocation, 'vintage tee'))
                                        queries.push(brandWithLocation)
    }

    // Deduplicate while preserving order
    const seen = new Set<string>()
    const uniqueQueries = queries.filter((q) => {
      const k = q.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    let items: any[] = [] // deno-lint-ignore no-explicit-any
    let usedQuery = ''

    for (const q of uniqueQueries) {
      items = await browseSearch(token, q)
      if (items.length > 0) {
        usedQuery = q
        break
      }
    }

    console.log('[ebay-search] final query used:', usedQuery, '| listings found:', items.length)

    const listings = items.slice(0, 3).map((item: any) => ({ // deno-lint-ignore no-explicit-any
      title: item.title ?? '',
      price: parseFloat(item.price?.value ?? '0'),
      url: item.itemWebUrl ?? '',
      image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
    }))

    return new Response(JSON.stringify({ listings, query: usedQuery }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[ebay-search] error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
