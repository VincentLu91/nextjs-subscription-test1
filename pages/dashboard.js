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
    setIsGeneratingImages
  } = useUser();

  const interval = useRef();

  const getImage = async (attempt, contentPrompt) => {
    console.log('version: ', modelVersion);
    setIsGeneratingImages(true);
    const resp = await axios.get(
      '/api/imagepredictions?prompt=' +
        contentPrompt +
        '&version=' +
        modelVersion
    );
    setPredictions((state) => ({ ...state, [attempt]: resp.data }));
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
      setPredictions((state) => ({
        ...state,
        [attempt]: { ...state[attempt], status: 'succeeded' }
      }));
    }
    console.log('output data is: ', output);
  };

  useEffect(() => {
    const list = Object.values(predictions);
    if (list.length > 0 && list.every((item) => item.status === 'succeeded')) {
      clearInterval(interval.current);
      setIsLoading(false);
      setIsGeneratingImages(false);
    }
  }, [predictions]);

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

  // handle onChange event of the dropdown
  const handleSelectChange = (e) => {
    setModelName(e.label);
    console.log('Model name selected: ', e.label);
    setModelVersion(e.value);
    console.log('Model version selected: ', e.value);
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

  function subscribedAndModelChosen() {
    if (subscription) {
      if (modelVersion) {
        return (
          <div className={styles['get-image-button']}>
            <Button onClick={() => router.push('/productnamelist')}>
              View List of Products
            </Button>
            {isGeneratingImages ? (
              <p style={{ color: 'white' }}>{modelName}</p>
            ) : (
              <Select
                placeholder="Select Option"
                value={instanceList.find((obj) => obj.value === modelName)} // set selected value
                options={instanceList} // set list of the data
                onChange={handleSelectChange} // assign onChange function
              />
            )}

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
            {!isGeneratingImages && (
              <Button
                onClick={async () => {
                  if (contentPrompt == null || contentPrompt.trim() == '') {
                    alert('Please enter a contentPrompt');
                  } else {
                    clearInterval(interval.current);
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
            )}
            <br></br>
            {loadingWithContentPrompt}
            <div className={styles['grid']}>{imageList.map(renderCard)}</div>
          </div>
        );
      } else {
        //
        return (
          <div className={styles['get-image-button']}>
            <Button onClick={() => router.push('/productnamelist')}>
              View List of Products
            </Button>
            <Select
              placeholder="Select Option"
              value={instanceList.find((obj) => obj.value === modelName)} // set selected value
              options={instanceList} // set list of the data
              onChange={handleSelectChange} // assign onChange function
            />
          </div>
        );
      }
    } else {
      return <h1>You are not subscribed yet!</h1>;
    }
  }

  return (
    <div className="App">
      <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
        Go Ahead...Generate Images
      </h1>
      <br></br>
      {subscribedAndModelChosen()}
    </div>
  );
}
