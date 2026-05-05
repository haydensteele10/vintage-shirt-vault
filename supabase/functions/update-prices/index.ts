import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')               ?? ''
const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? ''
const EBAY_CLIENT_ID       = Deno.env.get('EBAY_APP_ID')                ?? ''
const EBAY_CLIENT_SECRET   = Deno.env.get('EBAY_CLIENT_SECRET')         ?? ''
const CRON_SECRET          = Deno.env.get('CRON_SECRET')                ?? ''

const OAUTH_URL  = 'https://api.ebay.com/identity/v1/oauth2/token'
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
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
  if (!res.ok) throw new Error(`eBay OAuth failed (${res.status}): ${await res.text()}`)
  const { access_token } = await res.json()
  return access_token
}

// deno-lint-ignore no-explicit-any
async function browseSearch(token: string, query: string): Promise<any[]> {
  const params = new URLSearchParams({ q: query, limit: '3' })
  const res = await fetch(`${BROWSE_URL}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Browse API error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data?.itemSummaries ?? []
}

const q = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ')

// deno-lint-ignore no-explicit-any
function buildQueries(shirt: any): string[] {
  const { brand, style, era, year, tour_or_event, graphic_keywords, sport, location } = shirt

  const yearStr = year ? String(year) : ''
  const yearNum = year ? Math.floor(Number(year)) : 0
  const decade  = era
    ? era.replace(/^(early|mid|late)\s+/i, '').trim()
    : yearNum ? `${Math.floor(yearNum / 10) * 10}s` : ''
  const datePart = yearStr || decade

  const queries: string[] = []

  if (style === 'band_tee') {
    if (tour_or_event && datePart) queries.push(q(brand, tour_or_event, datePart, 'tee'))
    if (tour_or_event)             queries.push(q(brand, tour_or_event, 'tee'))
    if (graphic_keywords)          queries.push(q(brand, graphic_keywords, 'vintage tee', decade))
    if (datePart)                  queries.push(q(brand, datePart, 'vintage tee'))
                                   queries.push(q(brand, 'vintage tee'))
                                   queries.push(brand)

  } else if (style === 'sports') {
    if (tour_or_event && datePart) queries.push(q('vintage', brand, tour_or_event, datePart, 'tee'))
    if (tour_or_event)             queries.push(q('vintage', brand, tour_or_event, 'tee'))
    if (sport && datePart)         queries.push(q('vintage', brand, sport, datePart, 'tee'))
    if (datePart)                  queries.push(q('vintage', brand, datePart, 'tee'))
    if (sport)                     queries.push(q('vintage', brand, sport, 'tee'))
                                   queries.push(q('vintage', brand, 'tee'))
                                   queries.push(brand)

  } else if (style === 'souvenir') {
    const place = location ? q(brand, location) : brand
    if (tour_or_event && datePart) queries.push(q(place, tour_or_event, datePart, 'vintage tee'))
    if (tour_or_event)             queries.push(q(place, tour_or_event, 'vintage tee'))
    if (datePart)                  queries.push(q('vintage', place, datePart, 'tee'))
                                   queries.push(q('vintage', place, 'souvenir tee'))
                                   queries.push(q('vintage', place, 'tee'))
                                   queries.push(place)

  } else {
    const brandWithLocation = location ? q(brand, location) : brand
    if (graphic_keywords && datePart) queries.push(q(brandWithLocation, graphic_keywords, datePart, 'vintage tee'))
    if (graphic_keywords)             queries.push(q(brandWithLocation, graphic_keywords, 'vintage tee'))
    if (tour_or_event)                queries.push(q(brandWithLocation, tour_or_event, 'vintage tee'))
    if (datePart)                     queries.push(q(brandWithLocation, datePart, 'vintage tee'))
                                      queries.push(q(brandWithLocation, 'vintage tee'))
                                      queries.push(brandWithLocation)
  }

  const seen = new Set<string>()
  return queries.filter((q) => {
    const k = q.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  // Guard: only allow calls with the correct cron secret
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const { data: shirts, error: fetchErr } = await db
      .from('shirts')
      .select('id, user_id, brand, style, era, year, tour_or_event, graphic_keywords, sport, location, current_value')

    if (fetchErr) throw fetchErr

    console.log(`[update-prices] processing ${shirts?.length ?? 0} shirts`)

    const token = await getAccessToken()

    let updated = 0
    let checked = 0

    for (const shirt of shirts ?? []) {
      try {
        const queries = buildQueries(shirt)
        let items: any[] = [] // deno-lint-ignore no-explicit-any
        let usedQuery = ''

        for (const q of queries) {
          items = await browseSearch(token, q)
          if (items.length > 0) { usedQuery = q; break }
        }

        const now = new Date().toISOString()

        // Always mark as checked, even when no listings found
        await db.from('shirts').update({ price_last_checked: now }).eq('id', shirt.id)
        checked++

        if (items.length === 0) continue

        const prices = items.map((i: any) => parseFloat(i.price?.value ?? '0')).filter((p: number) => p > 0) // deno-lint-ignore no-explicit-any
        if (prices.length === 0) continue

        const newAvg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        const oldVal = shirt.current_value ? parseFloat(shirt.current_value) : null

        const pctChange = oldVal && oldVal > 0 ? Math.abs(newAvg - oldVal) / oldVal : 1

        if (pctChange > 0.05 || !oldVal) {
          await db.from('shirts').update({
            current_value:      parseFloat(newAvg.toFixed(2)),
            price_last_checked: now,
          }).eq('id', shirt.id)

          await db.from('price_history').insert({
            shirt_id:    shirt.id,
            price:       parseFloat(newAvg.toFixed(2)),
            recorded_at: now,
            source:      'eBay auto-update',
            notes:       [
              oldVal ? `Was $${oldVal.toFixed(2)}` : 'First automated price',
              `Now $${newAvg.toFixed(2)}`,
              oldVal ? `${pctChange > 0 ? '+' : ''}${((newAvg - oldVal) / oldVal * 100).toFixed(1)}%` : null,
              `Query: "${usedQuery}"`,
            ].filter(Boolean).join(' · '),
          })

          updated++
          console.log(`[update-prices] ${shirt.brand} (${shirt.id.slice(0, 8)}): $${oldVal?.toFixed(2) ?? '?'} → $${newAvg.toFixed(2)} via "${usedQuery}"`)
        } else {
          console.log(`[update-prices] ${shirt.brand} (${shirt.id.slice(0, 8)}): no change (${(pctChange * 100).toFixed(1)}% drift)`)
        }
      } catch (shirtErr) {
        console.error(`[update-prices] skipped ${shirt.id}:`, (shirtErr as Error).message)
      }
    }

    console.log(`[update-prices] done — ${checked} checked, ${updated} updated`)

    return new Response(JSON.stringify({ checked, updated }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[update-prices] fatal:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
