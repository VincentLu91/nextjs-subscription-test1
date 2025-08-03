import { useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle subscription logic here
    setEmail('');
  };

  return (
    <footer
      className="bg-[#0A0A0A] border-t border-neutral-800 py-12 px-6 lg:px-20"
      style={{
        opacity: 0,
        transform: 'translateY(10px)',
        animation: 'fadeInUp 400ms ease-out 150ms forwards'
      }}
    >
      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6B21A8] to-[#8B5CF6]" />
              <h3 className="text-xl font-semibold text-white">BrandPix</h3>
            </div>
            <p className="text-[rgba(255,255,255,0.7)] max-w-[220px]">
              Create content faster with AI visuals & captions.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/brandpix.ai/"
                className="opacity-60 hover:opacity-100 transition-opacity duration-150"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@brandpix.ai"
                className="opacity-60 hover:opacity-100 transition-opacity duration-150"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://www.threads.net/@brandpix.ai"
                className="opacity-60 hover:opacity-100 transition-opacity duration-150"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.013-3.771.998-6.763 2.931-8.902C6.398.917 9.237 0 12.073 0c2.813 0 5.145.842 6.932 2.503 1.672 1.554 2.605 3.712 2.778 6.42l.004.08v.797h-4.957c-.128-2.557-1.805-3.901-4.571-3.901-2.997 0-4.98 2.293-4.98 5.773 0 3.637 1.871 5.948 4.98 5.948 2.695 0 4.452-1.337 4.785-3.673h4.957c-.405 5.07-3.863 10.053-9.815 10.053z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs tracking-wide text-gray-400 uppercase mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              {['Dashboard', 'Account', 'Pricing', 'Contact'].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item.toLowerCase().replace(' ', '-')}`}
                    className="text-[rgba(255,255,255,0.7)] text-sm font-medium hover:text-purple-300 transition-colors duration-200 ease-out"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs tracking-wide text-gray-400 uppercase mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              {['Blog', 'Privacy Policy', 'FAQ'].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item.toLowerCase().replace(' ', '')}`}
                    className="text-[rgba(255,255,255,0.7)] text-sm font-medium hover:text-purple-300 transition-colors duration-200 ease-out"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs tracking-wide text-gray-400 uppercase mb-4">
              Stay in Touch
            </h4>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-neutral-900 text-white px-3 py-2 rounded w-48 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="text-purple-400 font-medium hover:scale-105 transition-transform duration-200 ease-out"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="col-span-full mt-8 pt-6 border-t border-[#1F1F1F] text-center text-xs text-gray-500">
          © 2025 BrandPix. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
