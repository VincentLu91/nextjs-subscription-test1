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
              <h3 className="text-xl font-semibold text-white">Welcome</h3>
            </div>
            <p className="text-[rgba(255,255,255,0.7)] max-w-[220px]">
              Create content faster with AI visuals & captions.
            </p>
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
      </div>
    </footer>
  );
}
