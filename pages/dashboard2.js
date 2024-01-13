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
      '/api/modifyImage?prompt=' + backgroundPrompt + '&image=' + imageFileName
    );
    setBackgroundImagePredictions((state) => ({
      ...state,
      [attempt]: resp.data
    }));
    console.log('Resp data is: ', resp.data);
    return resp.data;
  };

  const getImageResults = async (attempt, url) => {
    const output = await axios.get('/api/imageresults?url=' + url);
    if (output.data.status === 'succeeded') {
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
      return (
        <div className={styles['get-image-button']}>
          {isGeneratingBGImages ? (
            <p style={{ color: 'white' }}>Generating</p>
          ) : (
            <p style={{ color: 'white' }}>Please generate</p>
          )}

          <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
            <Form.Control
              type="file"
              accept="image/png, image/jpeg"
              //accept="*"
              onChange={(e) => uploadFile(e)}
            />
          </Form.Group>

          <input
            type="text"
            id="backgroundPrompt"
            name="backgroundPrompt"
            onChange={handleChange}
            value={backgroundPrompt || ''}
            placeholder="Enter text to generate image of your product/brand"
            style={{ width: '420px' }}
          />
          <br></br>
          {!isGeneratingBGImages && (
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
                  for (let i = 0; i < ATTEMPTS; i++) {
                    // 2 is a placeholder, later I plan to generate 16 images
                    getImage(i, backgroundPrompt);
                  }
                }
              }}
            >
              Generate Image
            </Button>
          )}
          <br></br>
          {loadingWithBackgroundPrompt}
          <div className={styles['grid']}>
            {backgroundImageList.map(renderCard)}
          </div>
        </div>
      );
    } else {
      return <h1>You are not subscribed yet!</h1>;
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

  return (
    <div className="App">
      <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
        Go Ahead...Generate Images
      </h1>
      {console.log('isGeneratingBGImages is: ', isGeneratingBGImages)}
      <br></br>
      {subscribedAndModelChosen()}
    </div>
  );
}
