import styles from '../styles/Home.module.css';
import Image from 'next/image';

export default function Contact() {
  return (
    <div className="App">
      <section className="bg-white mb-32">
        <div
          className={`max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8 flex justify-center items-center`}
        >
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-6xl">
              Contact
            </h1>
            <br />
            <div className="flex justify-center">
              <Image
                src="https://replicate.delivery/pbxt/849qZfCnYYzcMaNfxB7OxOvJhBVUcrlQFjWU9II5dTAL2EhSA/out-0.png"
                alt=""
                width={600}
                height={600}
              />
            </div>
            <div className="text-4xl text-black sm:text-center sm:text-2xl">
              <br />
              <p>To reach out for support, please email brandpixai@gmail.com</p>
              <br />
              <p>Social Media:</p>
              <p>Instagram: @brandpix.ai</p>
              <p>TikTok: @brandpix.ai</p>
              <p>X: @brandpix_ai</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
