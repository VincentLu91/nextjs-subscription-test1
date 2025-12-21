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
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_30
    },
    {
      name: 'Standard Pack',
      amount: 60,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_60
    },
    {
      name: 'Pro Pack',
      amount: 120,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_120
    },
    {
      name: 'Business Pack',
      amount: 300,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_IMAGE_300
    }
  ],
  video_tokens: [
    {
      name: 'Starter Pack',
      amount: 10,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_10
    },
    {
      name: 'Standard Pack',
      amount: 20,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_20
    },
    {
      name: 'Pro Pack',
      amount: 40,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_40
    },
    {
      name: 'Business Pack',
      amount: 100,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_VIDEO_100
    }
  ],
  caption_tokens: [
    {
      name: 'Starter Pack',
      amount: 30,
      price: 4.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_30
    },
    {
      name: 'Standard Pack',
      amount: 60,
      price: 8.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_60
    },
    {
      name: 'Pro Pack',
      amount: 120,
      price: 15.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_120
    },
    {
      name: 'Business Pack',
      amount: 300,
      price: 34.99,
      stripe_price_id: process.env.NEXT_PUBLIC_PRICE_CAPTION_300
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
  const router = useRouter();
  const { user, isLoadingUser } = useUser();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
    }
  }, [user, isLoadingUser, router]);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (user) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();
        setCustomer(data);
      }
    };
    fetchCustomer();
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
                disabled={loading || !pkg.stripe_price_id}
                className="w-full mt-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium
                  transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Processing...'
                  : pkg.stripe_price_id
                    ? 'Purchase'
                    : 'Coming Soon'}
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
