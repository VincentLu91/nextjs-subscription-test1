/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eolmngjyubxaxlvtwbzs.supabase.co'
      },
      {
        protocol: 'https',
        hostname: 'onncpyhdgecduwjddbma.supabase.co'
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
