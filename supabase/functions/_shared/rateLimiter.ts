import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')             ?? ''
const SUPABASE_ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY')        ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ─── Error classes ────────────────────────────────────────────────────────────

export class AuthError extends Error {
  status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class RateLimitError extends Error {
  status = 429
  constructor(limit: number, fnName: string) {
    super(`Daily limit of ${limit} reached for ${fnName}. Try again tomorrow.`)
    this.name = 'RateLimitError'
  }
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

export async function requireAuth(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header')
  }
  const token = authHeader.slice(7).trim()
  if (!token) {
    throw new AuthError('Missing bearer token')
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) {
    throw new AuthError('Invalid or expired token')
  }

  return data.user.id
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────

export async function checkRateLimit(
  userId: string,
  fnName: string,
  dailyLimit: number,
): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[rateLimiter] SUPABASE_SERVICE_ROLE_KEY not set — skipping rate limit for ${fnName}`)
    return
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const { data, error } = await admin.rpc('check_and_increment_api_usage', {
    p_user_id: userId,
    p_function: fnName,
    p_date: today,
    p_limit: dailyLimit,
  })

  if (error) {
    console.warn(`[rateLimiter] DB error for ${fnName}:`, error.message, '— failing open')
    return
  }

  if (data === false) {
    throw new RateLimitError(dailyLimit, fnName)
  }
}

// ─── sanitizeInput ────────────────────────────────────────────────────────────

export function sanitizeInput(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return ''
  return val.replace(/<[^>]*>/g, '').trim().slice(0, maxLen)
}
