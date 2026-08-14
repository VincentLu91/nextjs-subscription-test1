import { supabase } from '../utils/initSupabase';
import Pricing from '../components/Pricing';
import Button from '../components/ui/Button';
import Script from 'next/script';

export default function PricingPage({ products }) {
  // the return statement renders a one-time payment button. Delete it after when ready.
  return <Pricing products={products} />;
}

export async function getStaticProps() {
  // Load all active products and prices at build time.
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { foreignTable: 'prices' });
  if (error) console.log(error.message);

  return {
    props: {
      products: products ?? []
    },
    // Refetch and rebuild pricing page every minute.
    revalidate: 60
  };
}
