import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../utils/initSupabase';
import { useRouter } from 'next/router';

function PasswordReset() {
  const [password, setPassword] = useState(null);

  const [hash, setHash] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setHash(window.location.hash);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const notification = toast.loading('Changing Password');

    try {
      // if the user doesn't have accesstoken
      if (!hash) {
        return toast.error('Sorry, Invalid token', {
          id: notification
        });
      } else if (hash) {
        const hashArr = hash
          .substring(1)
          .split('&')
          .map((param) => param.split('='));

        let type;
        let accessToken;
        for (const [key, value] of hashArr) {
          if (key === 'type') {
            type = value;
          } else if (key === 'access_token') {
            accessToken = value;
          }
        }

        if (
          type !== 'recovery' ||
          !accessToken ||
          typeof accessToken === 'object'
        ) {
          toast.error('Invalid access token or type', {
            id: notification
          });
          return;
        }

        //   now we will change the password.
        const { data, error } = await supabase.auth.updateUser({
          password: password
        });

        if (error) {
          toast.error(error.message, { id: notification });
        } else {
          // Success flow
          toast.success('Password Changed', { id: notification });
          alert("You've changed your password"); // Alert the user
          router.replace('/dashboard'); // Redirect to dashboard
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Sorry Error occured', {
        id: notification
      });
    }
  };

  return (
    <div>
      <form onSubmit={(e) => handleSubmit(e)}>
        <input
          type="password"
          required
          value={password}
          placeholder="Please enter your Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default PasswordReset;
