import { requireAuth, AuthError, sanitizeInput } from '../_shared/rateLimiter.ts'

const ANTHROPIC_API_KEY = (Deno.env.get('ANTHROPIC_API_KEY') ?? '').trim().replace(/[^\x20-\x7E]/g, '')
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

const PROMPT = `You are an expert at identifying vintage T-shirts from eBay listing titles.
Extract structured fields from the listing title provided.

Return a JSON object with EXACTLY these fields (no extra keys):
- brand: string — primary identifier: band/artist, team, brand, or attraction name. Best guess always.
- style: string — EXACTLY one of: "band_tee", "sports", "workwear", "souvenir", "other"
- era: string or null — decade string: "60s", "70s", "80s", "90s", "00s". Infer from year or context clues.
- year: string or null — most specific year as a 4-digit string e.g. "1994". Null if not found.
- condition: string — EXACTLY one of: "Mint", "Excellent", "Good", "Fair", "Poor". Infer from title keywords: deadstock/NWT/new = "Mint"; vintage/vtg = "Good"; worn/faded/distressed = "Fair". Default "Good".
- tour_or_event: string or null — tour name, album, championship, or specific event. Null if none.
- sport: string or null — sports tees only: "baseball", "basketball", "football", "hockey", "NASCAR", "golf", "wrestling", "boxing", "tennis", etc. Null for all other types.
- location: string or null — for souvenir/location tees, the specific place. Null otherwise.
- graphic_keywords: string or null — 2-4 short keywords describing the main visual. Null if generic.

Return ONLY the raw JSON object. No markdown fences. No explanation.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    await requireAuth(req)

    const { title: rawTitle, price } = await req.json()
    const title = sanitizeInput(rawTitle, 500)
    if (!title) throw new Error('title is required')

    console.log('[parse-listing-title] parsing:', title)

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `eBay listing title: "${title}"\nPrice: $${price != null ? Number(price).toFixed(2) : 'unknown'}\n\n${PROMPT}`,
        }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic API error (${res.status}): ${errText}`)
    }

    const anthropicData = await res.json()
    const text: string = anthropicData.content?.[0]?.text ?? ''
    if (!text) throw new Error('Claude returned empty response')

    console.log('[parse-listing-title] raw response:', text)

    let result: Record<string, unknown>
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse Claude response as JSON')
      result = JSON.parse(match[0])
    }

    // Normalise types: Claude may return year as a number
    if (typeof result.year === 'number') result.year = String(result.year)

    // Append fields the edge function knows about
    result.purchase_price = price != null ? String(Number(price).toFixed(2)) : ''
    result.notes = `eBay listing: ${title}`

    console.log('[parse-listing-title] result:', JSON.stringify(result))

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = (err as Error).message
    console.error('[parse-listing-title] error:', msg)
    const status = (err as any).status ?? 500
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
