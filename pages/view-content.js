import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';
import Input from '../components/ui/Input';

// import trainML's config code
import contentTypes from './api/contentTypes';
import { saveAs } from 'file-saver';

export default function ViewContent() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const {
    userLoaded,
    user,
    session,
    userDetails,
    isLoadingUser,
    subscription,
    imageLink,
    setImageLink
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionObject, setCaptionObject] = useState(null);
  const [captionStatus, setCaptionStatus] = useState(null);
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);

  const interval = useRef();

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

  useEffect(() => {
    const storedImageLink = localStorage.getItem('imageLink');
    if (storedImageLink) {
      setImageLink(storedImageLink);
    }
  }, []); // Retrieve imageLink from localStorage on component mount

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
      <br />
      <Button variant="slim" onClick={() => download(imageLink)}>
        Download Content
      </Button>
    </div>
  );

  const download = (url) => {
    saveAs(url, 'image');
  };

  /*const generateCaptionsCohere = async (prompt) => {
    if (prompt == null || prompt.trim() == '') {
      setCaption("You haven't entered anything!");
    } else {
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const rawCaption = await axios.post(
        '/api/socialCaptions?prompt=' + prompt
      );
      console.log('raw caption', rawCaption);
      //console.log(rawCaption['data'].replace(/(\r\n|\n|\r)/gm, ""));
      console.log(rawCaption.data.text);
      setCaption(rawCaption.data.text.trim());
    }
  };*/

  const generateCaptionsReplicate = async (prompt, imageLink) => {
    if (prompt == null || prompt.trim() == '' || !imageLink) {
      setCaption("You haven't entered anything!");
    } else {
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const rawCaption = await axios.post(
        '/api/imageCaption?prompt=' +
          prompt +
          'in the style of a social media caption' +
          '&imageLink=' +
          imageLink +
          `&user=${user.id}`
      );
      console.log('raw caption', rawCaption);
      setCaptionObject(rawCaption);
      setCaptionStatus(rawCaption.data.status); // should be "starting"
      //console.log(rawCaption['data'].replace(/(\r\n|\n|\r)/gm, ""));
      //console.log(rawCaption.data.text);
      //setCaption(rawCaption.data.text.trim());
    }
  };

  const getCaptionResults = async (url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'succeeded') {
      setCaptionStatus(output.data.status); // should be "succeeded"
      const result = output.data.output;
      if (result) {
        console.log('caption result: ', result); // this prints array of words
        const joinedCaption = result.join('');
        const joinedCaptionWithoutQuotes = joinedCaption.slice(1, -1);
        console.log(joinedCaptionWithoutQuotes);
        setCaption(joinedCaptionWithoutQuotes);
        setCaptionStatus(null);
      } else {
        alert('nothing generated');
      }
      /*setPredictions((state) => ({
        ...state,
        [attempt]: { ...state[attempt], status: 'succeeded' }
      }));*/
    }
    //console.log('output data is: ', output);
  };

  useEffect(() => {
    if (captionStatus) {
      interval.current = setInterval(() => {
        console.log(captionStatus);
        getCaptionResults(captionObject.data.urls.get);
      }, 3000);
    }
    // at every 2 seconds, an 'interval' is created via calling setInterval().
    // clearInterval literally 'clears' the interval at the end of every 2 seconds before a new interval is created
    // otherwise, new instances of 'interval' are created, and you end up printing past + present values of status
    return () => clearInterval(interval.current);
    // why is the useEffect running continuously, even though it's finished?
  }, [captionStatus]);

  async function getCaptionTokenData() {
    console.log('user is: ', user.id);
    const captionTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=caption_tokens`
    );
    console.log('captionTokenData: ', captionTokenData.data);
    setNumTokens(captionTokenData.data);
  }

  useEffect(() => {
    if (user) {
      getCaptionTokenData();
    }
  }, [user]);

  async function getTieredTokenData() {
    console.log('user is: ', user.id);
    const captionTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}` + `&tokenType=caption_tokens`
    );
    console.log('captionTieredData: ', captionTieredData.data);
    setNumTieredTokens(captionTieredData.data);
  }

  useEffect(() => {
    if (user && subscription) {
      getTieredTokenData();
    }
  }, [user]);

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            View Content and Generate Captions
          </h1>
          <br></br>
          <p className="sm:text-center text-black">
            Number of caption creation credits available: {numTokens} /{' '}
            {numTieredTokens}
          </p>
          <br />
          {subscription ? ( // goal of this is to restrict content to subscribers.
            <div className={styles['display-image']}>
              {isLoading && <LoadingDots />}
              <p>
                Download the image selected and generate caption for your social
                media post.
              </p>
              <br />
              {displayContent || (
                <p className="text-black">
                  You do not have image! Go back to Dashboard and select an
                  image first!
                </p>
              )}
              <br></br>
              <input
                type="text"
                id="prompt"
                name="prompt"
                onChange={handleChange}
                value={prompt}
                placeholder="Describe caption you want generated"
                style={{ width: '600px' }}
                className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
              />
              <br></br>
              <Button
                variant="slim"
                onClick={() => generateCaptionsReplicate(prompt, imageLink)}
              >
                Generate Caption
              </Button>
              <br></br>
              <textarea
                type="text"
                id="caption"
                name="caption"
                onChange={handleChangeCaption}
                value={caption}
                cols="80"
                rows="15"
                placeholder="Caption generating or you could type it yourself..."
                className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
              />
            </div>
          ) : (
            <h1 className="text-black">You are not subscribed yet!</h1>
          )}
        </div>
      </div>
    </section>
  );
}
