import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { Toolbar } from '../components/toolbar';
import imageUrlBuilder from '@sanity/image-url';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Home({ posts }) {
  const router = useRouter();
  const [mappedPosts, setMappedPosts] = useState([]);

  useEffect(() => {
    if (posts.length) {
      const imgBuilder = imageUrlBuilder({
        projectId: 'ano453va',
        dataset: 'production'
      });

      setMappedPosts(
        posts.map((p) => {
          return {
            ...p,
            mainImage: imgBuilder.image(p.mainImage).url()
          };
        })
      );
    } else {
      setMappedPosts([]);
    }
  }, [posts]);

  return (
    <div>
      <Toolbar />
      <div className={`${styles.main} ${styles.secondaryTextColor}`}>
        <h1>Welcome To My Blog</h1>

        <h3>Recent Posts:</h3>

        <div className={styles.feed}>
          {mappedPosts.length ? (
            mappedPosts
              .map((p, index) => (
                <div
                  onClick={() => router.push(`/post/${p.slug.current}`)}
                  key={index}
                  className={styles.post}
                >
                  {console.log('test', p)}
                  <h3>{p.title}</h3>
                  <Image
                    //loader={myLoader}
                    src={p.mainImage}
                    alt="main image"
                    width={500}
                    height={300}
                    //layout="fill"
                  />
                </div>
              ))
              .reverse() // this is to display the most recent post at the top. This fnc wasn't needed in the tutorial.
          ) : (
            <>No Posts Yet</>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (pageContext) => {
  const query = encodeURIComponent(`*[ _type == "post" ]{
  ...,
  mainImage->
}`);
  const url = `https://ano453va.api.sanity.io/v1/data/query/production?query=${query}`;
  const result = await fetch(url).then((res) => res.json());

  if (!result.result || !result.result.length) {
    return {
      props: {
        posts: []
      }
    };
  } else {
    return {
      props: {
        posts: result.result
      }
    };
  }
};
