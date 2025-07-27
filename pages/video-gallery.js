import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import styles from '../styles/Home.module.css';
import { supabase } from '../utils/initSupabase';
import Select from 'react-select';

const ATTEMPTS = 2;
// the current code for this page is a workaround to account for switching model APIs to call
// currently, there is no retraining of existing models. When the feature is available, revert back to the following:
// https://github.com/VincentLu91/nextjs-subscription-test1/blob/31372c6dd2188fa96bb997c044088123f1d2b3e6/pages/dashboard.js
// be mindful though, that if you go to other pages and coming back, the loading dots may disappear with
// no images re-rendered. This is because the 'predictions' and 'setPredictions' were not included in
// components/UserContext.js
export default function VideoGallery() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [imageStyle, setImageStyle] = useState(null);
  const router = useRouter();
  const {
    userLoaded,
    isLoadingUser,
    user,
    session,
    userDetails,
    subscription,
    setVideoLink,
    videoList,
    setVideoList,
    isLoading,
    setIsLoading,
    contentPrompt,
    setcontentPrompt,
    setTrainingText,
    modelName,
    setModelName,
    modelVersion,
    setModelVersion,
    instanceList,
    setInstanceList,
    predictions,
    setPredictions,
    isGeneratingVideos,
    setIsGeneratingVideos,
    generatedVideos,
    setGeneratedVideos
  } = useUser();

  const interval = useRef();
  // Access the query parameters to get the custom message
  const message = router.query.message;

  const getVideoResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'COMPLETED') {
      const result = await axios.get(
        '/api/imageresults?url=' + output.data.response_url
      );
      await supabase.from('videos').insert({
        customer_id: user.identities[0].id,
        video_url: result.data.videos[0].url // I think it's wrong
      });

      if (result) {
        setVideoList((current) => [
          ...current,
          { url: result, text: '' } // placeholder text is empty for optional caption generation
        ]);
      } else {
        alert('nothing generated');
      }
      setPredictions((state) => ({
        ...state,
        [attempt]: { ...state[attempt], status: 'COMPLETED' }
      }));
      setcontentPrompt(null);
    }
    console.log('output data is: ', output);
  };

  useEffect(() => {
    const list = Object.values(predictions);
    if (list.length > 0 && list.every((item) => item.status === 'COMPLETED')) {
      clearInterval(interval.current);
      setIsLoading(false);
      setIsGeneratingVideos(false);
    }
  }, [predictions]);

  useEffect(() => {
    // [ [0, {get: 'sss.com' , cancel: 'ssswe.com', status: 'training'}],  ]
    const predictionAry = Object.entries(predictions).filter(
      ([attempt, item]) => item.status !== 'COMPLETED'
    );

    if (predictionAry.length > 0) {
      interval.current = setInterval(() => {
        predictionAry.forEach(([attempt, item]) => {
          getVideoResults(attempt, item.status_url);
        });
      }, 3000);
    }
    // at every 2 seconds, an 'interval' is created via calling setInterval().
    // clearInterval literally 'clears' the interval at the end of every 2 seconds before a new interval is created
    // otherwise, new instances of 'interval' are created, and you end up printing past + present values of status
    return () => clearInterval(interval.current);
  }, [predictions]);

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

  const getVideos = async () => {
    if (!user?.identities[0]?.id) {
      return []; // i.e., if user hasn't trained anything yet.
    }
    const videosInfo = await supabase
      .from('videos')
      .select('*')
      .eq('customer_id', user.identities[0].id);
    const listOfVideos = videosInfo.data.map((item) => item.video_url);
    console.log('listOfVideos: ', listOfVideos);
    return listOfVideos;
  };

  const fetchAndStoreVideos = async (isForceSync = false) => {
    try {
      const storedVideos = localStorage.getItem('generatedVideos');
      if (storedVideos && !isForceSync) {
        setGeneratedVideos(JSON.parse(storedVideos));
      } else {
        const videos = await getVideos();
        if (videos) {
          setGeneratedVideos(videos);
          localStorage.setItem('generatedVideos', JSON.stringify(videos));
        }
      }
    } catch (error) {
      console.error('Error fetching or storing videos:', error);
    }
  };

  useEffect(() => {
    // Fetch and store videos when user data is available
    if (user?.identities?.[0]?.id) {
      fetchAndStoreVideos(true);
    }
  }, [user]);

  // Clear localStorage on route change
  useEffect(() => {
    const handleRouteChange = () => {
      localStorage.removeItem('generatedVideos'); // Clear the data
    };

    const handleBeforeUnload = () => {
      localStorage.removeItem('generatedVideos'); // Clear on tab close
    };

    // Listen to route changes
    router.events.on('routeChangeStart', handleRouteChange);
    // Listen to tab close or reload
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup the listeners when the component unmounts
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  const viewGeneratedContent = (url) => {
    setVideoLink(url);
    localStorage.setItem('videoLink', url); // Save imageLink to localStorage
    router.push('/view-video');
  };

  async function deleteVideo(video_url) {
    const storedVideos = localStorage.getItem('generatedVideos');
    const storedVideosUrl = JSON.parse(storedVideos);
    const index = storedVideosUrl.indexOf(video_url);
    if (index > -1) {
      // only splice array when item is found
      storedVideosUrl.splice(index, 1);
      setGeneratedVideos(storedVideosUrl);
      localStorage.setItem('generatedVideos', JSON.stringify(storedVideosUrl));
    }
    console.log('deleting photo_url: ', video_url);
    console.log('video_url delete.....');
    await supabase
      .from('videos')
      .delete()
      .eq('customer_id', user?.identities[0]?.id)
      .eq('video_url', video_url);
  }

  const renderCard = (resultVideo, index) => {
    return (
      <div className="relative" key={index}>
        <Card
          style={{ width: '10rem' }}
          className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
          onClick={() => viewGeneratedContent(resultVideo)}
        >
          <video width="100%" src={resultVideo} controls={false} />
        </Card>
        <button
          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-700"
          onClick={(e) => {
            e.stopPropagation();
            deleteVideo(resultVideo);
          }}
        >
          X
        </button>
      </div>
    );
  };

  function subscribedAndModelChosen() {
    if (subscription) {
      return (
        <div className="sm:flex sm:flex-col sm:align-center sm:items-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Video Gallery
          </h1>
          <br />
          <Button
            className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
            variant="slim"
            onClick={() => fetchAndStoreVideos(true)}
          >
            Sync AI Videos
          </Button>
          <br />
          <p className="text-black sm:text-center">
            All your generated videos are saved here. To delete a video, click
            'X' at the top right corner.
          </p>
          <p className="text-black sm:text-center">{message}</p>
          <br></br>
          <div className="flex flex-wrap justify-center">
            {generatedVideos.map(renderCard)}
          </div>
        </div>
      );
    } else {
      return <h1 className="text-black">You are not a paid member yet!!</h1>;
    }
  }

  return (
    <section className="bg-[#0C0C0C] mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        {subscribedAndModelChosen()}
      </div>
    </section>
  );
}
