import styles from '../styles/Home.module.css';
import Link from 'next/link';

export default function Advanced() {
  function renderView() {
    // currently working with free users
    //if (subscription) {
    return (
      <section className="bg-white mb-32">
        <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
              For the Advanced User
            </h1>
            <br></br>
            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <h1 className="text-2xl text-black mb-4">
                Want more than just background swaps? Train AI to learn your
                product and generate unique images with any prompt you give!
                (you could also use a 'default' model to generate )
              </h1>
              <Link href="/create-models" className={styles.card}>
                <h2>Train AI Models &rarr;</h2>
                <p>Upload product images to create AI models.</p>
              </Link>
              <Link href="/generate-images" className={styles.card}>
                <h2>Create original visuals &rarr;</h2>
                <p>Use the AI models to create original images.</p>
              </Link>
            </div>

            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <h1 className="text-2xl text-black mb-4">
                Looking for inspo? Create images of anything—scenes, mood
                boards, or landscapes—without needing to upload a product.
              </h1>
              <Link href="/generate-images" className={styles.card}>
                <h2>Create original visuals &rarr;</h2>
                <p>Same as above, but select the 'default' model.</p>
              </Link>
            </div>

            <div
              className={`${styles.grid} text-black sm:text-center mx-auto justify-center`}
            >
              <h1 className="text-2xl text-black mb-4">
                Check out all the custom AIs you created.
              </h1>
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
