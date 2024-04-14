import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './ui/Navbar';
import Footer from './ui/Footer';

export default function Layout({ children, meta: pageMeta }) {
  const router = useRouter();
  const meta = {
    title: 'brandpix.ai',
    description: 'Create compelling visual content at scale.',
    cardImage: '/og.png',
    ...pageMeta
  };

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta name="robots" content="follow, index" />
        <link href="/favicon.ico" rel="shortcut icon" />
        <meta content={meta.description} name="description" />
        <meta
          property="og:url"
          content={`https://nextjs-subscription-test1-vincentlu91.vercel.app${router.asPath}`} // CHANGE THIS
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:image" content={meta.cardImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@vercel" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.cardImage} />
      </Head>
      <Navbar />
      <div id="skip">{children}</div>
      <Footer />
    </>
  );
}
