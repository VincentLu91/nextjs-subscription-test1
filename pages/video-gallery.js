import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../components/UserContext';
import Button from '../components/ui/Button';
import axios from 'axios';
import { supabase } from '../utils/initSupabase';

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

  return (
    <section className="bg-[#0F0F0F] min-h-screen py-16">
      <div className="max-w-[1280px] mx-auto px-4">
        {subscription ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-white">
                Video Gallery
              </h1>
              {/*<Button
                className="bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                variant="slim"
                onClick={() => fetchAndStoreVideos(true)}
              >
                Sync AI Videos
              </Button>*/}
            </div>

            {message && (
              <p className="mb-6 text-[#E0E0E0] text-center">{message}</p>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 justify-items-center">
              {generatedVideos.map((videoUrl, index) => (
                <div
                  key={index}
                  className="gallery-tile relative w-full aspect-square overflow-hidden rounded-[14px] transition-transform duration-220 ease-out hover:translate-y-[-4px] hover:scale-[1.03] hover:drop-shadow-lg"
                >
                  <div
                    className="relative w-full h-full cursor-pointer"
                    onClick={() => viewGeneratedContent(videoUrl)}
                    style={{ position: 'relative' }}
                  >
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover brightness-[0.92]"
                      controls={false}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVideo(videoUrl);
                      }}
                      className="absolute top-[10px] right-[10px] w-8 h-8 rounded-full bg-[rgba(255,69,58,0.18)] flex items-center justify-center border-0 cursor-pointer backdrop-blur-[6px] opacity-65 transition-all duration-180 ease-out hover:opacity-100 hover:scale-[1.12] hover:shadow-[0_0_0_2px_rgba(255,69,58,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF453A]"
                      aria-label="Delete video"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-[#FF453A] stroke-2"
                      >
                        <line
                          x1="1"
                          y1="1"
                          x2="13"
                          y2="13"
                          strokeLinecap="round"
                        />
                        <line
                          x1="13"
                          y1="1"
                          x2="1"
                          y2="13"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-2xl font-semibold text-white mb-4">
              Premium Feature
            </h1>
            <p className="text-[#E0E0E0]">
              You need an active subscription to access the gallery.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          50% {
            transform: translateX(4px);
          }
          75% {
            transform: translateX(-4px);
          }
        }
      `}</style>
    </section>
  );
}
