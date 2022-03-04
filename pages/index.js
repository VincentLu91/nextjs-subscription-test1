import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import Link from 'next/link';

const index = () => {
  return (
    <div className={styles.container}>
      <main>
        <div className={styles['hero-image']}>
          <h1 className={styles.title}>Let AI Generate Photos For You</h1>
          <br />
          <h1 className={styles.description}>
            So you could use unique quality images to build your business
          </h1>
        </div>
      </main>
      <br />
      <br />
      <br />
      <h2>
        Ever having trouble finding quality stock images for your website?
      </h2>
      <br />
      <h2>
        Ever had a hard time finding engaging, on-brand visual content to post
        on your social media?
      </h2>
      <br />
      <h2>
        Maybe you spent hours and hours finding half-decent images without the
        off-chance that other brands and bloggers are using the same ones?
      </h2>
      <br />
      <h2>
        Maybe you&apos;re a solopreneur or you are trying to build a personal
        brand, but you don&apos;t have the money or resources to invest in
        taking quality photos?
      </h2>
      <br />
      <h1>
        If any of the above resonates with you, you&apos;ve come to the right
        place.
      </h1>
      <br />
      <h1 className={styles.description}>
        Meet the AI that will generate quality, on-brand images, on the go.
        Without wasting hours or thousands of dollars.
      </h1>
      <br />
      <br />
      <br />

      <div className={styles['landing-page-container']}>
        <div className={styles['vertical-align-image-left']}>
          <Image src="/random.png" alt="" width={300} height={400} />
        </div>
        <div className={styles['vertical-align-text']}>
          <h1>
            Generate images whenever you want in seconds. No more searching
          </h1>
        </div>
      </div>
      <br />
      <div className={styles['landing-page-container']}>
        <div className={styles['vertical-align-image-right']}>
          <Image src="/random.png" alt="" width={300} height={400} />
        </div>
        <div className={styles['vertical-align-text']}>
          <h1>
            Access any quality images without spending thousands of dollars or
            hours.
          </h1>
        </div>
      </div>
      <br />
      <br />
      <h1 className={styles.description}>
        Start bringing eye-popping visual content to your website and social
        media, straight from your living room.
      </h1>
      <br />
      <br />
      <h2>
        Try for free{' '}
        <Link href="/signup">
          <a style={{ color: 'red' }}>Today</a>
        </Link>
      </h2>
      <br />
      <br />
    </div>
  );
};

export default index;
