import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';

function ImageCard({ category, description, footer, children }) {
  return (
    <div className="border border-accents-1	max-w-3xl w-full p rounded-md m-auto my-8">
      <div className="px-5 py-4">
        <h3 className="text-2xl mb-1 font-medium">{category}</h3>
        <p className="text-accents-5">{description}</p>
        {children}
      </div>
      <div className="border-t border-accents-1 bg-primary-2 p-4 text-accents-3 rounded-b-md">
        {footer}
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState()
  const router = useRouter();
  const { userLoaded, user, session, userDetails, subscription } = useUser();

  useEffect(() => {
    if (!user) router.replace('/signin');
  }, [user]);

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
  
  const generateImage = async () => {
    //setLoading(true);
    //const { url, error } = await postData({
    //  url: 'https://services.demo.akoios.com/helloworld/hello',
    //  token: session.access_token
    //});
    //if (error) return alert(error.message);
    //window.location.assign(url);
    //setLoading(false);
	const res = await fetch('https://services.demo.akoios.com/helloworld/hello')
	setImage(res.data)
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
    <section className="bg-black mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Welcome
          </h1>
          <p className="mt-5 text-xl text-accents-6 sm:text-center sm:text-2xl max-w-2xl m-auto">
            Use the image generator below on any available category to create a unique image for your use.
          </p>
        </div>
      </div>
      <div className="p-4">
        <ImageCard
          category="Nature and Landscapes"
          
          footer={
            <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">
                Manage your subscription on Stripe.
              </p>
              <Button
                variant="slim"
                loading={loading}
                disabled={loading || !subscription}
                onClick={redirectToCustomerPortal}
              >
                Open customer portal
              </Button>
            </div>
          }
        >
          <div className="text-xl mt-8 mb-4 font-semibold">
            {!userLoaded ? (
              <div className="h-12 mb-6">
                <LoadingDots />
              </div>
            ) : subscriptionPrice ? (
              <Button
				onClick={generateImage}
			  >
				Generate
			  </Button>
            ) : (
              <Link href="/">
                <a>Choose your plan</a>
              </Link>
				
			// try to Display data from API	
            )}
          </div>
        </ImageCard>
        
        
      </div>
    </section>
  );
}
