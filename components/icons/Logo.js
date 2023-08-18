import Image from 'next/image';
const Logo = ({ className = '', ...props }) => (
  <Image
    src="/../public/brandpixailogo.png"
    alt=""
    className={className}
    {...props}
    quality={100}
    width={32}
    height={32}
    priority
  />
);

export default Logo;
