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
import { v4 as uuidv4 } from 'uuid';

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
  const [photoData, setPhotoData] = useState(null);
  const [step, setStep] = useState(1);
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
    modelClass,
    setModelClass,
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

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

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
      alert('Not have enough tokens');
    }
  };

  async function copyImageToSupabase(img_url) {
    try {
      const response = await fetch(img_url);
      const blob = await response.blob();
      const uniqueFileName = `${user.id}/${uuidv4()}.png`;

      const { data, error } = await supabase.storage
        .from('images') // Specify the bucket name
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

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);

    if (output.data.status === 'COMPLETED') {
      const result = await axios.get(
        '/api/imageresults?url=' + output.data.response_url
      );
      console.log('result.data.images[0].url is: ', result.data.images[0].url);
      // Wait for the image to be copied and get the unique filename
      const uniqueFileName = await copyImageToSupabase(
        result.data.images[0].url
      );

      if (uniqueFileName) {
        // Get the public URL using the same unique file name
        console.log('uniqueFileName: ', uniqueFileName);
        const { data, error: urlError } = supabase.storage
          .from('images')
          .getPublicUrl(uniqueFileName);

        if (urlError) {
          console.error('Error generating public URL:', urlError.message);
          return;
        }

        // Save the uploaded URL to the database
        await supabase.from('photos').insert({
          customer_id: user.identities[0].id,
          photo_url: data.publicUrl
        });

        setPhotoData(data);
        // Save the uploaded URL to localStorage
        const localPhotos = localStorage.getItem('generatedPhotos');
        const localPhotosJson = localPhotos ? JSON.parse(localPhotos) : [];
        localPhotosJson.push(data.publicUrl);
        localStorage.setItem(
          'generatedPhotos',
          JSON.stringify(localPhotosJson)
        );

        // Update the image list
        setImageList((current) => [
          ...current,
          { url: data.publicUrl, text: '' } // placeholder for captions
        ]);
      } else {
        alert('Failed to upload the image');
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
      setFinishMessage(
        'All images are generated and saved to gallery.\n' +
          'Please go to the Gallery page to see all your generated images'
      );
    }
  }, [predictions]);

  useEffect(() => {
    // [ [0, {get: 'sss.com' , cancel: 'ssswe.com', status: 'training'}],  ]
    const predictionAry = Object.entries(predictions).filter(
      ([attempt, item]) => item.status !== 'COMPLETED'
    );
    console.log(predictionAry);

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
  const handleSelectChange = async (e) => {
    // Make the function async
    setModelName(e.label);
    console.log('Model name selected: ', e.label);
    setModelVersion(e.value);
    console.log('Model version selected: ', e.value);

    try {
      // Await the supabase call
      const { data, error } = await supabase
        .from('ai-models')
        .select('class_prompt')
        .eq('instance_prompt', e.label);

      if (error) {
        console.error('Error fetching class prompt:', error);
      } else if (data && data.length > 0) {
        setModelClass(data[0].class_prompt);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
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
        instanceArr.push({
          label: i.instance_prompt,
          value: i.model_version
        });
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

  {
    /** working with free users */
  }
  /*useEffect(() => {
    if (user) {
      getImageTokenData();
    }
  }, [user]);*/

  async function getTieredImageData() {
    console.log('user is: ', user.id);
    const imageTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}` + `&tokenType=image_tokens`
    );
    console.log('imageTieredData: ', imageTieredData.data);
    setNumTieredTokens(imageTieredData.data);
  }

  {
    /** working with free users */
  }
  /*useEffect(() => {
    if (user && subscription) {
      getTieredImageData();
    }
  }, [user]);*/

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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-black sm:text-center">
            <h2>Step 1</h2>
            <p style={{ color: 'var(--accent-1)' }}>
              Product to generate: {modelName} {modelClass}
            </p>
            <br />
            {isGeneratingImages ? (
              <p style={{ color: 'var(--accent-1)' }}>Generating product...</p>
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
          </div>
        );
      case 2:
        return (
          <div className="text-black sm:text-center">
            <h2>Step 2</h2>
            {!isGeneratingImages && (
              <div className="flex flex-col items-center p-2">
                <p style={{ color: 'var(--accent-1)' }}>
                  Tell the AI how to create your product image
                </p>
                <p>
                  <strong>Tip:</strong> Include the exact product name.
                </p>
                {modelName && modelClass && (
                  <p>
                    Example: For "
                    <strong>
                      {modelName} {modelClass}
                    </strong>
                    ," write: "
                    <strong>
                      {modelName} {modelClass}
                    </strong>{' '}
                    on a brown table."
                  </p>
                )}

                <br />
                <textarea
                  type="text"
                  id="contentPrompt"
                  name="contentPrompt"
                  onChange={handleChange}
                  value={contentPrompt || ''}
                  cols="80"
                  rows="15"
                  placeholder="Enter text to generate your product/brand image. Be descriptive!"
                  className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
                />
                <br></br>

                <Button
                  variant="slim"
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
          </div>
        );
      default:
        return null;
    }
  };

  function subscribedAndModelChosen() {
    // currently working with free users
    //if (subscription) {

    return (
      <div className={styles['get-image-button']}>
        {renderStep()}
        {loadingWithContentPrompt}
        {finishMessage}
        <div className={styles['grid']}>{imageList.map(renderCard)}</div>
      </div>
    );

    /*} else {
      return <h1 className="text-black">You are not subscribed yet!</h1>;
    }*/
  }

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Generate Original Images of Your Product
          </h1>
          <br />
          {/** working with free users */}
          {/*<p className="text-black sm:text-center">
            Number of image rendering credits available: {numTokens} /{' '}
            {numTieredTokens}
          </p>*/}
          <br />
          {/* Display the custom message */}
          <p className="text-black sm:text-center">{message}</p>
          <br></br>
          {subscribedAndModelChosen()}
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{ marginLeft: '10px', color: 'blue' }}
            >
              Back
            </button>
          )}
          {step < 2 && (
            <button
              onClick={handleNext}
              style={{ marginLeft: '10px', color: 'blue' }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
