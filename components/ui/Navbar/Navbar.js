import Link from 'next/link';
import Logo from '../../icons/Logo';
import { useUser } from '../../UserContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const router = useRouter();
  const { user, signOut } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isViewContentOpen, setIsViewContentOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  return (
    <nav
      className={`sticky top-0 z-50 bg-black/60 backdrop-blur-md shadow-inner shadow-white/5 border-b border-white/5 transition-all duration-300 ${
        scrolled ? 'h-14' : 'h-16'
      }`}
    >
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-7xl px-6">
        <div className="h-full flex items-center justify-between">
          <div className="flex flex-1 items-center">
            <Link href="/" /*className={s.logo}*/ aria-label="Logo">
              <div className="w-10 h-10 rounded-full hover:ring-2 ring-purple-400/40 transition duration-300">
                <Logo />
              </div>
            </Link>
            <nav className="space-x-2 ml-6 hidden lg:block">
              <Link
                href="/pricing"
                className={`text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 ${
                  router.pathname === '/pricing'
                    ? 'border-b-2 border-purple-500 text-purple-300'
                    : ''
                }`}
                aria-current={
                  router.pathname === '/pricing' ? 'page' : undefined
                }
              >
                Pricing
              </Link>
              <Link
                href="/account"
                className={`text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 ${
                  router.pathname === '/account'
                    ? 'border-b-2 border-purple-500 text-purple-300'
                    : ''
                }`}
                aria-current={
                  router.pathname === '/account' ? 'page' : undefined
                }
              >
                Account
              </Link>
            </nav>
          </div>

          <div className="flex flex-1 justify-end space-x-8">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 flex items-center ${
                    router.pathname === '/dashboard'
                      ? 'border-b-2 border-purple-500 text-purple-300'
                      : ''
                  }`}
                  aria-current={
                    router.pathname === '/dashboard' ? 'page' : undefined
                  }
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 flex items-center"
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                  >
                    Product Visuals
                  </button>
                  {isOpen && (
                    <div className="absolute top-full left-0 bg-zinc-900/90 backdrop-blur-md shadow-lg rounded-xl py-2 mt-1 border border-white/5">
                      {/*<Link
                        href="/replace-bg"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Replace Backgrounds
                      </Link>*/}
                      <Link
                        href="/pix-blender"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Pix Blender
                      </Link>
                      {/*<Link
                        href="/generate-apparel"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Clothes Swapping
                      </Link>*/}
                      <Link
                        href="/image-to-video"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Image to Video
                      </Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsViewContentOpen(!isViewContentOpen)}
                    className="text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 flex items-center"
                    onBlur={() =>
                      setTimeout(() => setIsViewContentOpen(false), 200)
                    }
                  >
                    View Content
                  </button>
                  {isViewContentOpen && (
                    <div className="absolute top-full left-0 bg-zinc-900/90 backdrop-blur-md shadow-lg rounded-xl py-2 mt-1 border border-white/5">
                      <Link
                        href="/view-image"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        View Image
                      </Link>
                      <Link
                        href="/view-video"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        View Video (NEW)
                      </Link>
                    </div>
                  )}
                </div>
                {/*<Link
                  href="/create-models"
                  //onClick={() => router.push('/dashboard')}
                  className={s.link}
                >
                  Create Models
                </Link>*/}
                {/*<Link
                  href="/ai-studio"
                  //onClick={() => router.push('/train')}
                  className={s.link}
                >
                  AI Studio
                </Link>*/}
                {/*<Link
                  href="/aimodels"
                  //onClick={() => router.push('/dashboard')}
                  className={s.link}
                >
                  AI Models
                </Link>*/}
                {/*<Link
                  href="/advanced"
                  //onClick={() => router.push('/view-content')}
                  className={s.link}
                >
                  Advanced Users
                </Link>*/}
                <div className="relative flex items-center">
                  <button
                    onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                    className="text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200"
                    onBlur={() =>
                      setTimeout(() => setIsGalleryOpen(false), 200)
                    }
                  >
                    Gallery
                  </button>
                  {isGalleryOpen && (
                    <div className="absolute top-full left-0 bg-zinc-900/90 backdrop-blur-md shadow-lg rounded-xl py-2 mt-1 border border-white/5">
                      <Link
                        href="/image-gallery"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Images
                      </Link>
                      <Link
                        href="/video-gallery"
                        className="block px-4 py-2 text-white/80 hover:bg-white/5 transition-colors duration-200"
                      >
                        Videos (NEW)
                      </Link>
                    </div>
                  )}
                </div>
                <Link
                  href="#"
                  className="text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 flex items-center"
                  onClick={() => signOut()}
                >
                  Sign out
                </Link>
              </>
            ) : (
              <Link
                href="/signin"
                className="text-white/80 tracking-wide px-4 py-2 hover:underline hover:underline-offset-4 hover:decoration-purple-400 transition-all duration-200 flex items-center"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
