import Image from 'next/image';

const Logo = ({ className = '', ...props }) => {
  return (
    <Image
      src="/brandpix.AI-removebg-preview.png"
      width={50}
      height={50}
      alt="App"
    />
  );
};

export default Logo;
