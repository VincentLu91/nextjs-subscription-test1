import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
export default function ImageGallery() {
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
    setImageLink,
    imageList,
    setImageList,
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
    isGeneratingImages,
    setIsGeneratingImages,
    generatedPhotos,
    setGeneratedPhotos
  } = useUser();

  const interval = useRef();
  const message = router.query.message;

  const imageStyles = [
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'grayscale', label: 'Grayscale' }
  ];

  const getImage = async (attempt, contentPrompt) => {
    let productIdentifier = '';
    if (modelName) {
      if (modelName != 'default') {
        const classInstance = await supabase
          .from('ai-models')
          .select('class_prompt')
          .eq('instance_prompt', modelName);
        console.log('classInstance: ', classInstance.data[0].class_prompt);
        productIdentifier =
          'For context, the product is the ' +
          modelName +
          ' ' +
          classInstance.data[0].class_prompt;
      }
    }

    console.log('version: ', modelVersion);
    setIsGeneratingImages(true);
    const resp = await axios.get(
      '/api/imagepredictions?contentPrompt=' +
        contentPrompt +
        ' ' +
        productIdentifier +
        '&imageStyle=' +
        imageStyle +
        '&version=' +
        modelVersion
    );
    setPredictions((state) => ({ ...state, [attempt]: resp.data }));
    console.log('Resp data is: ', resp.data);
    return resp.data;
  };

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'COMPLETED') {
      const result = await axios.get(
        '/api/imageresults?url=' + output.data.response_url
      );
      await supabase.from('photos').insert({
        customer_id: user.identities[0].id,
        photo_url: result.data.images[0].url
      });

      if (result) {
        setImageList((current) => [...current, { url: result, text: '' }]);
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
      setIsGeneratingImages(false);
    }
  }, [predictions]);

  useEffect(() => {
    const predictionAry = Object.entries(predictions).filter(
      ([attempt, item]) => item.status !== 'COMPLETED'
    );

    if (predictionAry.length > 0) {
      interval.current = setInterval(() => {
        predictionAry.forEach(([attempt, item]) => {
          getImageResults(attempt, item.status_url);
        });
      }, 3000);
    }
    return () => clearInterval(interval.current);
  }, [predictions]);

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

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

  const getInstancePrompts = async () => {
    if (!user?.identities[0]?.id) {
      return;
    }
    let instanceArr = [
      {
        label: 'default',
        value:
          'd98c28497f972c7a6a90ee4f9052aab8ede8be5768a6ef42c6c7af5e42bd7608'
      }
    ];
    const instancePromptsInfo = await supabase
      .from('ai-models')
      .select('*')
      .eq('user_auth_id', user.identities[0].id);
    instancePromptsInfo.data.map((i) => {
      console.log(i.instance_prompt);
      if (i.model_version != null) {
        instanceArr.push({ label: i.instance_prompt, value: i.model_version });
      }
    });
    console.log('instanceArr: ', instanceArr);
    setInstanceList(instanceArr);
  };

  useEffect(() => {
    getInstancePrompts();
  }, []);

  const getPhotos = async () => {
    if (!user?.identities[0]?.id) {
      return [];
    }
    const photosInfo = await supabase
      .from('photos')
      .select('*')
      .eq('customer_id', user.identities[0].id);
    const listOfPhotos = photosInfo.data.map((item) => item.photo_url);
    console.log('listOfPhotos: ', listOfPhotos);
    return listOfPhotos;
  };

  const fetchAndStorePhotos = async (isForceSync = false) => {
    try {
      const storedPhotos = localStorage.getItem('generatedPhotos');
      if (storedPhotos && !isForceSync) {
        setGeneratedPhotos(JSON.parse(storedPhotos));
      } else {
        const photos = await getPhotos();
        if (photos) {
          setGeneratedPhotos(photos);
          localStorage.setItem('generatedPhotos', JSON.stringify(photos));
        }
      }
    } catch (error) {
      console.error('Error fetching or storing photos:', error);
    }
  };

  useEffect(() => {
    fetchAndStorePhotos(true);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      localStorage.removeItem('generatedPhotos');
    };

    const handleBeforeUnload = () => {
      localStorage.removeItem('generatedPhotos');
    };

    router.events.on('routeChangeStart', handleRouteChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    localStorage.setItem(`imageLink_${user.id}`, url);
    router.push('/view-image');
  };

  async function deletePhoto(photo_url) {
    const storedPhotos = localStorage.getItem('generatedPhotos');
    const storedPhotosUrl = JSON.parse(storedPhotos);
    const index = storedPhotosUrl.indexOf(photo_url);
    if (index > -1) {
      storedPhotosUrl.splice(index, 1);
      setGeneratedPhotos(storedPhotosUrl);
      localStorage.setItem('generatedPhotos', JSON.stringify(storedPhotosUrl));
    }
    console.log('deleting photo_url: ', photo_url);
    console.log('photo_url delete.....');
    await supabase
      .from('photos')
      .delete()
      .eq('customer_id', user?.identities[0]?.id)
      .eq('photo_url', photo_url);
  }

  const renderCard = (imageUrl, index) => {
    return (
      <div className="relative" key={index}>
        <div
          className={`relative w-40 h-40 hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md overflow-hidden ${styles.box}`}
          onClick={() => viewGeneratedContent(imageUrl)}
        >
          <Image
            src={imageUrl}
            alt={`Generated Image ${index + 1}`}
            fill
            sizes="160px"
            className="object-cover"
            priority={index < 4}
          />
        </div>
        <button
          className="absolute top-2 right-6 bg-red-500 text-white rounded-full p-2 hover:bg-red-700"
          onClick={(e) => {
            e.stopPropagation();
            deletePhoto(imageUrl);
          }}
        >
          X
        </button>
      </div>
    );
  };

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  function subscribedAndModelChosen() {
    if (subscription) {
      return (
        <div className="sm:flex sm:flex-col sm:align-center sm:items-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Image Gallery
          </h1>
          <br />
          {/*<Button
            className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
            variant="slim"
            onClick={() => fetchAndStorePhotos(true)}
          >
            Sync AI Imagery
          </Button>*/}
          <br />
          <p className="text-white sm:text-center">
            All your generated images are saved here. To delete an image, click
            'X' at the top left corner.
          </p>
          <p className="text-white sm:text-center">{message}</p>
          <br></br>
          <div className="flex flex-wrap justify-center">
            {generatedPhotos.map(renderCard)}
          </div>
        </div>
      );
    } else {
      return <h1 className="text-white">You are not a paid member yet!!</h1>;
    }
  }

  return (
    <section className="bg-[#0F0F0F] min-h-screen py-16">
      <div className="max-w-[1280px] mx-auto px-4">
        {subscription ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-white">
                Image Gallery
              </h1>
              {/*<Button
                className="bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                variant="slim"
                onClick={() => fetchAndStorePhotos(true)}
              >
                Sync AI Imagery
              </Button>*/}
            </div>

            {message && (
              <p className="mb-6 text-[#E0E0E0] text-center">{message}</p>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 justify-items-center">
              {generatedPhotos.map((imageUrl, index) => (
                <div
                  key={index}
                  className="gallery-tile relative w-full aspect-square overflow-hidden rounded-[14px] transition-transform duration-220 ease-out hover:translate-y-[-4px] hover:scale-[1.03] hover:drop-shadow-lg"
                >
                  <div
                    className="relative w-full h-full cursor-pointer"
                    onClick={() => viewGeneratedContent(imageUrl)}
                    style={{ position: 'relative' }}
                  >
                    <Image
                      src={imageUrl}
                      alt={`Generated Image ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover brightness-[0.92]"
                      priority={index < 4} // Prioritize loading first 4 images
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(imageUrl);
                      }}
                      className="absolute top-[10px] right-[10px] w-8 h-8 rounded-full bg-[rgba(255,69,58,0.18)] flex items-center justify-center border-0 cursor-pointer backdrop-blur-[6px] opacity-65 transition-all duration-180 ease-out hover:opacity-100 hover:scale-[1.12] hover:shadow-[0_0_0_2px_rgba(255,69,58,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF453A]"
                      aria-label="Delete image"
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
