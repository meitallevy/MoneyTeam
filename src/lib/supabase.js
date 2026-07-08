import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
}

// Pass-through lock DISABLES the browser navigator.locks mechanism the client
// normally uses to coordinate the auth session. That lock can deadlock the very
// first getSession() when a stale lock/session is left in storage (from a crashed
// tab, a previous broken build, etc.) — the symptom is the app stuck forever on
// the "…" loading screen with ZERO network requests to Supabase. Making it a
// no-op pass-through removes that failure mode entirely.
const passthroughLock = async (_name, _acquireTimeout, fn) => fn()

export const supabase = createClient(url || 'http://localhost', anon || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    lock: passthroughLock,
  },
})
