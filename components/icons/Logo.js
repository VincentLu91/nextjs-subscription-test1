import Image from 'next/image';

const Logo = ({ className = '', ...props }) => {
  return (
    <span className="inline-block rounded-full border border-gray-700">
      <div className="w-8 h-8">
        <div className="rounded-full overflow-hidden">
          <Image
            src="/brandpix.AI.blue.png"
            width={32}
            height={32}
            // objectFit="cover"
            className="rounded-full"
            alt="App"
          />
        </div>
      </div>
    </span>
  );
};

export default Logo;
