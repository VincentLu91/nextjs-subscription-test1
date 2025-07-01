import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Form } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';
import Input from '../components/ui/Input';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';

// import trainML's config code
import contentTypes from './api/contentTypes';
import { saveAs } from 'file-saver';

export default function ViewVideo() {
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
    setImageLink,
    videoLink,
    setVideoLink
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
    const storedVideoLink = localStorage.getItem('videoLink');
    if (storedVideoLink) {
      setVideoLink(storedVideoLink);
    }
  }, []); // Retrieve videoLink from localStorage on component mount

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

  const displayContent = videoLink && (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      <video
        width="100%"
        src={videoLink}
        controls={true}
        onMouseOver={(e) => e.target.play()}
        onMouseOut={(e) => e.target.pause()}
        loop
      />
      <br />
      <Button
        variant="slim"
        onClick={() => download(videoLink)}
        className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
      >
        Download Video
      </Button>
    </div>
  );

  const download = (url) => {
    saveAs(url, 'video');
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

  const generateCaption = async (prompt, videoLink) => {
    if (prompt == null || prompt.trim() == '' || !videoLink) {
      setCaption("You haven't entered anything!");
    } else {
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const rawCaption = await axios.post(
        '/api/videoCaption?prompt=' +
          prompt +
          'in the style of a social media caption' +
          '&videoLink=' +
          videoLink +
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
    if (output.data.status === 'COMPLETED') {
      setCaptionStatus(output.data.status); // should be "succeeded"
      const result = await axios.get(
        '/api/imageresults?url=' + output.data.response_url
      );
      if (result) {
        console.log('caption result: ', result.data.output); // this prints array of words
        setCaption(result.data.output);
        setCaptionStatus(null);
      } else {
        alert('nothing generated');
      }
    }
  };

  useEffect(() => {
    if (captionStatus) {
      interval.current = setInterval(() => {
        console.log(captionStatus);
        getCaptionResults(captionObject.data.status_url);
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
      <p className="text-black sm:text-center">
        Heads up! brandpix.ai is moving out of beta and will soon become a paid
        service.
      </p>
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            View Video and Generate Captions
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
                <div>
                  <p className="text-black">You do not have video selected!</p>
                </div>
              )}
              <br></br>
              <p>
                Enter your instruction for the AI to generate a caption,
                including any product details or relevant context.
              </p>
              <br></br>
              <p>
                e.g., Write a 300-word caption for our honey brand above. Try to
                encourage followers to check out our store storename.com. Also
                our IG handle is @store_name
              </p>
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
                className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                onClick={() => generateCaption(prompt, videoLink)}
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
