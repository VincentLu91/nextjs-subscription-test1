import { supabaseAdmin } from '../../utils/initSupabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // First check if a customer record already exists
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', user_id)
      .single();

    if (existingCustomer) {
      return res.status(200).json({ message: 'Customer already initialized' });
    }

    // If no customer record exists, create one with free tokens
    const { error } = await supabaseAdmin.from('customers').insert([
      {
        id: user_id,
        stripe_customer_id: null,
        image_tokens: 12,
        training_tokens: 14,
        caption_tokens: 16,
        video_tokens: 18
      }
    ]);

    if (error) {
      console.error('Error creating customer record:', error);
      return res
        .status(500)
        .json({ error: 'Failed to create customer record' });
    }

    return res
      .status(200)
      .json({ message: 'Free user initialized successfully' });
  } catch (err) {
    console.error('Error initializing free user:', err);
    return res.status(500).json({ error: 'Error initializing free user' });
  }
}
