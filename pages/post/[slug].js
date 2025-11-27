import styles from '../../styles/Post.module.css';
import BlockContent from '@sanity/block-content-to-react';
import Image from 'next/image';
import Toolbar from '../../components/toolbar';
import { createImageUrlBuilder } from '@sanity/image-url';
import { useState, useEffect } from 'react';

const config = {
  projectId: 'ano453va',
  dataset: 'production'
};

export const Post = ({ title, body, image }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (image) {
      const imgBuilder = createImageUrlBuilder(config);
      setImageUrl(imgBuilder.image(image).url());
    }
  }, [image]);

  return (
    <div className="bg-[#0C0C0C]" style={{ color: 'var(--text-base)' }}>
      <Toolbar />
      <div className={styles.unset_img}>
        <h1>{title}</h1>
        {imageUrl && (
          <Image
            className={styles.mainImage}
            src={imageUrl}
            alt={title || 'Blog post image'}
            width={100}
            height={100}
            layout="responsive"
          />
        )}
        <div className={styles.body}>
          {body && (
            <BlockContent
              blocks={body}
              {...config}
              serializers={{
                types: {
                  block: (props) => {
                    const { style = 'normal' } = props.node;
                    if (style === 'normal') return <p>{props.children}</p>;
                    return BlockContent.defaultSerializers.types.block(props);
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (pageContext) => {
  const pageSlug = pageContext.query.slug;

  if (!pageSlug) {
    return {
      notFound: true
    };
  }

  const query = encodeURIComponent(
    `*[ _type == "post" && slug.current == "${pageSlug}" ][0]`
  );
  const url = `https://ano453va.api.sanity.io/v1/data/query/production?query=${query}`;

  const result = await fetch(url).then((res) => res.json());
  const post = result.result;

  if (!post) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      title: post.title || '',
      body: post.body || [],
      image: post.mainImage
    }
  };
};

export default Post;
