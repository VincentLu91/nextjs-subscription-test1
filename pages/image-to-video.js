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
    setIsVideoLoading
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionObject, setCaptionObject] = useState(null);
  const [captionStatus, setCaptionStatus] = useState(null);
  const [numTokens, setNumTokens] = useState(null);
  const [videoRespObj, setVideoRespObj] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
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

  const displayContent = imageLink && (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      {/* Close button */}
      <button
        onClick={() => {
          setImageLinkLink(null); // Clear the state
          localStorage.removeItem('imageLink'); // Remove the key from localStorage
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
      setResultVideo(result.data.video.url);
      //setResultVideo(result.data.video);
      // Clear interval when video is completed
      if (interval.current) {
        clearInterval(interval.current);
        interval.current = null;
      }
      setIsVideoLoading(false);
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

  const loadingWithVideoPrompt = isVideoLoading && (
    <div className={styles['black-text']}>
      Description of video: {prompt}
      <p>
        Loading
        <LoadingDots />
      </p>
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  const viewGeneratedContent = (videoUrl) => {
    setVideoLink(videoUrl); // Update state with the video URL
    localStorage.setItem('videoLink', videoUrl); // Save videoLink to localStorage
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
      const uniqueFileName = `${user.id}/${uuidv4()}.${fileExt}`;

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

      const localVideos = localStorage.getItem('generatedVideos');
      const localVideosJson = localVideos ? JSON.parse(localVideos) : [];
      localVideosJson.push(data.publicUrl);
      localStorage.setItem('generatedVideos', JSON.stringify(localVideosJson));

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
    <section className="bg-[#0C0C0C] mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Image to Video
          </h1>
          <br></br>
          <p className="sm:text-center text-black">
            Number of video credits available: {numTokens} / {numTieredTokens}
          </p>
          <br />
          {subscription ? ( // goal of this is to restrict content to subscribers.
            <div className={styles['display-image']}>
              {isLoading && <LoadingDots />}
              <p>Select image and generate video</p>
              <br />
              {displayContent || (
                <div>
                  <p className="text-black">
                    You do not have image! Go back to Dashboard and select an
                    image first
                  </p>
                </div>
              )}
              <br></br>
              <p>
                Enter your instruction for the AI to generate a video scene.
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
                onClick={() => {
                  generateVideo(prompt, imageLink);
                  setIsVideoLoading(true);
                }}
              >
                Generate Video
              </Button>
              <br></br>
              {loadingWithVideoPrompt}
              {resultVideo && renderCard(resultVideo, 0)}
            </div>
          ) : (
            <h1 className="text-black">You are not subscribed yet!</h1>
          )}
        </div>
      </div>
    </section>
  );
}
