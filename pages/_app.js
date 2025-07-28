import '../styles/globals.css';
import '../assets/chrome-bug.css';
import '../assets/base.css';

import { useEffect } from 'react';
import Layout from '../components/Layout';
import { UserContextProvider } from '../components/UserContext';
import { Router } from 'next/router';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps }
}) {
  useEffect(() => {
    document.body.classList?.remove('loading');
  }, []);

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Enable debug mode in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      }
    });

    const handleRouteChange = () => posthog?.capture('$pageview');

    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, []);

  return (
    <>
      <PostHogProvider client={posthog}>
        <div className="bg-[#0C0C0C]">
          <UserContextProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </UserContextProvider>
        </div>
      </PostHogProvider>
    </>
  );
}
