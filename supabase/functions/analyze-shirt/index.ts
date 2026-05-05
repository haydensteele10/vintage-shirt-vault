const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

const PROMPT = `You are an expert in vintage clothing, band merchandise, and streetwear. Analyze this shirt photo carefully and return ONLY a valid JSON object with these exact fields:

{
  "brand": "the brand name, band/artist name, or team name on the shirt — for band tees use the band name, for sports use team name. Null if genuinely unclear.",
  "era": "approximate era string like '80s', 'Early 90s', 'Mid 90s', 'Late 90s', '2000s'. Base on design style, print technique, tag style, any visible dates. Null if cannot determine.",
  "year": numeric year or null — only if a specific year is determinable from a tour date, event, or copyright mark,
  "style": exactly one of the strings: "band_tee", "sports", "workwear", "souvenir", "other",
  "graphic_description": "1-2 sentence description of the main graphic, artwork, or print",
  "visible_text": "all readable text on the shirt exactly as written — tour dates, locations, slogans, album names. Null if no text visible.",
  "notes": "notable details: print technique (screen print, heat transfer, embroidery, discharge), observed color/fading, cut style, any special features. Null if nothing notable."
}

Return ONLY the JSON object. No markdown fences, no explanation, no other text.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { imageData, mediaType } = await req.json()

    if (!SUPPORTED_TYPES.includes(mediaType)) {
      throw new Error(`Unsupported image type "${mediaType}". Use JPEG, PNG, or WebP.`)
    }

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData },
            },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Claude API error (${res.status}): ${body}`)
    }

    const claudeData = await res.json()
    const text: string = claudeData.content?.[0]?.text ?? ''

    // Parse JSON — fall back to extracting the first {...} block if Claude adds preamble
    let result
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse AI response as JSON')
      result = JSON.parse(match[0])
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
