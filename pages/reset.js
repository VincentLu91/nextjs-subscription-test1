import { supabase } from '../utils/initSupabase';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

function reset() {
  const [email, setEmail] = useState(null);

  const handleSubmit = async (e) => {
    console.log('name');

    e.preventDefault();

    const notification = toast.loading('Sending Email....');

    try {
      const { data, error } = await supabase.auth.api.resetPasswordForEmail(
        email,
        {
          //redirectTo: 'http://localhost:3000/password-reset' //// this will redirect to us at password-reset page,
          //// you can also set your own page for it.
          redirectTo:
            'https://nextjs-subscription-test1.vercel.app/password-reset' /// this will redirect to us at password-reset page,
        }
      );

      if (error) {
        toast.error(error.message, {
          id: notification
        });
      } else if (data) {
        console.log(data);
        toast.success('Sent', {
          id: notification
        });
      }
    } catch (error) {
      toast.error('Sorry Error occured', {
        id: notification
      });
    }
  };

  return (
    <div>
      <form onSubmit={(e) => handleSubmit(e)}>
        <input
          type="email"
          placeholder="Please enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default reset;
