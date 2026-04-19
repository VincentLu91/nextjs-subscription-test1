import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../components/UserContext';
import { supabase } from '../utils/initSupabase';
import Link from 'next/link';

// Credit packages with prices - add your Stripe Price IDs in .env.local
const CREDIT_PACKAGES = {
  image_tokens: [
    {
      name: 'Starter Pack',
      amount: 30,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_START
    },
    {
      name: 'Standard Pack',
      amount: 60,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_STANDARD
    },
    {
      name: 'Pro Pack',
      amount: 120,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_PRO
    },
    {
      name: 'Business Pack',
      amount: 300,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_BIZ
    }
  ],
  video_tokens: [
    {
      name: 'Starter Pack',
      amount: 10,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_START
    },
    {
      name: 'Standard Pack',
      amount: 20,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_STANDARD
    },
    {
      name: 'Pro Pack',
      amount: 40,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_PRO
    },
    {
      name: 'Business Pack',
      amount: 100,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_BIZ
    }
  ],
  caption_tokens: [
    {
      name: 'Starter Pack',
      amount: 30,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_START
    },
    {
      name: 'Standard Pack',
      amount: 60,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_STANDARD
    },
    {
      name: 'Pro Pack',
      amount: 120,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_PRO
    },
    {
      name: 'Business Pack',
      amount: 300,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_BIZ
    }
  ]
};

const TOKEN_LABELS = {
  image_tokens: 'Image',
  video_tokens: 'Video',
  caption_tokens: 'Caption'
};

export default function BuyCredits() {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [tokenType, setTokenType] = useState('image_tokens');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const router = useRouter();
  const { user, isLoadingUser } = useUser();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
    }
  }, [user, isLoadingUser, router]);

  useEffect(() => {
    const fetchCustomerAndSubscription = async () => {
      if (user) {
        // Fetch customer data
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();
        setCustomer(customerData);

        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        setHasActiveSubscription(!!subscription);
        setIsCheckingSubscription(false);
      }
    };
    fetchCustomerAndSubscription();
  }, [user]);

  const purchaseCredits = async (pkg) => {
    setLoading(true);
    if (!user) {
      router.push('/signin');
      return;
    }

    try {
      const response = await fetch('/api/buy-credits-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success_url: `${window.location.origin}/dashboard?purchase=success`,
          cancel_url: window.location.href,
          price_id: pkg.stripe_price_id,
          user_id: user.id,
          user_email: user.email,
          token_type: tokenType,
          token_amount: pkg.amount
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error during credit purchase:', error);
      alert('Failed to initiate purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingUser || !user) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[#0C0C0C] relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(123,92,255,0.05),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        {/* Back Button */}
        <Link href="/dashboard">
          <button className="mb-8 px-4 py-2 bg-transparent border border-white/20 text-white/85 rounded-lg hover:bg-white/5 hover:border-white/30 transition-all">
            ← Back to Dashboard
          </button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Buy Additional Credits
          </h1>
          <p className="text-lg text-gray-400">
            Top up your account with additional credits on top of your existing
            subscription
          </p>
        </div>

        {/* Current Balance */}
        {customer && (
          <div className="bg-[#1A1A1A] rounded-2xl p-8 mb-12 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6">
              Your Current Balance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30">
                <div className="text-sm text-gray-400 mb-2">Image Tokens</div>
                <div className="text-3xl font-bold text-indigo-400">
                  {customer.image_tokens || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/30">
                <div className="text-sm text-gray-400 mb-2">Video Tokens</div>
                <div className="text-3xl font-bold text-blue-400">
                  {customer.video_tokens || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
                <div className="text-sm text-gray-400 mb-2">Caption Tokens</div>
                <div className="text-3xl font-bold text-purple-400">
                  {customer.caption_tokens || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Required Warning for Video/Caption Tokens */}
        {!hasActiveSubscription &&
          !isCheckingSubscription &&
          (tokenType === 'video_tokens' || tokenType === 'caption_tokens') && (
            <div className="max-w-3xl mx-auto mb-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                    Active Subscription Required
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {tokenType === 'video_tokens'
                      ? 'Video tokens'
                      : 'Caption tokens'}{' '}
                    are only available to users with an active subscription.
                    Please subscribe to a plan first before purchasing
                    additional credits.
                  </p>
                  <Link href="/pricing">
                    <button className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/40 transition-all">
                      View Subscription Plans
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

        {/* Token Type Tabs */}
        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => setTokenType('image_tokens')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tokenType === 'image_tokens'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40'
                : 'bg-white/5 text-white/85 hover:bg-white/10'
            }`}
          >
            Image Tokens
          </button>
          <button
            onClick={() => setTokenType('video_tokens')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tokenType === 'video_tokens'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40'
                : 'bg-white/5 text-white/85 hover:bg-white/10'
            }`}
          >
            Video Tokens
            {!hasActiveSubscription && !isCheckingSubscription && (
              <span className="ml-2 text-xs">🔒</span>
            )}
          </button>
          <button
            onClick={() => setTokenType('caption_tokens')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tokenType === 'caption_tokens'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40'
                : 'bg-white/5 text-white/85 hover:bg-white/10'
            }`}
          >
            Caption Tokens
            {!hasActiveSubscription && !isCheckingSubscription && (
              <span className="ml-2 text-xs">🔒</span>
            )}
          </button>
        </div>

        {/* Credit Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CREDIT_PACKAGES[tokenType].map((pkg, index) => (
            <div
              key={index}
              className="bg-[#1A1A1A] rounded-2xl p-6 shadow-lg hover:transform hover:scale-105 transition-all duration-300 flex flex-col"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                {pkg.name}
              </h3>
              <div className="text-sm text-gray-400 mb-6">
                {pkg.amount} {TOKEN_LABELS[tokenType]} Tokens
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  ${pkg.price.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => purchaseCredits(pkg)}
                disabled={
                  loading ||
                  !pkg.stripe_price_id ||
                  ((tokenType === 'video_tokens' ||
                    tokenType === 'caption_tokens') &&
                    !hasActiveSubscription)
                }
                className="w-full mt-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium
                  transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Processing...'
                  : !pkg.stripe_price_id
                    ? 'Coming Soon'
                    : (tokenType === 'video_tokens' ||
                          tokenType === 'caption_tokens') &&
                        !hasActiveSubscription
                      ? 'Subscription Required'
                      : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            💡 Credits purchased are added on top of your monthly/yearly
            subscription allocation
          </p>
          <p className="mt-2">
            Credits never expire and roll over month to month
          </p>
        </div>
      </div>
    </section>
  );
}
