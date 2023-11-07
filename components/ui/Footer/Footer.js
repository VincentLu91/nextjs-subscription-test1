import Link from 'next/link';
import Logo from '../../icons/Logo';
import GitHub from '../../icons/GitHub';
import s from './Footer.module.css';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-8xl px-6 bg-primary-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-accents-2 py-12 text-primary transition-colors duration-150 bg-primary-2">
        <div className="col-span-1 lg:col-span-2">
          <Link href="/" className="flex flex-initial items-center font-bold md:mr-24">

            <span className="rounded-full border border-gray-700 mr-2">
              <Logo />
            </span>
            <span>AutoStock ai</span>

          </Link>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-initial flex-col md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="text-primary hover:text-accents-6 transition ease-in-out duration-150">
                
                  Home
                
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/about"
                className="text-primary hover:text-accents-6 transition ease-in-out duration-150">
                
                  About
                
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/blog"
                className="text-primary hover:text-accents-6 transition ease-in-out duration-150">
                
                  Blog
                
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-initial flex-col md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <p className="text-primary font-bold hover:text-accents-6 transition ease-in-out duration-150">
                LEGAL
              </p>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/privacypolicy"
                className="text-primary hover:text-accents-6 transition ease-in-out duration-150">
                
                  Privacy Policy
                
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/termsofuse"
                className="text-primary hover:text-accents-6 transition ease-in-out duration-150">
                
                  Terms of Use
                
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="py-12 flex flex-col md:flex-row justify-between items-center space-y-4 bg-primary-2">
        <div>
          <span>&copy; 2021 AutoStock ai, Inc. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
