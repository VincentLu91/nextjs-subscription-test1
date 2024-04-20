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
export default function Train() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [imageStyle, setImageStyle] = useState(null);
  const [finishMessage, setFinishMessage] = useState('');
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);
  const router = useRouter();
  const {
    userLoaded,
    user,
    session,
    userDetails,
    isLoadingUser,
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
    try {
      const resp = await axios.get(
        '/api/imagepredictions?contentPrompt=' +
          contentPrompt +
          ' ' +
          productIdentifier +
          '&imageStyle=' +
          imageStyle +
          '&version=' +
          modelVersion +
          `&user=${user.id}`
      );
      setPredictions((state) => ({ ...state, [attempt]: resp.data }));
      console.log('Resp data is: ', resp.data);
      return resp.data;
    } catch (err) {
      setIsLoading(false);
      alert('Doesnt have enought tokens');
    }
  };

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'succeeded') {
      await supabase.from('photos').insert({
        customer_id: user.identities[0].id,
        photo_url: output.data.output[0]
      });
      const localPhotos = localStorage.getItem('generatedPhotos');
      if (localPhotos) {
        const localPhotosJson = JSON.parse(localPhotos);
        localPhotosJson.push(output.data.output[0]);
        localStorage.setItem(
          'generatedPhotos',
          JSON.stringify(localPhotosJson)
        );
      }
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
      setcontentPrompt(null);
    }
    console.log('output data is: ', output);
  };

  useEffect(() => {
    const list = Object.values(predictions);
    if (list.length > 0 && list.every((item) => item.status === 'succeeded')) {
      clearInterval(interval.current);
      setIsLoading(false);
      setIsGeneratingImages(false);
      setFinishMessage(
        'All images are generated and saved to gallery.\n' +
          'Please go to the Gallery page to see all your generated images'
      );
    }
  }, [predictions]);

  useEffect(() => {
    // [ [0, {get: 'sss.com' , cancel: 'ssswe.com', status: 'training'}],  ]
    const predictionAry = Object.entries(predictions).filter(
      ([attempt, item]) => item.status !== 'succeeded'
    );
    console.log(predictionAry);

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

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
    console.log('message is: ', message);
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

  const selectImageStyle = (e) => {
    setImageStyle(e.label);
    console.log('Image style selected: ', e.label);
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

  async function getImageTokenData() {
    console.log('user is: ', user.id);
    const imageTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=image_tokens`
    );
    console.log('imageTokenData: ', imageTokenData.data);
    setNumTokens(imageTokenData.data);
  }

  useEffect(() => {
    if (user) {
      getImageTokenData();
    }
  }, [user]);

  async function getTieredImageData() {
    console.log('user is: ', user.id);
    const imageTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}` + `&tokenType=image_tokens`
    );
    console.log('imageTieredData: ', imageTieredData.data);
    setNumTieredTokens(imageTieredData.data);
  }

  useEffect(() => {
    if (user) {
      getTieredImageData();
    }
  }, [user]);

  const loadingWithContentPrompt = isLoading && (
    <div className={styles['black-text']}>
      Description of image: {contentPrompt}
      <p>
        Loading
        <LoadingDots />
      </p>
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    localStorage.setItem('imageLink', url); // Save imageLink to localStorage
    router.push('/view-content');
  };

  const renderCard = (image, index) => {
    return (
      <Card
        style={{ width: '10rem' }} // the smaller the width, the more columns of images displayed
        key={index}
        className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
        onClick={() => viewGeneratedContent(image.url)}
      >
        <Card.Img variant="top" src={image.url} />
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
            <br />
            {isGeneratingImages ? (
              <p style={{ color: 'var(--accent-1)' }}>
                Product to generate: {modelName}
              </p>
            ) : (
              <div className="flex flex-row center-items p-2">
                <Select
                  placeholder="Select Option"
                  value={instanceList.find((obj) => obj.value === modelName)} // set selected value
                  options={instanceList} // set list of the data
                  onChange={handleSelectChange} // assign onChange function
                  className="mr-4" // Add right margin for spacing
                />
                <Select
                  placeholder="Select image style"
                  options={imageStyles} // set list of the data
                  onChange={selectImageStyle} // assign onChange function
                />
              </div>
            )}
            <br />

            <br />
            {!isGeneratingImages && (
              <div className="flex flex-col items-center p-2">
                <input
                  type="text"
                  id="contentPrompt"
                  name="contentPrompt"
                  onChange={handleChange}
                  value={contentPrompt || ''}
                  placeholder="Enter text to generate image of your product/brand"
                  style={{ width: '420px' }}
                  className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
                />
                <br></br>

                <Button
                  onClick={async () => {
                    if (
                      contentPrompt == null ||
                      contentPrompt.trim() == '' ||
                      !imageStyle
                    ) {
                      alert('Please complete all fields');
                    } else {
                      clearInterval(interval.current);
                      setPredictions({});
                      setImageList([]); // when generation begins, list of images is empty
                      setIsLoading(true);
                      setFinishMessage('');
                      for (let i = 0; i < ATTEMPTS; i++) {
                        // 2 is a placeholder, later I plan to generate 16 images
                        getImage(i, contentPrompt);
                      }
                    }
                  }}
                >
                  Generate Image
                </Button>
              </div>
            )}
            <br></br>
            {loadingWithContentPrompt}
            {finishMessage}
            <div className={styles['grid']}>{imageList.map(renderCard)}</div>
          </div>
        );
      } else {
        //
        return (
          <div className={styles['get-image-button']}>
            <br />
            <div className="flex flex-row center-items p-2">
              <Select
                placeholder="Select Option"
                value={instanceList.find((obj) => obj.value === modelName)} // set selected value
                options={instanceList} // set list of the data
                onChange={handleSelectChange} // assign onChange function
                className="mr-4" // Add right margin for spacing
              />
              <Select
                placeholder="Select image style"
                options={imageStyles} // set list of the data
                onChange={selectImageStyle} // assign onChange function
              />
            </div>
            <br />
            <input
              type="text"
              id="contentPrompt"
              name="contentPrompt"
              onChange={handleChange}
              value={contentPrompt || ''}
              placeholder="Enter text to generate image of your product/brand"
              style={{ width: '420px' }}
              className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
            />
            <br />
            <Button
              onClick={async () => {
                if (
                  contentPrompt == null ||
                  contentPrompt.trim() == '' ||
                  !imageStyle
                ) {
                  alert('Please complete all fields');
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
          </div>
        );
      }
    } else {
      return <h1 className="text-black">You are not subscribed yet!</h1>;
    }
  }

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Generate Original Images of Your Product
          </h1>
          <br />
          <p className="text-black sm:text-center">
            Here, you will select product and style to generate.
          </p>
          <p className="text-black sm:text-center">
            Number of imageTokens: {numTokens}
          </p>
          <p className="text-black sm:text-center">
            Tiered Number of imageTokens: {numTieredTokens}
          </p>
          {/* Display the custom message */}
          <p className="text-black sm:text-center">{message}</p>
          <br></br>
          <p className="text-black sm:text-center">
            Each time you generate, it will create {ATTEMPTS} images and they
            will be saved to the gallery
          </p>
          {subscribedAndModelChosen()}
        </div>
      </div>
    </section>
  );
}
