import cn from 'classnames';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { postData } from '../utils/helpers';
import { getStripe } from '../utils/initStripejs';
import { useUser } from '../components/UserContext';
import Button from './ui/Button';

export default function Pricing({ products }) {
  const [billingInterval, setBillingInterval] = useState('month');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { session, userLoaded, subscription } = useUser();

  const handleCheckout = async (price) => {
    setLoading(true);
    if (!session) {
      router.push('/signin');
      return;
    }
    if (subscription) {
      router.push('/account');
      return;
    }
    const {
      sessionId,
      url,
      error: apiError
    } = await postData({
      url: '/api/createCheckoutSession',
      data: { price },
      token: session.access_token
    });
    if (apiError) return alert(apiError.message);
    const stripe = await getStripe();
    console.log(sessionId, url);
    window.location.href = url;
    //const { error: stripeError } = stripe.redirectToCheckout({ sessionId });
    //if (stripeError) alert(error.message);
    //setLoading(false);
  };

  if (!products.length)
    return (
      <section className="bg-black">
        <div className="max-w-6xl mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-6xl font-extrabold text-white sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-pink underline"
              href="https://dashboard.stripe.com/products"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Dashboard
            </a>
            .
          </p>
        </div>
      </section>
    );

  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Choose a Plan.
          </h1>
          <p className="mt-5 text-xl text-black sm:text-center sm:text-2xl max-w-2xl m-auto">
            You could start generating quality images for 14 days.
          </p>
          <div className="relative self-center mt-6 bg-primary-2 rounded-lg p-0.5 flex sm:mt-8 border border-accents-0">
            <button
              onClick={() => setBillingInterval('month')}
              type="button"
              className={`${
                billingInterval === 'month'
                  ? 'relative w-1/2 bg-accents-1 border-accents-0 shadow-sm text-white'
                  : 'ml-0.5 relative w-1/2 border border-transparent text-accents-4'
              } rounded-lg m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              type="button"
              className={`${
                billingInterval === 'year'
                  ? 'relative w-1/2 bg-accents-1 border-accents-0 shadow-sm text-white'
                  : 'ml-0.5 relative w-1/2 border border-transparent text-accents-4'
              } rounded-lg m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
            >
              Yearly billing
            </button>
          </div>
        </div>
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-4">
          {products.map((product) => {
            const price = product.prices.find(
              (price) => price.interval === billingInterval
            );
            const priceString = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: price.currency,
              minimumFractionDigits: 0
            }).format(price.unit_amount / 100);
            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-lg shadow-sm divide-y divide-accents-2 bg-primary-2',
                  {
                    'border border-pink': subscription
                      ? product.name === subscription?.prices?.products.name
                      : product.name === 'Freelancer'
                  }
                )}
              >
                <div className="p-6">
                  <h2 className="text-2xl leading-6 font-semibold text-white">
                    {product.name}
                  </h2>
                  <p className="mt-4 text-accents-5">{product.description}</p>
                  <p className="mt-8">
                    <span className="text-5xl font-extrabold white">
                      {priceString}
                    </span>
                    <span className="text-base font-medium text-accents-8">
                      /{billingInterval}
                    </span>
                  </p>
                  <Button
                    variant="slim"
                    type="button"
                    disabled={session && !userLoaded}
                    loading={loading}
                    onClick={() => handleCheckout(price.id)}
                    className="mt-8 block w-full rounded-lg py-2 text-sm font-semibold text-white text-center hover:bg-gray-900"
                  >
                    {product.name === subscription?.prices?.products.name
                      ? 'Manage'
                      : 'Subscribe'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <p className="mt-24 text-xs uppercase text-accents-3 text-center font-bold tracking-widest">
            Here is what the plans will do for you:
          </p>
          <ul>
            <li className="text-xs uppercase text-center">
              - unique, quality images generated by AI
            </li>
            <li className="text-xs uppercase text-center">
              - unlimited access to any number of images you want to use
            </li>
            <li className="text-xs uppercase text-center">
              - Use them on your landing page, social media, website, and other
              marketing materials
            </li>
            <li className="text-xs uppercase text-center">
              - Save you hours and thousands of dollars of your time. Good for
              new entrepreneurs starting out
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
