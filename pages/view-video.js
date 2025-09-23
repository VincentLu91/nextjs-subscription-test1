import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData, CreditBadge, useCreditsFetcher } from '../utils/helpers';
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
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
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
  const { numTokens, numTieredTokens, isCreditsLoading, fetchCredits } =
    useCreditsFetcher(user, 'caption_tokens');

  const interval = useRef();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
      setVideoLink(null);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && router.isReady) {
      // Check for video link in query params first
      const videoLinkFromQuery = router.query.videoLink;
      if (videoLinkFromQuery) {
        setVideoLink(videoLinkFromQuery);
        return;
      }

      // Only restore video if explicitly selected
      const storedSelectedVideo = sessionStorage.getItem(
        `selectedVideo_${user.id}`
      );
      if (storedSelectedVideo) {
        setVideoLink(storedSelectedVideo);
      }
    }

    return () => {
      setVideoLink(null);
    };
  }, [user, router.isReady, router.query]);

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

  const generateCaption = async (prompt, videoLink) => {
    if (prompt == null || prompt.trim() == '' || !videoLink) {
      setCaption("You haven't entered anything!");
    } else {
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

      // Poll credits while generating
      const creditsInterval = setInterval(
        () => fetchCredits('gen-poll', { silent: true }),
        3000
      );
      return () => {
        clearInterval(interval.current);
        clearInterval(creditsInterval);
      };
    }
    return () => clearInterval(interval.current);
  }, [captionStatus]);

  // Initial load and whenever subscription presence changes
  useEffect(() => {
    if (user) fetchCredits('mount/user', { silent: true });
  }, [user, subscription]);

  useEffect(() => {
    const onFocus = () => fetchCredits('focus', { silent: true });
    const onVisible = () =>
      document.visibilityState === 'visible' &&
      fetchCredits('visible', { silent: true });
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  useEffect(() => {
    const initializeAndCheckStatus = async () => {
      if (!user) return;

      try {
        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Show banner if no subscription exists
        setHasNoSubscription(!subscription);
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    initializeAndCheckStatus();

    // Handle auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        initializeAndCheckStatus();
      }
    });

    return () => sub.subscription.unsubscribe();
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
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">View Video & Generate Captions</h1>

          {/* Credits Badge */}
          <CreditBadge
            user={user}
            numTokens={numTokens}
            numTieredTokens={numTieredTokens}
            isCreditsLoading={isCreditsLoading}
            hasNoSubscription={hasNoSubscription}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Left Column - Video Preview */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Video Preview
            </label>
            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {videoLink ? (
                <>
                  <button
                    onClick={() => {
                      setVideoLink(null);
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
                    No video selected. Please go back to Gallery and select a
                    video
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column - Action Panel */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Generate Caption
            </label>
            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <p className="text-sm text-[#A1A1AA]">
                  Enter your instruction for the AI to generate a caption,
                  including any product details or relevant context.
                </p>

                <input
                  type="text"
                  value={prompt}
                  onChange={handleChange}
                  placeholder="Describe the caption you want generated"
                  className="w-full h-12 p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <button
                  onClick={() => generateCaption(prompt, videoLink)}
                  disabled={!prompt || !videoLink}
                  className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Caption
                </button>

                <textarea
                  value={caption}
                  onChange={handleChangeCaption}
                  placeholder="Caption will appear here..."
                  className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <button
                  onClick={() => download(videoLink)}
                  disabled={!videoLink}
                  className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download Video
                </button>
              </div>

              {isLoading && <LoadingDots />}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
