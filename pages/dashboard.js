import styles from '../styles/Home.module.css';
import Link from 'next/link';

export default function Dashboard() {
  function renderView() {
    return (
      <section className="bg-white mb-32">
        <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
              Welcome
            </h1>
            <br></br>
            <p className="text-black sm:text-center">
              Create social media content in seconds—visuals and captions
              included.
            </p>
            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <div className="w-full">
                <h1 className="text-2xl text-black mb-4">
                  New here? Start creating AI-generated visuals today.
                </h1>
              </div>
              <Link href="/replace-bg" className={styles.card}>
                <h2>Replace backgrounds &rarr;</h2>
                <p>Use one product image to create lifestyle shots.</p>
              </Link>
              <Link href="/pix-blender" className={styles.card}>
                <h2>Pix Blender &rarr;</h2>
                <p>
                  Showcase multiple products and subjects into a single image
                </p>
              </Link>
              <Link href="/generate-apparel" className={styles.card}>
                <h2>Clothes swapping &rarr;</h2>
                <p>Create new shots of models wearing your clothes</p>
              </Link>
              <Link href="/image-to-video" className={styles.card}>
                <h2>Image to Video (NEW) &rarr;</h2>
                <p>
                  Turn AI images into quick videos for TikTok, Instagram, or
                  YouTube.
                </p>
              </Link>
            </div>

            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <h1 className="text-2xl text-black mb-4">
                Happy with your AI generated visuals? Create accompanying text
                in seconds to reduce writers' block.
              </h1>
              <Link href="/view-image" className={styles.card}>
                <h2>Generate Captions for your images &rarr;</h2>
                <p>Make text for your static images.</p>
              </Link>
              <Link href="/view-video" className={styles.card}>
                <h2>Generate Captions for your video content (NEW) &rarr;</h2>
                <p>Make text for your Shorts, Reels, or TikToks.</p>
              </Link>
            </div>

            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center flex flex-col`}
            >
              <h1 className="text-2xl text-black mb-4">
                View all your AI content in one place.
              </h1>
              <Link href="/image-gallery" className={`${styles.card} mt-4`}>
                <h2>Image Gallery &rarr;</h2>
                <p>Check the Gallery for all your generated images.</p>
              </Link>
              <Link href="/video-gallery" className={`${styles.card} mt-4`}>
                <h2>Video Gallery (NEW) &rarr;</h2>
                <p>Check the Gallery for all your generated videos.</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <div className="App">{renderView()}</div>;
}
