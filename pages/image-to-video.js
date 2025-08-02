import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Form, Card } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';
import Input from '../components/ui/Input';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';

// import trainML's config code
import contentTypes from './api/contentTypes';
import { saveAs } from 'file-saver';

export default function ImageToVideo() {
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
    setVideoLink,
    isVideoLoading,
    setIsVideoLoading,
    img2vidPrompt,
    setImg2vidPrompt
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionObject, setCaptionObject] = useState(null);
  const [captionStatus, setCaptionStatus] = useState(null);
  const [numTokens, setNumTokens] = useState(null);
  const [videoRespObj, setVideoRespObj] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(18);
  const [finishMessage, setFinishMessage] = useState(null);

  const interval = useRef();

  const clearUserData = () => {
    // Clear state
    setImageLink(null);
    setVideoLink(null);
    setIsVideoLoading(false);
    setImg2vidPrompt('');
    setFinishMessage('');
    setResultVideo(null); // Clear resultVideo state

    // Clear localStorage for current user if exists
    if (user?.id) {
      localStorage.removeItem(`generatedVideos_${user.id}`);
      localStorage.removeItem(`resultVideo_${user.id}`);
      localStorage.removeItem(`imageLink_${user.id}`);
      localStorage.removeItem(`videoLink_${user.id}`);
    }
  };

  // Clear other user data from localStorage
  const clearOtherUserData = () => {
    Object.keys(localStorage).forEach((key) => {
      if (
        (key.startsWith('generatedVideos_') ||
          key.startsWith('imageLink_') ||
          key.startsWith('videoLink_') ||
          key.startsWith('resultVideo_')) &&
        !key.endsWith(user?.id || '')
      ) {
        localStorage.removeItem(key);
      }
    });
  };

  const wasLoggedOut = useRef(false);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      // Set flag to prevent restoration after logout
      wasLoggedOut.current = true;
      // Clear all video state and storage before redirecting to signin
      setResultVideo(null);
      setVideoLink(null);
      // Clear all video-related data from localStorage on logout
      Object.keys(localStorage).forEach((key) => {
        if (
          key.includes('resultVideo_') ||
          key.includes('videoLink_') ||
          key.includes('generatedVideos_')
        ) {
          localStorage.removeItem(key);
        }
      });
      router.replace('/signin');
      clearUserData(); // Clear all state when no user
    } else if (user) {
      if (!wasLoggedOut.current) {
        // Only restore from localStorage if we're not coming from a logout
        const storedVideoLink = localStorage.getItem(`videoLink_${user.id}`);
        const storedResultVideo = localStorage.getItem(
          `resultVideo_${user.id}`
        );
        if (storedVideoLink) {
          setVideoLink(storedVideoLink);
        }
        if (storedResultVideo) {
          setResultVideo(storedResultVideo);
        }
      }
      wasLoggedOut.current = false; // Reset flag
      clearOtherUserData(); // Clear other user data when component mounts with a user
    }
  }, [user, isLoadingUser]);

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
    setImg2vidPrompt(e.target.value);
    console.log('Prompt: ', e.target.value);
  };

  const handleChangeCaption = (e) => {
    setCaption(e.target.value);
    console.log('Caption: ', e.target.value);
  };

  const displayContent = imageLink && (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      {/* Close button */}
      <button
        onClick={() => {
          setImageLink(null); // Clear the state
          localStorage.removeItem(`imageLink_${user.id}`); // Remove the key from localStorage
        }}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: '30px',
          textAlign: 'center'
        }}
      >
        X
      </button>

      <img alt="uploaded" src={imageLink} />
      <br />
    </div>
  );

  const generateVideo = async (prompt, image) => {
    if (prompt == null || prompt.trim() == '' || !image) {
      setCaption("You haven't entered anything!");
    } else {
      setFinishMessage(null); // Clear any existing finish message
      //alert(typeof JSON.stringify(response.data['choices'][0]['text'].trim));
      const videoResp = await axios.post(
        '/api/img2vid?prompt=' +
          prompt +
          'in the style of a social media caption' +
          '&image=' +
          image +
          `&user=${user.id}`
      );
      console.log('videoResp: ', videoResp);
      if (videoResp) {
        setVideoRespObj(videoResp);
        console.log('videoResp status: ', videoResp.data.status);
        console.log('videoResp request_id: ', videoResp.data.request_id);
      } else {
        alert(
          'There is an error generating your video. Please try using proper image and prompt'
        );
      }
    }
  };

  const getVideoResults = async (url) => {
    console.log('video response url response: ', url);
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'COMPLETED') {
      const result = await axios.get(
        '/api/imageresults?url=' + output.data.response_url
      );
      console.log('Result video url:', result.data.video.url);
      const videoUrl = result.data.video.url;
      setResultVideo(videoUrl);
      setVideoLink(videoUrl);
      localStorage.setItem(`resultVideo_${user.id}`, videoUrl);
      localStorage.setItem(`videoLink_${user.id}`, videoUrl);
      //setResultVideo(result.data.video);
      // Clear interval when video is completed
      if (interval.current) {
        clearInterval(interval.current);
        interval.current = null;
      }
      setIsVideoLoading(false);
      setFinishMessage(
        <div>
          Video has been generated and saved to gallery. You can view it below
          or in the Video Gallery. To view content or generate captions,{' '}
          <Link href={`/view-video?videoLink=${videoUrl}`}>
            <span className="text-[#8256FF] hover:underline cursor-pointer">
              click here
            </span>
          </Link>
          .
        </div>
      );
    }
    return output.data.status;
  };

  useEffect(() => {
    // Only start polling when we have a response URL
    if (videoRespObj?.data?.response_url && !interval.current) {
      interval.current = setInterval(async () => {
        const status = await getVideoResults(videoRespObj.data.status_url);
        // Also stop polling if we get a failed status
        if (status === 'FAILED') {
          clearInterval(interval.current);
          interval.current = null;
          setIsVideoLoading(false);
        }
      }, 3000);
    }

    // Cleanup function to clear interval when component unmounts or URL changes
    return () => {
      if (interval.current) {
        clearInterval(interval.current);
        interval.current = null;
      }
    };
  }, [videoRespObj?.data?.response_url]); // Only re-run when response_url changes

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

  const loadingWithVideoPrompt = isVideoLoading && (
    <div className={styles['black-text']}>
      Description of video: {img2vidPrompt}
      <p>
        Loading
        <LoadingDots />
      </p>
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  const viewGeneratedContent = (videoUrl) => {
    setVideoLink(videoUrl); // Update state with the video URL
    localStorage.setItem(`videoLink_${user.id}`, videoUrl); // Save videoLink to localStorage
    router.push('/view-video'); // Navigate to the content page
  };

  const renderCard = (resultVideo, index) => {
    return (
      <Card
        style={{ width: '10rem' }}
        key={index}
        className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
        onClick={() => viewGeneratedContent(resultVideo)}
      >
        <video width="100%" src={resultVideo} controls={false} />
      </Card>
    );
  };

  async function copyVideoToSupabase(vid_url) {
    try {
      const response = await fetch(vid_url);
      console.log('vid_url :', vid_url);
      const blob = await response.blob();
      // Get file extension from the URL or default to mp4
      const fileExt = vid_url.split('.').pop().toLowerCase() || 'mp4';
      const uniqueFileName = `${user?.id}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('videos') // Specify the bucket name
        .upload(uniqueFileName, blob, {
          contentType: blob.type
        });

      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }

      // Return the unique file name to be used later for URL generation
      return uniqueFileName;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  const addVideos = async (vid_url) => {
    console.log('Processing video: ', vid_url);

    const uniqueFileName = await copyVideoToSupabase(vid_url);
    if (uniqueFileName) {
      const { data, error: urlError } = supabase.storage
        .from('videos')
        .getPublicUrl(uniqueFileName);

      if (urlError) {
        console.error('Error generating public URL:', urlError.message);
      }

      // Save to database and local state
      await supabase.from('videos').insert({
        customer_id: user.identities[0].id,
        video_url: data.publicUrl
      });

      const localVideos = localStorage.getItem(`generatedVideos_${user.id}`);
      const localVideosJson = localVideos ? JSON.parse(localVideos) : [];
      localVideosJson.push(data.publicUrl);
      localStorage.setItem(
        `generatedVideos_${user.id}`,
        JSON.stringify(localVideosJson)
      );

      /*setBackgroundImageList((current) => [
          ...current,
          { url: data.publicUrl, text: '' }
        ]);*/

      await getVideoTokenData();
    }
  };

  useEffect(() => {
    if (resultVideo) {
      console.log('resultVideo: ', resultVideo);
      addVideos(resultVideo);
    }
  }, [resultVideo]);

  async function getVideoTokenData() {
    console.log('user is: ', user.id);
    const videoTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=video_tokens`
    );
    console.log('videoTokenData: ', videoTokenData.data);
    setNumTokens(videoTokenData.data);
  }

  useEffect(() => {
    if (user) {
      getVideoTokenData();
    }
  }, [user]);

  async function getTieredVideoData() {
    console.log('user is: ', user.id);
    const videoTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}` + `&tokenType=video_tokens`
    );
    console.log('videoTieredData: ', videoTieredData.data);
    setNumTieredTokens(videoTieredData.data);
  }

  useEffect(() => {
    if (user && subscription) {
      getTieredVideoData();
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
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Image to Video</h1>

          {/* Credits Badge with Tooltip */}
          <div className="relative">
            {hasNoSubscription && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-gradient-to-r from-[#423680] to-[#7B63FA] text-white text-sm font-semibold rounded-lg shadow-lg whitespace-nowrap">
                Need more credits? Start your free trial —{' '}
                <Link href="/pricing" className="underline hover:text-blue-200">
                  no card required
                </Link>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#7B63FA]"></div>
              </div>
            )}
            <div
              className={`inline-flex px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-colors duration-200 motion-reduce:transition-none
                ${numTokens <= 10 ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]' : 'bg-[#7B63FA] text-white ring-2 ring-[#7B63FA]'}`}
              aria-live="polite"
            >
              Credits {numTokens} / {numTieredTokens}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Image Preview Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Selected Image
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {displayContent ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={imageLink}
                    alt="Selected image"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] border-2 border-dashed border-[#3F3F46] rounded-xl">
                  <svg
                    className="w-12 h-12 text-[#52525B] opacity-40 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-[#A1A1AA]">
                    No image selected. Go to Dashboard to select an image first.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Video Generation Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Video Generation
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <textarea
                  value={img2vidPrompt}
                  onChange={handleChange}
                  placeholder="Describe the video scene you want to generate..."
                  className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <button
                  onClick={() => {
                    generateVideo(img2vidPrompt, imageLink);
                    setIsVideoLoading(true);
                  }}
                  disabled={
                    isVideoLoading || !imageLink || !img2vidPrompt?.trim()
                  }
                  className={`w-full h-12 rounded-lg font-semibold text-white transition-all duration-200 motion-reduce:transition-none motion-reduce:animation-none
                    ${
                      isVideoLoading
                        ? 'bg-[#4A4A4A] cursor-not-allowed'
                        : 'bg-[#8256FF] hover:bg-[#6F48DB] animate-button-shadow'
                    }`}
                >
                  {isVideoLoading ? (
                    <span className="flex items-center justify-center">
                      Generating
                      <LoadingDots />
                    </span>
                  ) : (
                    'Generate Video'
                  )}
                </button>
              </div>

              {loadingWithVideoPrompt && (
                <div className="mt-4 text-[#A1A1AA]">
                  <p>Processing your request...</p>
                  <p className="text-sm">Please do not refresh the page</p>
                </div>
              )}

              {finishMessage && (
                <div className="mt-4 p-4 bg-[#1F1F1F] rounded-lg text-[#E4E4E7]">
                  {finishMessage}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Results Section */}
        {resultVideo && (
          <>
            <h1 className="text-2xl font-bold mt-10 mb-6">Generated Video</h1>
            <div className="grid grid-cols-1 gap-6">
              <div
                className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none bg-[#181818] p-4"
                onClick={() => viewGeneratedContent(resultVideo)}
              >
                <video
                  src={resultVideo}
                  controls
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes button-shadow {
          0% {
            box-shadow: 0 0 0 0 rgba(130, 86, 255, 0.45);
          }
          100% {
            box-shadow: 0 0 0 24px rgba(130, 86, 255, 0);
          }
        }
        .animate-button-shadow:not(:disabled):active {
          animation: button-shadow 400ms ease-out;
        }
      `}</style>
    </main>
  );
}
