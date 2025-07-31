import cn from 'classnames';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { getStripe } from '../utils/initStripejs';
import { useUser } from '../components/UserContext';
import Button from './ui/Button';

export default function Pricing({ products }) {
  const [billingInterval, setBillingInterval] = useState('month');
  const [loading, setLoading] = useState(false);
  const [animatedPrices, setAnimatedPrices] = useState({});
  const [isAnnualVisible, setIsAnnualVisible] = useState(false);
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
  };

  useEffect(() => {
    // Animate prices when billing interval changes
    products.forEach((product) => {
      const price = product.prices.find(
        (p) =>
          p.interval === billingInterval &&
          p.product_id !== 'prod_SW7dE3i2msnicA'
      );
      if (price) {
        const amount = price.unit_amount / 100;
        const startAmount = animatedPrices[product.id] || 0;
        const duration = 200;
        const startTime = performance.now();

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function (ease-out)
          const eased = 1 - Math.pow(1 - progress, 2);
          const currentAmount = Math.floor(
            startAmount + (amount - startAmount) * eased
          );

          setAnimatedPrices((prev) => ({
            ...prev,
            [product.id]: currentAmount
          }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      }
    });

    // Animate annual savings badge
    setIsAnnualVisible(false);
    if (billingInterval === 'year') {
      setTimeout(() => setIsAnnualVisible(true), 50);
    }
  }, [billingInterval, products]);

  if (!products.length)
    return (
      <section className="bg-[#0E0E0F] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%)]"></div>
        <div className="max-w-[1000px] mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8 relative">
          <p className="text-6xl font-extrabold text-[rgba(255,255,255,0.95)] sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-[#7B5CFF] underline"
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
    <section className="bg-black relative">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 40% 30%, rgba(123,92,255,0.05) 0%, transparent 60%), url('/noise.png') repeat 3%`
        }}
      ></div>
      <div className="max-w-[1000px] mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-[20px] font-semibold tracking-[-0.2px] text-[rgba(255,255,255,0.95)] sm:text-center">
            Choose Your Plan
          </h1>

          <div className="relative self-center mt-6 sm:mt-8">
            <div className="sticky top-0 z-10 flex justify-center items-center p-4 sm:static">
              <div className="relative h-8 bg-[#1A1A1D] rounded-full w-56 flex items-center p-1">
                <button
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  className={`${
                    billingInterval === 'month'
                      ? 'bg-gradient-to-r from-[#7B5CFF] to-[#985CFF] shadow-[0_0_12px_rgba(123,92,255,0.35)]'
                      : ''
                  } relative w-1/2 h-6 rounded-full transition-all duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]`}
                >
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
                      billingInterval === 'month'
                        ? 'text-white'
                        : 'text-[rgba(255,255,255,0.85)]'
                    }`}
                  >
                    Monthly
                  </span>
                </button>
                <button
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  className={`${
                    billingInterval === 'year'
                      ? 'bg-gradient-to-r from-[#7B5CFF] to-[#985CFF] shadow-[0_0_12px_rgba(123,92,255,0.35)]'
                      : ''
                  } relative w-1/2 h-6 rounded-full transition-all duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]`}
                >
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-sm font-medium ${
                      billingInterval === 'year'
                        ? 'text-white'
                        : 'text-[rgba(255,255,255,0.85)]'
                    }`}
                  >
                    Yearly
                  </span>
                </button>
              </div>
              {billingInterval === 'year' && (
                <span
                  className={`ml-3 text-sm font-medium text-[#7B5CFF] bg-[rgba(123,92,255,0.1)] px-2 py-1 rounded-full transition-opacity duration-150 ${isAnnualVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  Save 18% yearly
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {products.map((product) => {
            const price = product.prices.find(
              (price) =>
                price.interval === billingInterval &&
                price.product_id !== 'prod_SW7dE3i2msnicA'
            );

            if (!price) return null;

            const priceString = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: price.currency,
              minimumFractionDigits: 0
            }).format(animatedPrices[product.id] || price.unit_amount / 100);

            const imageTokens = price.image_tokens || 0;
            const trainingTokens = price.training_tokens || 0;
            const captionTokens = price.caption_tokens || 0;

            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl bg-[#1A1A1D] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-250 hover:translate-y-[-6px] hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(123,92,255,0.25)] w-full sm:w-[280px]',
                  {
                    'relative before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-[#7B5CFF] before:to-[#00D0FF] before:-z-10 before:backdrop-blur-[10px] before:saturate-[130%]':
                      product.name === 'Professional',
                    'ring-2 ring-[#7B5CFF]': subscription
                      ? product.name === subscription?.prices?.products.name
                      : product.name === 'Freelancer'
                  }
                )}
              >
                <div className="p-6">
                  <h2 className="text-[20px] font-semibold tracking-[-0.2px] text-[rgba(255,255,255,0.95)]">
                    {product.name}
                  </h2>
                  <p className="mt-4 text-[rgba(255,255,255,0.85)]">
                    {product.description}
                  </p>
                  <div className="mt-8">
                    <span className="text-[48px] font-bold text-[rgba(255,255,255,0.95)]">
                      {priceString}
                    </span>
                    <span className="text-base text-[rgba(255,255,255,0.85)]">
                      /{billingInterval}
                    </span>
                  </div>

                  <ul className="mt-8 space-y-4">
                    <li className="flex items-center text-[rgba(255,255,255,0.85)]">
                      <svg
                        className="w-4 h-4 mr-3 text-[#7B5CFF]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {imageTokens} product image renders
                    </li>
                    <li className="flex items-center text-[rgba(255,255,255,0.55)]">
                      <svg
                        className="w-4 h-4 mr-3 text-[#7B5CFF]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      AI Videos of your product - coming soon
                    </li>
                    <li className="flex items-center text-[rgba(255,255,255,0.85)]">
                      <svg
                        className="w-4 h-4 mr-3 text-[#7B5CFF]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {captionTokens} caption creation credits
                    </li>
                  </ul>

                  <button
                    disabled={session && !userLoaded}
                    onClick={() => handleCheckout(price.id)}
                    className={`mt-8 w-full px-8 py-3.5 rounded-lg text-[rgba(255,255,255,0.95)] font-medium
                      bg-transparent border border-transparent bg-gradient-to-r from-[#7B5CFF] to-[#985CFF] bg-clip-text
                      hover:from-transparent hover:to-transparent hover:text-white
                      hover:bg-gradient-to-r hover:from-[#7B5CFF] to-[#985CFF]
                      hover:shadow-[0_0_12px_rgba(123,92,255,0.4)]
                      transition-all duration-250 ease-[cubic-bezier(.25,.8,.25,1)]
                      relative
                      before:absolute before:inset-0 before:rounded-lg before:p-[1px]
                      before:bg-gradient-to-r before:from-[#7B5CFF] to-[#985CFF]
                      before:-z-10
                    `}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="w-5 h-5 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </span>
                    ) : product.name === subscription?.prices?.products.name ? (
                      'Manage'
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
