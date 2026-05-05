const EBAY_APP_ID = Deno.env.get('EBAY_APP_ID') ?? ''
const FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1'

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

    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': EBAY_APP_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords': keywords,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'paginationInput.entriesPerPage': '3',
      'sortOrder': 'EndTimeSoonest',
    })

    const res = await fetch(`${FINDING_API}?${params.toString()}`)
    if (!res.ok) throw new Error(`eBay API responded with ${res.status}`)

    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const items: any[] = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? []

    const listings = items.slice(0, 3).map((item) => ({
      title: item.title?.[0] ?? '',
      price: parseFloat(item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.['__value__'] ?? '0'),
      url: item.viewItemURL?.[0] ?? '',
      image: item.galleryURL?.[0] ?? '',
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
