const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

// Written as bullet-point schema — NOT an inline JSON template — so Claude can't
// accidentally mirror unquoted values back and break JSON.parse on the client.
const PROMPT = `You are an expert in vintage clothing, band merchandise, and streetwear.

Analyze this shirt photo and return a JSON object with EXACTLY these fields:

- brand: string or null — brand name, band/artist name, or team name. Null if genuinely unclear.
- era: string or null — approximate era like "80s", "Early 90s", "Mid 90s", "Late 90s", "2000s". Use design style, print technique, tag details, and any visible dates. Null if indeterminate.
- year: number or null — specific year only when determinable from a tour date, event, or copyright mark. Otherwise null.
- style: string — exactly one of: "band_tee", "sports", "workwear", "souvenir", "other"
- graphic_description: string — 1-2 sentences describing the main graphic or print.
- visible_text: string or null — all readable text on the shirt exactly as written (tour dates, locations, slogans, album names). Null if none visible.
- notes: string or null — print technique (screen print, heat transfer, embroidery, discharge print), any fading or distressing, cut style, special features. Null if nothing notable.

Return ONLY the raw JSON object. No markdown code fences, no preamble, no explanation.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { imageData, mediaType } = await req.json()

    if (!imageData || typeof imageData !== 'string' || imageData.length === 0) {
      throw new Error('Request body must include a non-empty imageData string (base64)')
    }
    if (!SUPPORTED_TYPES.includes(mediaType)) {
      throw new Error(`Unsupported media type "${mediaType}". Must be one of: ${SUPPORTED_TYPES.join(', ')}`)
    }

    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${errBody}`)
    }

    const anthropicData = await anthropicRes.json()
    const text: string = anthropicData.content?.[0]?.text ?? ''

    if (!text) throw new Error('Claude returned an empty response')

    // Primary: try straight JSON.parse. Fallback: extract first {...} block in case
    // Claude adds any surrounding prose despite the instruction.
    let result
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) {
        throw new Error(`Could not parse Claude response as JSON. Raw: ${text.slice(0, 300)}`)
      }
      result = JSON.parse(match[0])
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[analyze-shirt]', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
