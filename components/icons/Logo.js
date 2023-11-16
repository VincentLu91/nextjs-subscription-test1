import Image from 'next/image';

const Logo = ({ className = '', ...props }) => {
  return (
    <Image
      src="/brandpix.AI-removebg-preview.png"
      width={100}
      height={100}
      alt="App"
    />
  );
};

export default Logo;
