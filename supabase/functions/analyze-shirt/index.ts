const ANTHROPIC_API_KEY = (Deno.env.get('ANTHROPIC_API_KEY') ?? '').trim().replace(/[^\x20-\x7E]/g, '')
console.log('[analyze-shirt] API key length:', ANTHROPIC_API_KEY.length)

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

const PROMPT = `You are an expert authenticator of vintage clothing — band merchandise, sports shirts, brand tees, souvenir shirts, and workwear. Extract every detail a collector or eBay seller needs to identify and price this shirt accurately.

━━━ STEP 1: IDENTIFY THE SHIRT TYPE ━━━
Determine which category this is before extracting details:
• BAND / MUSIC TEE — any artist, band, or music event shirt
• SPORTS TEE — team sport, individual athlete, racing, or league shirt
• BRAND / LICENSED merch — Harley Davidson, NASCAR driver, Hard Rock Cafe, movie/TV, restaurant chain, corporate promo
• SOUVENIR / TOURIST — location-based: city, national park, beach, theme park, cruise, travel destination
• WORKWEAR — company uniform, union, trade, or occupational shirt

━━━ STEP 2: STYLE-SPECIFIC EXTRACTION ━━━

For BAND / MUSIC tees — the most important fields are band name, tour name, and year:
• Look for the band name in large text, small text, and via imagery (see mascot guide below)
• Tour name is gold: "Monsters of Rock Tour", "Lollapalooza 1993", "Use Your Illusion Tour"
• Album names count as tour_or_event: "Nevermind", "Back in Black", "The Joshua Tree"
• Year from: tour dates printed on back, copyright line at hem (© 1987 Winterland), event year

BAND MASCOT & LOGO RECOGNITION — identify these even without text:
Mascots: Iron Maiden "Eddie" (skeletal figure, many forms) · Misfits skull/crimson ghost · Grateful Dead dancing bears (colourful row), Bertha (skeleton with roses), stealie (skull + lightning bolt), terrapin · Metallica "Scary Guy" (angular alien face), Justice lady · Motorhead Warpig (fanged boar-skull) · Nirvana smiley face with X eyes · AC/DC Angus Young schoolboy silhouette · Rolling Stones lips-and-tongue · Black Flag four bars · Ramones presidential eagle seal
Styles: Rick Griffin/Mouse Studios psychedelic lettering (Grateful Dead) · Derek Riggs painting style (Iron Maiden) · Pushead skull/tentacle art (Metallica, punk)
→ If identified by imagery: set brand to the band name, note reasoning in notes field.

For SPORTS tees — key fields are team, sport, and any championship/event:
• Team name with city: "Chicago Bulls", "New York Yankees", "Dallas Cowboys"
• Sport type: baseball, basketball, football, hockey, soccer, NASCAR, golf, boxing, wrestling
• Championship or season event: "1996 NBA Champions", "World Series 1986", "Super Bowl XXIX", "Stanley Cup 1994"
• Player name if shirt is player-specific (e.g. "Michael Jordan #23")
• League if visible: MLB, NFL, NBA, NHL, NCAA

For BRAND / LICENSED merch — graphic description is the key eBay search term:
• Exact brand and sub-brand: "Harley Davidson", "Dale Earnhardt #3 NASCAR", "Hard Rock Cafe"
• Location if part of the brand: "Hard Rock Cafe London", "Sturgis Bike Week 1995"
• Specific design motif that collectors search: "eagle flames", "bald eagle American flag", "wolf howling moon"
• Licensed property: movie title, TV show, character name, video game

For SOUVENIR / TOURIST tees — location and event are the key fields:
• Exact location: "Yellowstone National Park", "Las Vegas Nevada", "Florida Keys", "Cancun Mexico"
• Venue or attraction: "SeaWorld", "Graceland", "Fenway Park"
• Event if applicable: "Spring Break 1994", "Mardi Gras 1992"

━━━ STEP 3: READ ALL TEXT — SCAN EVERY AREA ━━━
• Copyright hem line (bottom front): "© 1987 Winterland", "© Brockum" — contains year + licensor
• Back print: tour cities, event dates, sponsor list, slogans
• Sleeve prints, collar area text
• Faded or cracked lettering — attempt best read, mark uncertain text with [?]

━━━ FIELDS TO RETURN ━━━
Return a JSON object with EXACTLY these fields:

- brand: string or null — PRIMARY identifier. Band/artist name · Team name (e.g. "Chicago Bulls") · Brand name (e.g. "Harley Davidson") · Main attraction/venue (e.g. "Yellowstone"). Exact spelling and capitalisation.
- tour_or_event: string or null — Band: tour or album name. Sports: championship or season event. Brand: specific campaign/location/event (e.g. "Sturgis 1995"). Souvenir: event name. Null if none.
- sport: string or null — SPORTS TEES ONLY: "baseball", "basketball", "football", "hockey", "NASCAR", "soccer", "golf", "boxing", "wrestling", "tennis", etc. Null for all other shirt types.
- location: string or null — SOUVENIR / BRAND LOCATION TEES: the specific geographic place (e.g. "Las Vegas", "Yellowstone National Park", "Daytona Beach"). Also use for Harley/Hard Rock location variants. Null if not applicable.
- year: number or null — most specific year. Check: tour/event dates, copyright line, "© YEAR", season year.
- era: string or null — if no specific year: "Early 80s", "Mid 80s", "Late 80s", "Early 90s", "Mid 90s", "Late 90s", "Early 2000s". Infer from design, print technique, tag, colour palette.
- style: string — exactly one of: "band_tee", "sports", "workwear", "souvenir", "other"
- graphic_description: string — precise description of main graphic: subject, colours, art style (e.g. "large eagle with American flag wings, red white blue on black").
- graphic_keywords: string or null — 2–4 short eBay-optimised keywords for the most distinctive visual: "dancing bears", "lips tongue logo", "eagle flames", "wolf moon", "stealie", "warpig". Null if graphic is generic.
- front_text: string or null — ALL front text transcribed exactly with line breaks as \\n. Include copyright line. Null if none.
- back_text: string or null — ALL back text if shown: cities, dates, slogans, copyright. Null if not shown.
- tag_brand: string or null — manufacturer tag if visible: Hanes · Fruit of the Loom · Screen Stars · Anvil · Delta · Jerzees · Salem · Tultex · Oneita · Signal · Alstyle · Brockum · Winterland · other. Null if not visible.
- stitch_type: string or null — "single stitch" (one hem row, pre-1995) · "double stitch" (two rows, post-1994) · null if not visible.
- notes: string or null — identification method if no text visible · print technique (screen print, heat transfer, discharge) · fabric weight · distressing/fading · boxy vs fitted · country of manufacture.

Return ONLY the raw JSON object. No markdown fences, no preamble, no explanation.`

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

    console.log('[analyze-shirt] raw Claude response:', text)

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

    console.log('[analyze-shirt] parsed —', JSON.stringify({ brand: result.brand, style: result.style, tour_or_event: result.tour_or_event, sport: result.sport, location: result.location, year: result.year, graphic_keywords: result.graphic_keywords }))

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
