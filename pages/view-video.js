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
    <div className="min-h-screen bg-[#0C0C0C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {subscription ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
              <h1 className="text-4xl font-extrabold text-white">
                View Video & Generate Captions
              </h1>

              {/* Credits Badge */}
              <div
                className={`inline-flex px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                  numTokens <= 10
                    ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]'
                    : 'bg-[#8256FF] text-white ring-2 ring-[#8256FF]'
                }`}
                role="status"
                aria-label={`Credits remaining: ${numTokens} out of ${numTieredTokens}`}
              >
                Credits: {numTokens} / {numTieredTokens}
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-[72px] mt-[40px] sm:gap-[48px]">
              {/* Left Column - Video Preview */}
              <div>
                <div className="bg-[#0F0F0F] rounded-xl relative overflow-hidden">
                  {videoLink ? (
                    <>
                      <button
                        onClick={() => {
                          setVideoLink(null);
                          localStorage.removeItem('videoLink');
                        }}
                        className="absolute top-4 left-4 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center z-10 text-[#F87171] transition-transform duration-200 hover:scale-110"
                        aria-label="Close preview"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <div className="p-4">
                        <video
                          src={videoLink}
                          controls
                          className="w-full h-auto rounded animate-fade-in"
                          onMouseOver={(e) => e.target.play()}
                          onMouseOut={(e) => e.target.pause()}
                          loop
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-white mb-4">
                        No video selected. Please go back to Gallery and select
                        a video
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Action Panel */}
              <div className="sm:mt-[24px]">
                <div className="bg-[#181818] rounded-2xl p-6 sm:p-10 lg:p-12 space-y-6">
                  <button
                    onClick={() => download(videoLink)}
                    disabled={!videoLink}
                    className="w-full h-[52px] bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white text-base font-semibold rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-[#A855F7]/45 active:scale-[0.97] disabled:opacity-50"
                  >
                    Download Video
                  </button>

                  <p className="text-sm text-[#9CA3AF] max-w-[380px]">
                    Enter your instruction for the AI to generate a caption,
                    including any product details or relevant context.
                  </p>

                  <input
                    type="text"
                    value={prompt}
                    onChange={handleChange}
                    placeholder="Describe the caption you want generated"
                    className="w-full h-12 px-4 bg-[#101010] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A855F7] transition-shadow"
                  />

                  <button
                    onClick={() => generateCaption(prompt, videoLink)}
                    disabled={!prompt || !videoLink}
                    className="w-full h-[52px] bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white text-base font-semibold rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-[#A855F7]/45 active:scale-[0.97] disabled:opacity-50"
                  >
                    Generate Caption
                  </button>

                  <textarea
                    value={caption}
                    onChange={handleChangeCaption}
                    placeholder="Caption will appear here..."
                    className="w-full h-60 p-5 bg-[#0F0F0F] border border-dashed border-[#2A2A2A] rounded-xl text-[#E5E7EB] text-sm leading-relaxed placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-shadow resize-none"
                  />

                  {isLoading && <LoadingDots />}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-2xl text-white">
              You need to subscribe to access this feature!
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}
