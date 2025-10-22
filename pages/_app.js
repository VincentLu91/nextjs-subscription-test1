import '../styles/globals.css';
import '../assets/chrome-bug.css';
import '../assets/base.css';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { UserContextProvider } from '../components/UserContext';
import posthog from '../lib/posthog';

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps }
}) {
  const router = useRouter();

  useEffect(() => {
    document.body.classList?.remove('loading');
  }, []);

  useEffect(() => {
    const handleRouteChange = () => posthog.capture('$pageview');
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <div className="bg-[#0C0C0C]">
      <UserContextProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </UserContextProvider>
    </div>
  );
}
