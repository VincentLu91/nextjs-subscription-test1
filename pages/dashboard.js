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

const ATTEMPTS = 2

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const {
    userLoaded,
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
    setcontentPrompt
  } = useUser();

  const interval = useRef();
  const [predictions, setPredictions] = useState({}); // { 0 : { get: 'url', cancel: "url", status: 'succeeded'}}

  const getImage = async (attempt, contentPrompt) => {
    let version;
    const prevModelInfo = await supabase
      .from('ai-models')
      .select('id, created_at, model_version, user_auth_id')
      .eq('user_auth_id', user.identities[0].id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (prevModelInfo.data[0].model_version != null) {
      version = prevModelInfo.data[0].model_version;
    } else {
      version =
        'd98c28497f972c7a6a90ee4f9052aab8ede8be5768a6ef42c6c7af5e42bd7608';
    }
    console.log('version: ', version);
    const resp = await axios.get(
      '/api/imagepredictions?prompt=' + contentPrompt + '&version=' + version
    );
    setPredictions(state => ({ ...state, [attempt] : resp.data }));
    console.log('Resp data is: ', resp.data);
    return resp.data;
  };

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
     if (output.data.status === 'succeeded') {
        const result = output.data.output[0];
         if (result) {
           setImageList((current) => [
             ...current,
             { url: result, text: '' } // placeholder text is empty for optional caption generation
           ]);           
         } else {
           alert('nothing generated');
         }
        setPredictions(state => ({ ...state, [attempt] : { ...state[attempt], status: 'succeeded' }}))
     }
    console.log('output data is: ', output);    
  };

  useEffect(() => {
    if (Object.values(predictions).every(item => item.status === 'succeeded')) {
      clearInterval(interval.current);
      setIsLoading(false);
    }
  }, [predictions])

  useEffect(() => {
    // [ [0, {get: 'sss.com' , cancel: 'ssswe.com', status: 'training'}],  ]
    const predictionAry = Object.entries(predictions).filter(
      ([attempt, item]) => item.status !== 'succeeded'
    );

    if (predictionAry.length > 0) {
      interval.current = setInterval(() => {
        predictionAry.forEach(([attempt, item]) => {
          getImageResults(attempt, item.get);
        });
      }, 3000);
    }
    // at every 2 seconds, an 'interval' is created via calling setInterval().
    // clearInterval literally 'clears' the interval at the end of every 2 seconds before a new interval is created
    // otherwise, new instances of 'interval' are created, and you end up printing past + present values of status
    return () => clearInterval(interval.current);
  }, [predictions]);

  useEffect(
    () => {
      if (!user) router.replace('/signin');
    },
    [user],
    []
  );

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
    setcontentPrompt(e.target.value);
    console.log('contentPrompt: ', e.target.value);
  };

  const loadingWithContentPrompt = isLoading && (
    <div className={styles['white-text']}>
      <p>Loading...</p>
      <LoadingDots />
    </div>
  );

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    router.push('/view-content');
  };

  const renderCard = (image, index) => {
    return (
      <Card
        style={{ width: '10rem', backgroundColor: 'orange' }} // the smaller the width, the more columns of images displayed
        key={index}
        className={styles['box']}
      >
        <Card.Img variant="top" src={image.url} />
        <Card.Body>
          <Card.Text>{image.text}</Card.Text>
          <Button
            variant="primary"
            onClick={() => viewGeneratedContent(image.url)}
          >
            View Content
          </Button>
        </Card.Body>
      </Card>
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

  return (
    <div className="App">
      <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
        Go Ahead...Generate Images
      </h1>
      <br></br>
      <Button onClick={() => router.push('/productnamelist')}>
        View List of Products
      </Button>
      {subscription ? ( // goal of this is to restrict content to subscribers.
        <div className={styles['get-image-button']}>
          <input
            type="text"
            id="contentPrompt"
            name="contentPrompt"
            onChange={handleChange}
            value={contentPrompt || ''}
            placeholder="Enter text to generate image of your product/brand"
            style={{ width: '420px' }}
          />
          <br></br>
          <Button
            onClick={async () => {
              if (contentPrompt == null || contentPrompt.trim() == '') {
                alert('Please enter a contentPrompt');
              } else {
                clearInterval(interval.current)
                setPredictions({});
                setImageList([]); // when generation begins, list of images is empty
                setIsLoading(true);
                for (let i = 0; i < ATTEMPTS; i++) {
                  // 2 is a placeholder, later I plan to generate 16 images
                  getImage(i, contentPrompt);
                }
              }
            }}
          >
            Generate Image
          </Button>
          <br></br>
          {loadingWithContentPrompt}
          <div className={styles['grid']}>{imageList.map(renderCard)}</div>
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
