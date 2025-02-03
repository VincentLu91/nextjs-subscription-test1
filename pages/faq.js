import styles from '../styles/Home.module.css';
import Image from 'next/image';

export default function FAQ() {
  return (
    <div className="App">
      <section className="bg-white mb-32">
        <div
          className={`max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8 flex justify-center items-center`}
        >
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-6xl">
              FAQ
            </h1>
            <br />
            <div className="text-2xl text-black sm:text-center sm:text-2xl">
              <br />
              <p>1. What are the current ways to generate images?</p>
              <p>
                One way is to train an AI model to recognize your products. The
                other is to generate backgrounds while keeping your product in
                the source image.
              </p>
              <br />
              <p>2. What are the requirements to generate backgrounds?</p>
              <p>
                Use square images with one product, ideally with labels and no
                nearby objects.
              </p>
              <br />
              <p>3. What are the requirements to train an AI model?</p>
              <p>
                3-4 images of the product taken from different angles and
                lighting, with no nearby objects.
              </p>
              <br />
              <p>4. Which method to start?</p>
              <p>
                Start with background generation if you have only one product
                image.
              </p>
              <br />
              <p>5. How many AI images could you generate each time?</p>
              <p>
                Trained models: 2 images per product. Background generator: 7
                images per product.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
