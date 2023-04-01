import { useRouter } from 'next/router';
import { useState, useEffect, useContext } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import { supabase } from '../utils/initSupabase';

export default function ProductNameList() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const { userLoaded, user, session, userDetails, subscription } = useUser();
  const [instanceList, setInstanceList] = useState([]);

  const getInstancePrompts = async () => {
    if (!user?.identities[0]?.id) {
      return; // i.e., if user hasn't trained anything yet.
    }
    let instanceArr = [];
    const instancePromptsInfo = await supabase
      .from('ai-models')
      .select('*')
      .eq('user_auth_id', user.identities[0].id);
    instancePromptsInfo.data.map((i) => {
      console.log(i.instance_prompt);
      //i.instance_prompt;
      if (i.model_version != null) {
        instanceArr.push(i.instance_prompt);
      }
    });
    console.log('instanceArr: ', instanceArr);
    setInstanceList(instanceArr);
  };

  async function deleteInstance(instance) {
    console.log('deleting instance: ', instance);
    console.log('instance delete.....');
    await supabase
      .from('ai-models')
      .delete()
      .eq('user_auth_id', user?.identities[0]?.id)
      .eq('instance_prompt', instance);
    window.location.reload(true);
  }

  useEffect(
    () => {
      if (!user) router.replace('/signin');
    },
    [user],
    []
  );

  useEffect(() => {
    getInstancePrompts();
  }, []);

  const redirectToCustomerPortal = async () => {
    setLoading(true);
    const { url, error } = await postData({
      url: '/api/createPortalLink',
      token: session.access_token
    });
    if (error) return alert(error.message);
    window.location.assign(url);
    setLoading(false);
  };

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  return (
    <div className="App">
      {subscription ? (
        <div>
          <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
            List of Product Names
          </h1>
          <br></br>
          {instanceList.map((instance) => (
            <ul className="text-4xl text-white sm:text-center sm:text-2xl">
              {instance} -
              <button onClick={() => deleteInstance(instance)}>Delete</button>
            </ul>
          ))}
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
