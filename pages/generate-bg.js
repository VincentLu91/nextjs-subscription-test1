import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card, Form, Container, Row, Col } from 'react-bootstrap';
import styles from '../styles/Home.module.css';
import { supabase } from '../utils/initSupabase';
import Select from 'react-select';
import { v4 as uuidv4 } from 'uuid';

const ATTEMPTS = 1;

const CDNURL =
  'https://eolmngjyubxaxlvtwbzs.supabase.co/storage/v1/object/public/images/';

export default function Dashboard2() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);
  const router = useRouter();
  const {
    userLoaded,
    isLoadingUser,
    user,
    session,
    userDetails,
    subscription,
    setImageLink,
    backgroundImageList,
    setBackgroundImageList,
    isBGImagesLoading,
    setisBGImagesLoading,
    backgroundPrompt,
    setBackgroundPrompt,
    setTrainingText,
    modelName,
    setModelName,
    modelVersion,
    setModelVersion,
    imageFile,
    setImageFile,
    isImageUploaded,
    setIsImageUploaded,
    imageFileName,
    setImageFileName,
    backgroundImagePredictions,
    setBackgroundImagePredictions,
    isGeneratingBGImages,
    setisGeneratingBGImages
  } = useUser();

  const intervalImage = useRef();

  const getImage = async (attempt, backgroundPrompt) => {
    const resp = await axios.get(
      '/api/modifyImage?prompt=' +
        backgroundPrompt +
        '&image=' +
        imageFileName +
        `&user=${user.id}`
    );
    setBackgroundImagePredictions((state) => ({
      ...state,
      [attempt]: resp.data
    }));
    console.log('Resp data is: ', resp.data);
    setisGeneratingBGImages(true);
    return resp.data;
  };

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'succeeded') {
      await supabase.from('photos').insert({
        customer_id: user.identities[0].id,
        photo_url: output.data.output.image
      });
      const localPhotos = localStorage.getItem('generatedPhotos');
      if (localPhotos) {
        const localPhotosJson = JSON.parse(localPhotos);
        localPhotosJson.push(output.data.output.image);
        localStorage.setItem(
          'generatedPhotos',
          JSON.stringify(localPhotosJson)
        );
      }
      const result = output.data.output.image;
      if (result) {
        setBackgroundImageList((current) => [
          ...current,
          { url: result, text: '' } // placeholder text is empty for optional caption generation
        ]);
      } else {
        alert('nothing generated');
      }
      console.log('results', result);
      setBackgroundImagePredictions((state) => ({
        ...state,
        [attempt]: { ...state[attempt], status: 'succeeded' }
      }));
      setBackgroundPrompt(null);
    }
    console.log('output data is: ', output);
  };

  useEffect(() => {
    const list = Object.values(backgroundImagePredictions);
    if (list.length > 0 && list.every((item) => item.status === 'succeeded')) {
      console.log('background ', backgroundImagePredictions);
      clearInterval(intervalImage.current);
      setisBGImagesLoading(false);
      setisGeneratingBGImages(false);
      setFinishMessage(
        'All images are generated and saved to gallery.\n' +
          'Please go to the Gallery page to see all your generated images'
      );
    }
  }, [backgroundImagePredictions]);

  useEffect(() => {
    const predictionAry = Object.entries(backgroundImagePredictions).filter(
      ([attempt, item]) => item.status !== 'succeeded'
    );
    if (predictionAry.length > 0) {
      intervalImage.current = setInterval(() => {
        predictionAry.forEach(([attempt, item]) => {
          getImageResults(attempt, item.get);
        });
      }, 3000);
    }
    return () => clearInterval(intervalImage.current);
  }, [backgroundImagePredictions]);

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

  // handle onChange event of the text input (no longer dropdown)
  const handleChange = (e) => {
    setBackgroundPrompt(e.target.value);
    console.log('backgroundPrompt: ', e.target.value);
  };

  const loadingWithBackgroundPrompt = isBGImagesLoading && (
    <div className={styles['black-text']}>
      Description of image: {backgroundPrompt}
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
      return (
        <div className={styles['get-image-button']}>
          {/*isGeneratingBGImages ? (
            <p style={{ color: 'black' }}>Generating</p>
          ) : (
            <p style={{ color: 'black' }}>Please generate</p>
          )*/}

          <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
            <Form.Control
              type="file"
              accept="image/png, image/jpeg"
              //accept="*"
              onChange={(e) => uploadFile(e)}
            />
          </Form.Group>
          <br />
          {!isGeneratingBGImages && (
            <div className="flex flex-col items-center p-2">
              <input
                type="text"
                id="backgroundPrompt"
                name="backgroundPrompt"
                placeholder="Enter text to generate image of your product/brand"
                value={backgroundPrompt || ''}
                onChange={handleChange}
                style={{ width: '420px' }}
                className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
              />
              <br></br>

              <Button
                onClick={async () => {
                  if (
                    backgroundPrompt == null ||
                    backgroundPrompt.trim() == '' ||
                    isImageUploaded == false
                  ) {
                    alert('Please enter all prompts and upload your image!');
                  } else {
                    clearInterval(intervalImage.current);
                    setBackgroundImagePredictions({});
                    setBackgroundImageList([]); // when generation begins, list of images is empty
                    setisBGImagesLoading(true); // change this. seriously
                    setFinishMessage('');
                    for (let i = 0; i < ATTEMPTS; i++) {
                      // 2 is a placeholder, later I plan to generate 16 images
                      getImage(i, backgroundPrompt);
                    }
                  }
                }}
              >
                Generate Image
              </Button>
            </div>
          )}
          <br></br>
          {loadingWithBackgroundPrompt}
          {finishMessage}
          <div className={styles['grid']}>
            {backgroundImageList.map(renderCard)}
          </div>
        </div>
      );
    } else {
      return <h1 className="text-black">You are not subscribed yet!</h1>;
    }
  }

  async function getFiles() {
    console.log('isImageUploaded: ', isImageUploaded);
    const { data, error } = await supabase.storage
      .from('images')
      .list(user?.id + '/', {
        limit: 1,
        offset: 0,
        //sortBy: { column: 'name', order: 'asc' }
        sortBy: { column: 'updated_at', order: 'desc' }
      }); // Cooper/
    // data: [image1, image2, image3]
    // image1: {name: "subscribeToCooperCodes.png"}

    // to load image1: CDNURL.com/subscribeToCooperCodes.png -> hosted image

    if (data != null) {
      setImageFile(data);
      setImageFileName(CDNURL + user.identities[0].id + '/' + data[0].name);
      console.log('data: ', data);
      console.log(
        'name of the img file is: ',
        CDNURL + user.identities[0].id + '/' + data[0].name
      );
    } else {
      alert('Error loading images');
      console.log(error);
    }
  }

  useEffect(() => {
    if (user && isImageUploaded) {
      getFiles();
    }
  }, [user, isImageUploaded]);

  async function uploadFile(e) {
    let file = e.target.files[0];
    console.log('file: ', file);
    if (file == undefined) {
      return; // don't upload an empty file!
    }

    // userid: Cooper
    // Cooper/
    // Cooper/myNameOfImage.png
    // Lindsay/myNameOfImage.png

    const { data, error } = await supabase.storage
      .from('images')
      .upload(user.id + '/' + uuidv4() + '.png', file); // add .png extension otherwise storage will complain

    if (data) {
      setIsImageUploaded(true);
      getFiles();
    } else {
      console.log(error);
    }
  }

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

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Replace Background with Product Shot
          </h1>
          {console.log('isGeneratingBGImages is: ', isGeneratingBGImages)}
          <br></br>
          <p className="text-black sm:text-center">
            Happy with existing product shot or just want to preserve product
            labels in the photo?
          </p>
          <br></br>
          <p className="text-black sm:text-center">
            Just tell the AI the background you want generated.
          </p>
          <p className="text-black sm:text-center">
            Number of imageTokens: {numTokens}
          </p>
          <p className="text-black sm:text-center">
            Tiered Number of imageTokens: {numTieredTokens}
          </p>
          <br></br>
          <p className="text-black sm:text-center">
            Once generated, it will be saved to the gallery.
          </p>
          <br />
          {subscribedAndModelChosen()}
        </div>
      </div>
    </section>
  );
}
