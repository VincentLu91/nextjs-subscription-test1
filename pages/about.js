import styles from '../styles/Home.module.css';
import Image from 'next/image';
const about = () => {
  return (
    <div className={styles.container}>
      <Image
        src="https://replicate.delivery/pbxt/aIsoESA0Hd60I9haMNuNRfvL3vCW4nYyk2RYxCHCzexhRZIQA/out-0.png"
        alt=""
        width={600}
        height={600}
      />
      <br />
      <h2
        style={{
          fontFamily: 'Menlo',
          fontSize: 30,
          color: 'var(--text-secondary)'
        }}
      >
        Photorealistic content on demand
      </h2>
      <br />
      <br />
      <p style={{ fontFamily: 'Menlo', color: 'var(--text-secondary)' }}>
        Whether you are a solopreneur running an eCommerce store straight from
        your living room, or building a presence with a blog, or just trying to
        build an online business. We completely understand that it can be hard
        to stand out with visually aesthetic, on-brand content.
      </p>
      <br />
      <p style={{ fontFamily: 'Menlo', color: 'var(--text-secondary)' }}>
        In order to stand out from a sea of comptetitors, you will need
        compelling visual content to establish your credibility, and usually the
        images will need to be high quality to attract leads.
      </p>
      <br />
      <p style={{ fontFamily: 'Menlo', color: 'var(--text-secondary)' }}>
        An AI generated image system can help you achieve. We believe that this
        system will help you save time and money to curate high quality images
        on demand that will put you on par with established competitors so you
        could put them on your website, social media, blog, and other marketing
        materials.
      </p>
      <br />
      <p style={{ fontFamily: 'Menlo', color: 'var(--text-secondary)' }}>
        Our vision is to enable any ambitious entrepreneur to hit the ground
        running with efficient marketing processes no matter the amount of
        resources they have, so they could focus their time and energy on other
        value-producing functions, including product development and connecting
        with audiences.
      </p>
      <br />
    </div>
  );
};

export default about;
