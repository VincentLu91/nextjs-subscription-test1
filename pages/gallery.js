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
export default function Gallery() {
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
  // Access the query parameters to get the custom message
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
        setImageList((current) => [
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
      setIsGeneratingImages(false);
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
          getImageResults(attempt, item.status_url);
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
      return; // i.e., if user hasn't trained anything yet.
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
      //i.instance_prompt;
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
      return []; // i.e., if user hasn't trained anything yet.
    }
    const photosInfo = await supabase
      .from('photos')
      .select('*')
      .eq('customer_id', user.identities[0].id);
    const listOfPhotos = photosInfo.data.map((item) => item.photo_url);
    console.log('listOfPhotos: ', listOfPhotos);
    return listOfPhotos;
    //setGeneratedPhotos(listOfPhotos);
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
    // Fetch and store photos when the component mounts
    fetchAndStorePhotos(true);
  }, []);

  // Clear localStorage on route change
  useEffect(() => {
    const handleRouteChange = () => {
      localStorage.removeItem('generatedPhotos'); // Clear the data
    };

    const handleBeforeUnload = () => {
      localStorage.removeItem('generatedPhotos'); // Clear on tab close
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
    setImageLink(url);
    localStorage.setItem('imageLink', url); // Save imageLink to localStorage
    router.push('/view-content');
  };

  async function deletePhoto(photo_url) {
    const storedPhotos = localStorage.getItem('generatedPhotos');
    const storedPhotosUrl = JSON.parse(storedPhotos);
    const index = storedPhotosUrl.indexOf(photo_url);
    if (index > -1) {
      // only splice array when item is found
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
    //window.location.reload(true);
  }

  const renderCard = (imageUrl, index) => {
    return (
      <div className="relative">
        <Card
          style={{ width: '10rem' }}
          key={index}
          className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
          onClick={() => viewGeneratedContent(imageUrl)}
        >
          <Card.Img variant="top" src={imageUrl} />
        </Card>
        <button
          className="absolute top-0 right-0 bg-red-500 text-black rounded-full p-2 hover:bg-red-700"
          onClick={() => deletePhoto(imageUrl)}
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
    // currently working with free users
    //if (subscription) {
    return (
      <div className="sm:flex sm:flex-col sm:align-center sm:items-center">
        <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
          Gallery
        </h1>
        <br />
        <Button
          className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
          variant="slim"
          onClick={() => fetchAndStorePhotos(true)}
        >
          Sync AI Imagery
        </Button>
        <br />
        <p className="text-black sm:text-center">
          All your generated images are saved here. To delete an image, click
          'X' at the top left corner.
        </p>
        <p className="text-black sm:text-center">{message}</p>
        <br></br>
        <div className="flex flex-wrap justify-center">
          {generatedPhotos.map(renderCard)}
        </div>
      </div>
    );
    /*} else {
      return <h1 className="text-black">You are not a paid member yet!!</h1>;
    }*/
  }

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        {subscribedAndModelChosen()}
      </div>
    </section>
  );
}
