import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/initSupabase';
import { useUser } from '../components/UserContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/icons/Logo';
import Google from '../components/icons/Google';

const SignUp = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const router = useRouter();
  const { signUp } = useUser();

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({});
    const { error, user } = await signUp({ email, password });
    if (error) {
      setMessage({ type: 'error', content: error.message });
    } else {
      if (user) {
        await supabase
          .from('users')
          .update({
            full_name: name
          })
          .eq('id', user.id);
        setUser(user);
      } else {
        setMessage({
          type: 'note',
          content: 'Check your email or spam folder for the confirmation link.'
        });
      }
    }
    setLoading(false);
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    //const { error } = await signIn({ provider });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    if (error) {
      setMessage({ type: 'error', content: error.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      router.replace('/pricing'); // used to be account.
    }
  }, [user]);

  return (
    <form
      onSubmit={handleSignup}
      className="w-80 flex flex-col justify-between p-3 max-w-lg m-auto my-64"
    >
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
        <Input placeholder="Name" onChange={setName} />
        <Input type="email" placeholder="Email" onChange={setEmail} required />
        <Input type="password" placeholder="Password" onChange={setPassword} />
        <div className="pt-2 w-full flex flex-col">
          <Button
            className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
            variant="slim"
            type="submit"
            loading={loading}
            disabled={loading}
          >
            Sign up
          </Button>
        </div>

        <span className="pt-1 text-center text-sm">
          <span className="text-secondary">Do you have an account?</span>
          {` `}
          <Link
            href="/signin"
            className="text-accent-9 font-bold hover:underline cursor-pointer"
          >
            Sign in.
          </Link>
        </span>
        <div className="flex items-center my-6">
          <div
            className="border-t border-blue-200 flex-grow mr-3"
            aria-hidden="true"
          ></div>
          <div className="text-red-400 italic">Or</div>
          <div
            className="border-t border-blue-200 flex-grow ml-3"
            aria-hidden="true"
          ></div>
        </div>
        <Button
          className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
          variant="slim"
          type="submit"
          disabled={loading}
          onClick={() => handleOAuthSignIn('google')}
        >
          <Google />
          <span className="ml-2">Sign up with Google</span>
        </Button>
      </div>
    </form>
  );
};

export default SignUp;
