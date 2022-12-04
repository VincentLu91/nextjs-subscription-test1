import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';

// import trainML's config code
import contentTypes from './api/contentTypes';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const { userLoaded, user, session, userDetails, subscription } = useUser();
  const [imageLink, setImageLink] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [prompt, setPrompt] = useState(null);

  const getImage = async (prompt) => {
    const resp = await axios.get('/api/imagepredictions?prompt=' + prompt);
    alert('Resp data is: ', resp.data);
    return resp.data;
  };

  useEffect(
    () => {
      if (!user) router.replace('/signin');
    },
    [user],
    []
  );

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

  // handle onChange event of the text input (no longer dropdown)
  const handleChange = (e) => {
    setPrompt(e.target.value);
    console.log('Prompt: ', e.target.value);
  };

  const displayContent = showImage && (
    //<img alt="uploaded" src={`data:image/png;base64,${ganBase64}`} />
    <img alt="uploaded" src={imageLink} />
  );

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
      {subscription ? ( // goal of this is to restrict content to subscribers.
        <div className={styles['get-image-button']}>
          <input
            type="text"
            id="prompt"
            name="prompt"
            onChange={handleChange}
            value={prompt}
          />
          <Button
            onClick={async () => {
              if (prompt.trim() == '') {
                alert('Please enter a prompt');
              } else {
                const result = await getImage(prompt);
                if (result) {
                  setImageLink(result);
                  setShowImage(true);
                } else {
                  alert('nothing generated');
                }
              }
            }}
          >
            Get Image
          </Button>
          {displayContent}
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
