import { useRouter } from 'next/router';
import { useState, useEffect, useContext } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import { supabase } from '../utils/initSupabase';

export default function ProductNameList() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const { isLoadingUser, user, session, userDetails, subscription } = useUser();
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
    return instanceArr;
    //setInstanceList(instanceArr);
  };

  useEffect(() => {
    const fetchAndStoreInstances = async () => {
      try {
        const storedInstances = localStorage.getItem('storedInstances');
        if (storedInstances) {
          setInstanceList(JSON.parse(storedInstances));
        } else {
          const productList = await getInstancePrompts();
          console.log('productList: ', productList);
          if (productList) {
            setInstanceList(productList);
            localStorage.setItem(
              'storedInstances',
              JSON.stringify(productList)
            );
          }
        }
      } catch (error) {
        console.error('Error fetching or storing products:', error);
      }
    };

    // Fetch and store photos when the component mounts
    fetchAndStoreInstances();
  }, []);

  async function deleteInstance(instance) {
    const storedInstances = localStorage.getItem('storedInstances');
    const storedInstancesList = JSON.parse(storedInstances);
    const index = storedInstancesList.indexOf(instance);
    if (index > -1) {
      // only splice array when item is found
      storedInstancesList.splice(index, 1);
      setInstanceList(storedInstancesList);
      localStorage.setItem(
        'storedInstances',
        JSON.stringify(storedInstancesList)
      );
    }
    console.log('deleting instance: ', instance);
    console.log('instance delete.....');
    await supabase
      .from('ai-models')
      .delete()
      .eq('user_auth_id', user?.identities[0]?.id)
      .eq('instance_prompt', instance);
    await getInstancePrompts();
  }

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

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
      <section className="bg-white mb-32">
        {subscription ? (
          <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:flex-col sm:align-center">
              <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
                List of Product Names
              </h1>
              <br></br>
              {instanceList.map((instance) => (
                <ul className="text-4xl text-black sm:text-center sm:text-2xl">
                  {instance} -
                  <button onClick={() => deleteInstance(instance)}>
                    Delete
                  </button>
                </ul>
              ))}
            </div>
          </div>
        ) : (
          <h1 className="text-black">You are not subscribed yet!</h1>
        )}
      </section>
    </div>
  );
}
