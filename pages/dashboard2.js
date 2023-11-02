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
    mask,
    setMask,
    maskUrl,
    setMaskUrl,
    zipFiles,
    setZipFiles,
    isUploaded,
    setIsUploaded,
    zipFileName,
    setZipFileName,
    maskPrompt,
    setMaskPrompt,
    negativeMaskPrompt,
    setNegativeMaskPrompt,
    predictions,
    setPredictions,
    isGeneratingImages,
    setIsGeneratingImages
  } = useUser();

  const intervalMask = useRef();
  const intervalImage = useRef();

  const getImage = async (attempt, contentPrompt) => {
    console.log('version: ', modelVersion);
    setIsGeneratingImages(true);
    const resp = await axios.get(
      '/api/modifyImage?prompt=' +
        contentPrompt +
        '&image=' +
        zipFileName +
        '&mask=' +
        mask
    );
    setPredictions((state) => ({ ...state, [attempt]: resp.data }));
    console.log('Resp data is: ', resp.data);
    return resp.data;
  };

  const getMask = async () => {
    const resp = await axios.get(
      '/api/groundedSam/?image=' +
        zipFileName +
        '&mask_prompt=' +
        maskPrompt +
        '&negative_mask_prompt=' +
        negativeMaskPrompt
    );
    console.log('getMask id is: ', resp.data.id);
    setMaskUrl('https://api.replicate.com/v1/predictions/' + resp.data.id);
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

  const getMaskResults = async () => {
    const output = await axios.get('/api/imageresults?url=' + maskUrl);
    console.log('does this even run!?');
    if (output.data.status === 'succeeded') {
      const result = output.data.output[3]; // this array has 4 masking images, we take the third one.
      if (result) {
        console.log('Masking result URL is: ', result);
        setMask(result);
      } else {
        alert('nothing generated');
      }
    }
  };

  useEffect(() => {
    if (
      Object.values(predictions).every((item) => item.status === 'succeeded')
    ) {
      clearInterval(intervalImage.current);
      setMaskUrl(null);
      setMask(null);
      setIsLoading(false);
      setIsGeneratingImages(false);
    }
  }, [predictions]);

  useEffect(() => {
    if (maskUrl) {
      console.log('maskUrl is: ', maskUrl);
      intervalMask.current = setInterval(() => {
        getMaskResults();
      }, 3000);
    }
    return () => clearInterval(intervalMask.current);
  }, [maskUrl]);

  useEffect(() => {
    const predictionAry = Object.entries(predictions).filter(
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
  }, [maskUrl, predictions]);

  useEffect(() => {
    console.log('mask is: ', mask);
    if (mask) {
      console.log('mask is not empty. Mask is: ', mask);
      for (let i = 0; i < ATTEMPTS; i++) {
        // 2 is a placeholder, later I plan to generate 16 images
        getImage(i, contentPrompt);
      }
    }
  }, [mask]);

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
  const handleMaskPrompt = (e) => {
    setMaskPrompt(e.target.value);
    console.log('maskPrompt: ', e.target.value);
  };
  const handleNegativeMaskPrompt = (e) => {
    setNegativeMaskPrompt(e.target.value);
    console.log('negativeMaskPrompt: ', e.target.value);
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

  function subscribedAndModelChosen() {
    if (subscription) {
      return (
        <div className={styles['get-image-button']}>
          {isGeneratingImages ? (
            <p style={{ color: 'white' }}>Generating</p>
          ) : (
            <p>Please generate</p>
          )}

          <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
            <Form.Control
              type="file"
              //accept="image/png, image/jpeg"
              accept="*"
              onChange={(e) => uploadFile(e)}
            />
          </Form.Group>

          <input
            type="text"
            id="maskPrompt"
            name="maskPrompt"
            onChange={handleMaskPrompt}
            value={maskPrompt || ''}
            placeholder="Enter mask prompt"
            style={{ width: '420px' }}
          />

          <input
            type="text"
            id="negativeMaskPrompt"
            name="negativeMaskPrompt"
            onChange={handleNegativeMaskPrompt}
            value={negativeMaskPrompt || ''}
            placeholder="Enter negative mask prompt"
            style={{ width: '420px' }}
          />

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
              if (isGeneratingImages) {
                alert('It is already training');
                return;
              }
              if (
                contentPrompt == null ||
                contentPrompt.trim() == '' ||
                maskPrompt == null ||
                maskPrompt.trim() == '' ||
                negativeMaskPrompt == null ||
                negativeMaskPrompt.trim() == ''
              ) {
                alert('Please enter all prompts');
              } else {
                clearInterval(intervalMask.current);
                clearInterval(intervalImage.current);
                setPredictions({});
                setImageList([]); // when generation begins, list of images is empty
                setIsLoading(true);
                // generate mask before images
                getMask();
              }
            }}
          >
            Generate Image
          </Button>
          <br></br>
          {loadingWithContentPrompt}
          <div className={styles['grid']}>{imageList.map(renderCard)}</div>
        </div>
      );
    } else {
      return <h1>You are not subscribed yet!</h1>;
    }
  }

  async function getFiles() {
    console.log('isUploaded: ', isUploaded);
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
      setZipFiles(data);
      setZipFileName(CDNURL + user.identities[0].id + '/' + data[0].name);
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
    if (user && isUploaded) {
      getFiles();
    }
  }, [user, isUploaded]);

  async function uploadFile(e) {
    let file = e.target.files[0];
    console.log('file: ', file);
    if (file == undefined) {
      return; // don't upload an empty file!
    }

    if (zipFiles) {
      deleteFile(zipFileName);
      setIsUploaded(false);
    }

    // userid: Cooper
    // Cooper/
    // Cooper/myNameOfImage.png
    // Lindsay/myNameOfImage.png

    const { data, error } = await supabase.storage
      .from('images')
      .upload(user.id + '/' + uuidv4() + '.png', file); // add .png extension otherwise storage will complain

    if (data) {
      setIsUploaded(true);
      getFiles();
    } else {
      console.log(error);
    }
  }

  async function deleteFile(zipFileName) {
    const { error } = await supabase.storage
      .from('images')
      .remove([user.id + '/' + zipFileName]);

    if (error) {
      alert(error);
    } else {
      //getFiles();
      setIsUploaded(false);
      setZipFiles([]);
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
