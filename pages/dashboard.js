import styles from '../styles/Home.module.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '../components/UserContext';
import { useRouter } from 'next/router';
import { addCustomerIfMissing } from '../utils/provisionCustomer'; // add new users to 'customers' table w tokens
import { supabase } from '../utils/initSupabase';

export default function Dashboard() {
  const { user, isLoadingUser } = useUser();
  const router = useRouter();
  const [isTrialEnding, setIsTrialEnding] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);

  const redirectToPortal = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const response = await fetch('/api/createPortalLink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: session?.access_token
        }
      });
      const data = await response.json();
      if (data.url) {
        router.push(data.url);
      } else {
        throw new Error('No URL returned from billing portal');
      }
    } catch (error) {
      console.error('Error redirecting to billing portal:', error);
    }
  };

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
    }
  }, [user, isLoadingUser]);

  useEffect(() => {
    // Intersection Observer for fade-up animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeUp');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const initializeAndCheckStatus = async () => {
      if (!user) return;

      try {
        // First ensure customer record exists
        await addCustomerIfMissing(user);

        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        // Show banner if no active subscription exists
        setHasNoSubscription(!subscription);

        // Check trial status if subscription exists
        if (subscription) {
          setIsTrialEnding(subscription.trial_ending);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    initializeAndCheckStatus();

    // Handle auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        initializeAndCheckStatus();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [user]);

  function renderView() {
    return (
      <section className="min-h-screen bg-[#0C0C0C] relative overflow-hidden">
        {hasNoSubscription && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <p className="text-sm font-medium">
                {/*Built for merchants. Upgrade to start generating product ads and
                captions for your brand*/}
                Unlock more with renewable credits. Upgrade to start generating
                product ads and captions for your brand every month or year
                {/*Unlock More with a Free Trial! You still have access to free
                credits. Start your 15-day free trial to generate more images —
                no card required.*/}
              </p>
              <Link href="/pricing">
                <button className="ml-4 px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                  Choose a Plan
                </button>
              </Link>
            </div>
          </div>
        )}
        {isTrialEnding && !hasNoSubscription && (
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <p className="text-sm font-medium">
                Your free trial is ending soon! Add your payment method to
                continue using our services.
              </p>
              <button
                onClick={redirectToPortal}
                className="ml-4 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                Update Billing
              </button>
            </div>
          </div>
        )}
        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent)] pointer-events-none" />

        <div className="max-w-7xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8 relative">
          <div className="sm:flex sm:flex-col sm:align-center mb-16">
            <h1 className="text-4xl font-extrabold text-[#FAFAFA] sm:text-center sm:text-6xl animate-on-scroll">
              Your Social Media Suite for eCommerce
            </h1>
            <p className="mt-4 text-[#B0B0B0] sm:text-center text-xl animate-on-scroll">
              Tools to create photos, videos, and captions of your product for
              TikTok and Instagram
            </p>
            {/* A/B test:
            1. Headline: From Idea to Reel in Seconds
            Subheader: AI-powered videos, carousels, and captions that stop the scroll.
            2. Headline: Built for the Algorithm
            Subheader: Get feed-ready content—fast, fresh, and ready to trend.
            3. Headline: Create. Post. Blow Up.
            Subheader: Your personal AI studio for TikTok & Instagram success.
             */}
          </div>

          {/* Microcopy for sellers */}
          <p className="text-[#B0B0B0] text-center text-sm mb-8">
            For Shopify/Etsy/Amazon sellers — pick a template to create ad-ready
            product visuals.
          </p>

          {/* Two-column grid for feature cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-10"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
            }}
          >
            {/* Visual Creation Tools */}
            <div className="space-y-8">
              <h2 className="text-[28px] font-semibold text-[#F9FAFB] pb-4 mt-16 font-inter animate-on-scroll">
                Create Product Photos
              </h2>
              <Link
                href="/pix-blender"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/pix-blender.png"
                    alt="Pix Blender"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Pix Blender
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    General Purpose Image Editor for eCommerce
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Start Editing
                  </button>
                </div>
              </Link>
              <Link
                href="/replace-bg"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)] 
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/replace-bg.png"
                    alt="Replace backgrounds"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Change Scenery for Your Product
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Use one product image to create lifestyle shots.
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Change backgrounds
                  </button>
                </div>
              </Link>
            </div>

            {/* Content Generation Tools */}
            <div className="space-y-8">
              <h2 className="text-[28px] font-semibold text-[#F9FAFB] pb-4 mt-16 font-inter animate-on-scroll">
                Create Videos and Captions
              </h2>

              <Link
                href="/image-to-video"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/image-to-video.png"
                    alt="Image to Video"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Image to Video{' '}
                    <span className="text-indigo-400 text-sm">NEW</span>
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Animate your AI product photos into TikToks and Reels
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Create Video
                  </button>
                </div>
              </Link>

              <Link
                href="/view-image"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/caption-generator.png"
                    alt="Caption Generator"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Write Product Caption
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Generate engaging captions for your product images and
                    videos.
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Generate Captions
                  </button>
                </div>
              </Link>
            </div>
          </div>

          {/* Gallery Section */}
          <div className="mt-16">
            <h2 className="text-[28px] font-semibold text-[#F9FAFB] pb-4 mt-16 font-inter text-center animate-on-scroll">
              Your Content Gallery
            </h2>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-10"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
              }}
            >
              <Link
                href="/image-gallery"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll"
              >
                <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                  Image Gallery
                </h3>
                <p className="text-[16px] text-[#B0B0B0]">
                  View all your generated images in one place.
                </p>
              </Link>

              <Link
                href="/video-gallery"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll"
              >
                <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                  Video Gallery{' '}
                  <span className="text-indigo-400 text-sm">NEW</span>
                </h3>
                <p className="text-[16px] text-[#B0B0B0]">
                  Access all your generated videos easily.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeUp {
          animation: fadeUp 300ms ease forwards;
        }

        .animate-on-scroll {
          opacity: 0;
        }

        .animate-on-scroll:nth-child(2) {
          animation-delay: 100ms;
        }

        .animate-on-scroll:nth-child(3) {
          animation-delay: 200ms;
        }

        .animate-on-scroll:nth-child(4) {
          animation-delay: 300ms;
        }
      `}</style>
      <div className="App">{renderView()}</div>
    </>
  );
}
