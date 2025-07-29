import { supabase } from './initSupabase';

export async function ensureCustomerRow(user) {
  if (!user) return; // safety guard

  const { error } = await supabase.from('customers').upsert(
    { id: user.id, email: user.email }, // whatever columns you need
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (error) console.error('upsert failed:', error);
}
