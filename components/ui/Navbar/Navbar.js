import Link from 'next/link';
import s from './Navbar.module.css';
import Logo from '../../icons/Logo';
import { useUser } from '../../UserContext';
import { useRouter } from 'next/router';
import { useState } from 'react';

const Navbar = () => {
  const router = useRouter();
  const { user, signOut } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isViewContentOpen, setIsViewContentOpen] = useState(false);

  return (
    <nav className="sticky top-0 bg-[#fff] z-40 transition-all duration-150">
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex justify-between align-center flex-row py-4 md:py-6 relative">
          <div className="flex flex-1 items-center">
            <Link href="/" /*className={s.logo}*/ aria-label="Logo">
              <Logo />
            </Link>
            <nav className="space-x-2 ml-6 hidden lg:block">
              <Link href="/pricing" className={s.link}>
                Pricing
              </Link>
              <Link href="/account" className={s.link}>
                Account
              </Link>
            </nav>
          </div>

          <div className="flex flex-1 justify-end space-x-8">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  //onClick={() => router.push('/dashboard')}
                  className={s.link}
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={s.link}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                  >
                    Generate Visuals
                  </button>
                  {isOpen && (
                    <div className="absolute top-full left-0 bg-white shadow-lg rounded-md py-2 mt-1">
                      <Link
                        href="/replace-bg"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Replace Backgrounds
                      </Link>
                      <Link
                        href="/pix-blender"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Pix Blender
                      </Link>
                      <Link
                        href="/generate-apparel"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Clothes Swapping
                      </Link>
                      <Link
                        href="/image-to-video"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Image to Video (NEW)
                      </Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsViewContentOpen(!isViewContentOpen)}
                    className={s.link}
                    onBlur={() =>
                      setTimeout(() => setIsViewContentOpen(false), 200)
                    }
                  >
                    View Content
                  </button>
                  {isViewContentOpen && (
                    <div className="absolute top-full left-0 bg-white shadow-lg rounded-md py-2 mt-1">
                      <Link
                        href="/view-image"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        View Image
                      </Link>
                      <Link
                        href="/view-video"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
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
                <div className="relative">
                  <button
                    onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                    className={s.link}
                    onBlur={() =>
                      setTimeout(() => setIsGalleryOpen(false), 200)
                    }
                  >
                    Gallery
                  </button>
                  {isGalleryOpen && (
                    <div className="absolute top-full left-0 bg-white shadow-lg rounded-md py-2 mt-1">
                      <Link
                        href="/image-gallery"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Images
                      </Link>
                      <Link
                        href="/video-gallery"
                        className={`${s.link} block px-4 py-2 hover:bg-gray-100`}
                      >
                        Videos (NEW)
                      </Link>
                    </div>
                  )}
                </div>
                <Link href="#" className={s.link} onClick={() => signOut()}>
                  Sign out
                </Link>
              </>
            ) : (
              <Link href="/signin" className={s.link}>
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
