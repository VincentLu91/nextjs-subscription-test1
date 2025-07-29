import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useUser } from '../components/UserContext';
import { addCustomerIfMissing } from '../utils/provisionCustomer';
import LoadingDots from '../components/ui/LoadingDots';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/icons/Logo';
import GitHub from '../components/icons/GitHub';
import Google from '../components/icons/Google';
import { supabase } from '../utils/initSupabase';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const router = useRouter();
  const { user, signIn } = useUser();

  const handleSignin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({});

    const { error } = await signIn({ email, password });
    if (error) {
      setMessage({ type: 'error', content: error.message });
    }
    if (!password) {
      setMessage({
        type: 'note',
        content: 'Check your email for the magic link.'
      });
    }
    setLoading(false);
  };

  const handleOAuthSignIn = async (provider) => {
    try {
      setLoading(true);
      setMessage({});

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setMessage({ type: 'error', content: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check URL for error parameters from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const error_description = params.get('error_description');

    if (error) {
      setMessage({
        type: 'error',
        content: error_description || 'An error occurred during sign in'
      });
      setLoading(false);
    }

    // Handle auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          try {
            if (session?.user) {
              await addCustomerIfMissing(session.user);
              await router.replace('/dashboard');
            }
          } catch (err) {
            console.error('Error during sign in:', err);
            setMessage({
              type: 'error',
              content: 'Failed to complete sign in. Please try again.'
            });
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          router.replace('/signin');
        }
      }
    );

    // Clear loading state after timeout
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setMessage({
          type: 'error',
          content: 'Sign in is taking longer than expected. Please try again.'
        });
      }
    }, 10000);

    return () => {
      authListener?.subscription?.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [router, loading]);

  if (!user)
    return (
      <div className="w-80 flex flex-col justify-between p-3 max-w-lg m-auto my-64">
        <div className="flex justify-center pb-12 ">
          <Logo width="64px" height="64px" />
        </div>
        <div className="flex flex-col space-y-4">
          {message.content && (
            <div
              className={`${
                message.type === 'error' ? 'text-pink' : 'text-green'
              } border ${
                message.type === 'error' ? 'border-pink' : 'border-green'
              } p-3`}
            >
              {message.content}
            </div>
          )}

          {!showPasswordInput && (
            <form onSubmit={handleSignin} className="flex flex-col space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={setEmail}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
              />
              <Button
                className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                variant="slim"
                type="submit"
                loading={loading}
              >
                Sign in
              </Button>
            </form>
          )}

          <span className="pt-1 text-center text-sm">
            <span className="text-gray-600">Don't have an account?</span>
            {` `}
            <Link
              href="/signup"
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Sign up.
            </Link>
          </span>

          <span className="pt-1 text-center text-sm">
            <span className="text-gray-600">Forgot your password?</span>
            {` `}
            <Link
              href="/reset"
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Request a reset.
            </Link>
          </span>
        </div>

        <div className="flex items-center my-6">
          <div
            className="border-t border-blue-200 flex-grow mr-3"
            aria-hidden="true"
          ></div>
          <div className="text-gray-600 italic">Or</div>
          <div
            className="border-t border-blue-200 flex-grow ml-3"
            aria-hidden="true"
          ></div>
        </div>
        <Button
          className="bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
          variant="slim"
          type="submit"
          disabled={loading}
          onClick={() => handleOAuthSignIn('google')}
        >
          <Google />
          <span className="ml-2">Continue with Google</span>
        </Button>
      </div>
    );

  return (
    <div className="m-6">
      <LoadingDots />
    </div>
  );
};

export default SignIn;
