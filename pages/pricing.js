import { supabase } from '../utils/initSupabase';
import Pricing from '../components/Pricing';
import Button from '../components/ui/Button';
import Script from 'next/script';

export default function PricingPage({ products }) {
  // the return statement renders a one-time payment button. Delete it after when ready.
  return (
    <>
      <Script
        src="https://assets.endorsely.com/endorsely.js"
        data-endorsely="def6bd04-d2b5-4b31-814d-50e230cb97e0"
      />
      <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
        Early Bird Special
      </h1>
      <br />
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="rounded-lg shadow-sm divide-y divide-accents-2 bg-red-100-2">
            <div className="p-6 text-center">
              <h2 className="text-2xl leading-6 font-semibold text-black">
                Creating content for your online business has never been easier.
              </h2>
              <br />
              <h2 className="text-2xl leading-6 font-semibold text-black">
                Own the Ultimate Plan{' '}
                <span className="text-red-500 font-bold italic">Forever</span>
              </h2>
              <p className="mt-4 text-accents-5 text-black">
                Pay once. Unlock lifetime access to the Ultimate plan...limited
                to the first 100 users!
              </p>
              <p className="mt-4 text-accents-5 text-black">
                We’ll email you as soon as your account is ready.
              </p>
              <p className="mt-4 text-accents-5 text-black">Features:</p>
              <p className="mt-4 text-accents-5 text-black">
                120 product image renders / month
              </p>
              <p className="mt-4 text-accents-5 text-black">
                AI Videos of your product - coming soon
              </p>
              <p className="mt-4 text-accents-5 text-black">
                240 caption creation credits / month
              </p>
              <p className="mt-8">
                <span className="text-5xl font-extrabold text-red-500 line-through ml-2">
                  $55 / month
                </span>{' '}
                <span className="text-5xl font-extrabold text-black">
                  $100 one-time
                </span>
              </p>

              <br />
              <Button
                variant="slim"
                type="button"
                //disabled={session && !userLoaded}
                //loading={loading}
                onClick={() =>
                  (window.location.href =
                    'https://buy.stripe.com/4gM7sL7pAdR3bmK6Np2sM06')
                }
                className="mt-8 block w-full rounded-lg py-2 text-sm font-semibold text-center bg-gray-900 text-white border border-gray-900 hover:bg-white hover:text-gray-900 transition-colors duration-200"
              >
                Join the 100 - Lifetime Access Awaits
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  //return <Pricing products={products} />;
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
