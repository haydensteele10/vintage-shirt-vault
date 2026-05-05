const EBAY_CLIENT_ID = Deno.env.get('EBAY_APP_ID') ?? ''
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET') ?? ''
const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

const STYLE_LABELS: Record<string, string> = {
  band_tee: 'band tee',
  sports: 'sports',
  workwear: 'workwear',
  souvenir: 'souvenir',
  other: '',
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { brand, style, era, year } = await req.json()

    const parts = [
      brand,
      STYLE_LABELS[style] ?? '',
      era,
      year ? String(year) : '',
    ].filter(Boolean)
    const keywords = parts.join(' ')

    const token = await getAccessToken()

    const params = new URLSearchParams({
      q: keywords,
      limit: '3',
      sort: 'price',
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION}',
    })

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
    // deno-lint-ignore no-explicit-any
    const items: any[] = data?.itemSummaries ?? []

    const listings = items.slice(0, 3).map((item) => ({
      title: item.title ?? '',
      price: parseFloat(item.price?.value ?? '0'),
      url: item.itemWebUrl ?? '',
      image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
    }))

    return new Response(JSON.stringify({ listings, query: keywords }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
