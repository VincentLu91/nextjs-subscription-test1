import { supabase } from './initSupabase';

/**
 * Checks whether the logged‑in user already has a row in `customers`.
 * If not, call the existing API to create it.
 *
 * @param {object|null} user  Supabase user object (or null/undefined)
 */
export async function addCustomerIfMissing(user) {
  if (!user) return; // no session

  // 1️⃣  Does this UID already exist in `customers`?
  const { data, error } = await supabase
    .from('customers')
    .select('id') // lightweight: PK only
    .eq('id', user.id)
    .single(); // 0 or 1 row

  // Real query failure (network/RLS/etc.)
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows
    console.error('Could not query customers:', error);
    return;
  }

  // 2️⃣  Row already present → nothing to do
  if (data) return;

  // 3️⃣  Row missing → create it via your existing endpoint
  try {
    const res = await fetch('/api/initializeFreeUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'initializeFreeUser failed');
    }
  } catch (e) {
    console.error('initializeFreeUser error:', e);
  }
}
