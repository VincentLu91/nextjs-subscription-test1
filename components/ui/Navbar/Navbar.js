import Link from 'next/link';
import s from './Navbar.module.css';
import Logo from '../../icons/Logo';
import { useUser } from '../../UserContext';
import { useRouter } from 'next/router';

const Navbar = () => {
  const router = useRouter();
  const { user, signOut } = useUser();

  return (
    <nav className={s.root}>
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
                <Link
                  href="/generate-bg"
                  //onClick={() => router.push('/dashboard2')}
                  className={s.link}
                >
                  Generate Background
                </Link>
                <Link
                  href="/view-content"
                  //onClick={() => router.push('/view-content')}
                  className={s.link}
                >
                  View Content
                </Link>
                {/*<Link
                  href="/create-models"
                  //onClick={() => router.push('/dashboard')}
                  className={s.link}
                >
                  Create Models
                </Link>*/}
                {/*<Link
                  href="/generate-images"
                  //onClick={() => router.push('/train')}
                  className={s.link}
                >
                  Generate Images
                </Link>*/}
                {/*<Link
                  href="/aimodels"
                  //onClick={() => router.push('/dashboard')}
                  className={s.link}
                >
                  AI Models
                </Link>*/}
                <Link
                  href="/advanced"
                  //onClick={() => router.push('/view-content')}
                  className={s.link}
                >
                  Advanced Users
                </Link>
                <Link
                  href="/gallery"
                  //onClick={() => router.push('/view-content')}
                  className={s.link}
                >
                  Gallery
                </Link>
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
