import styles from '../styles/Home.module.css';
import Link from 'next/link';
import { useEffect } from 'react';
import { ensureCustomerRow } from '../utils/provisionCustomer'; // add new users to 'customers' table w tokens

export default function Dashboard() {
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
    // A. page refresh after OAuth completes
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => ensureCustomerRow(user));

    // B. future auth events (magic link, sign‑out, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      ensureCustomerRow(session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function renderView() {
    return (
      <section className="min-h-screen bg-[#0C0C0C] relative overflow-hidden">
        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent)] pointer-events-none" />

        <div className="max-w-7xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8 relative">
          <div className="sm:flex sm:flex-col sm:align-center mb-16">
            <h1 className="text-4xl font-extrabold text-[#FAFAFA] sm:text-center sm:text-6xl animate-on-scroll">
              Welcome to Your Dashboard
            </h1>
            <p className="mt-4 text-[#B0B0B0] sm:text-center text-xl animate-on-scroll">
              Create social media content in seconds—visuals and captions
              included.
            </p>
          </div>

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
                Visual Creation Tools
              </h2>

              <Link
                href="/replace-bg"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)] 
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/demo.png"
                    alt="Replace backgrounds"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Replace backgrounds
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Use one product image to create lifestyle shots.
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Get Started
                  </button>
                </div>
              </Link>

              <Link
                href="/pix-blender"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/random.png"
                    alt="Pix Blender"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Pix Blender
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Showcase multiple products and subjects into a single image.
                  </p>
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg 
                    transition-all duration-200 hover:bg-indigo-700 hover:shadow-[0_0_12px_#6366F1]"
                  >
                    Start Blending
                  </button>
                </div>
              </Link>
            </div>

            {/* Content Generation Tools */}
            <div className="space-y-8">
              <h2 className="text-[28px] font-semibold text-[#F9FAFB] pb-4 mt-16 font-inter animate-on-scroll">
                Content Generation Tools
              </h2>

              <Link
                href="/image-to-video"
                className="block bg-[#1A1A1A] rounded-[20px] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.4)]
                  transform transition-all duration-300 hover:scale-[1.02] animate-on-scroll flex flex-col justify-between"
              >
                <div className="aspect-[4/3] max-w-[220px] mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-indigo-600/10 rounded-[12px]" />
                  <img
                    src="/demo.png"
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
                    Turn AI images into quick videos for TikTok, Instagram, or
                    YouTube.
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
                    src="/random.png"
                    alt="Caption Generator"
                    className="w-full h-full object-cover rounded-[12px] shadow-inner"
                  />
                </div>
                <div>
                  <h3 className="text-[24px] font-semibold text-[#FAFAFA] mb-2">
                    Caption Generator
                  </h3>
                  <p className="text-[16px] text-[#B0B0B0] mb-4">
                    Generate engaging captions for your images instantly.
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
