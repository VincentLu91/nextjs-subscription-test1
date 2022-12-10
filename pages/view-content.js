import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useContext } from 'react';
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
import { saveAs } from 'file-saver';
import { Configuration, OpenAIApi } from 'openai';

export default function ViewContent() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const {
    userLoaded,
    user,
    session,
    userDetails,
    subscription,
    imageLink
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [caption, setCaption] = useState(null);

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

  const handleChangeCaption = (e) => {
    setCaption(e.target.value);
    console.log('Caption: ', e.target.value);
  };

  const displayContent = imageLink && (
    //<img alt="uploaded" src={`data:image/png;base64,${ganBase64}`} />
    <div className={styles['display-image']}>
      <img alt="uploaded" src={imageLink} />
      <Button variant="primary" onClick={() => download(imageLink)}>
        Download
      </Button>
    </div>
  );

  const download = (url) => {
    saveAs(url, 'image');
  };

  const generateCaptions = async (prompt) => {
    if (prompt == null || prompt.trim() == '') {
      setCaption("You haven't entered anything!");
    } else {
      const configuration = new Configuration({
        //apiKey: process.env.OPENAI_API_KEY
        apiKey: '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'
      });
      const openai = new OpenAIApi(configuration);
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: prompt,
        temperature: 0,
        max_tokens: 200
      });
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const rawCaption = JSON.stringify(response.data['choices'][0]['text']);
      console.log(rawCaption);
      setCaption(JSON.parse(rawCaption).trim());
    }
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
      {subscription ? ( // goal of this is to restrict content to subscribers.
        <div className={styles['display-image']}>
          {isLoading && <LoadingDots />}
          {displayContent}
          <input
            type="text"
            id="prompt"
            name="prompt"
            onChange={handleChange}
            value={prompt}
            placeholder="Describe caption you want generated"
            style={{ width: '370px' }}
          />
          <Button variant="primary" onClick={() => generateCaptions(prompt)}>
            Generate Caption
          </Button>
          <textarea
            type="text"
            id="caption"
            name="caption"
            onChange={handleChangeCaption}
            value={caption}
            cols="80"
            rows="15"
            placeholder="Caption generating or you could type it yourself..."
          />
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
