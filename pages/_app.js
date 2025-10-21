import '../styles/globals.css';
import '../assets/chrome-bug.css';
import '../assets/base.css';

import { useEffect } from 'react';
import Layout from '../components/Layout';
import { UserContextProvider } from '../components/UserContext';

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps }
}) {
  useEffect(() => {
    document.body.classList?.remove('loading');
  }, []);

  return (
    <>
      <div className="bg-[#0C0C0C]">
        <UserContextProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </UserContextProvider>
      </div>
    </>
  );
}
