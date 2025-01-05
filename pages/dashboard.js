import styles from '../styles/Home.module.css';
import Link from 'next/link';

export default function Dashboard() {
  function renderView() {
    // currently working with free users
    //if (subscription) {
    return (
      <section className="bg-white mb-32">
        <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
              Welcome
            </h1>
            <br></br>
            <p className="text-black sm:text-center">
              Get started creating content for your brand!
            </p>
            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <Link href="/create-models" className={styles.card}>
                <h2>Train AI Models &rarr;</h2>
                <p>Upload product images to create AI models.</p>
              </Link>

              <Link href="/generate-images" className={styles.card}>
                <h2>Create original visuals &rarr;</h2>
                <p>Use the AI models to create original images.</p>
              </Link>
              <Link href="/generate-bg" className={styles.card}>
                <h2>Change Backgrounds &rarr;</h2>
                <p>Use one product image to place it in new settings.</p>
              </Link>
              <Link href="/view-content" className={styles.card}>
                <h2>Generate Captions &rarr;</h2>
                <p>Create text for your social media posts.</p>
              </Link>
              <Link href="/gallery" className={styles.card}>
                <h2>View Your Creations &rarr;</h2>
                <p>Check the Gallery for all your generated images.</p>
              </Link>
              <Link href="/aimodels" className={styles.card}>
                <h2>View Your AI Models &rarr;</h2>
                <p>See all the AI models you created for generating images.</p>
              </Link>
            </div>
            <br></br>
          </div>
        </div>
      </section>
    );
  }

  return <div className="App">{renderView()}</div>;
}
