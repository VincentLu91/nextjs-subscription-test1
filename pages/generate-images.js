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

const CDNURL = process.env.NEXT_PUBLIC_CDNURL;

export default function GenerateImages() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [uploadedFilePath, setUploadedFilePath] = useState('');

  const router = useRouter();
  const {
    userLoaded,
    isLoadingUser,
    user,
    session,
    userDetails,
    subscription,
    setImageLink,
    imageForBg,
    setImageForBg,
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
    if (!uploadedFilePath) {
      console.error('No image file uploaded or file path missing');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }
    setResultImages([]);
    // Get fresh public URL before making API call
    const { data: freshUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadedFilePath);

    if (!freshUrlData) {
      console.error('Could not get fresh URL for image');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }

    const resp = await axios.get(
      '/api/modifyImage?prompt=' +
        backgroundPrompt +
        '&image=' +
        freshUrlData.publicUrl +
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

  async function copyImageToSupabase(img_url) {
    try {
      const response = await fetch(img_url);
      const blob = await response.blob();
      // Get file extension from the URL or default to png
      const fileExt = img_url.split('.').pop().toLowerCase() || 'png';
      const uniqueFileName = `${user.id}/${uuidv4()}.${fileExt}`;

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
    try {
      const output = await axios.get('/api/imageresults?url=' + url);
      if (output.data.status === 'COMPLETED') {
        const result = await axios.get(
          '/api/imageresults?url=' + output.data.response_url
        );
        console.log('Result images:', result.data.images);
        setResultImages(result.data.images);

        // Mark prediction as completed
        setBackgroundImagePredictions((state) => ({
          ...state,
          [attempt]: { ...state[attempt], status: 'COMPLETED' }
        }));

        return result.data.images;
      }
    } catch (error) {
      console.error('Error in getImageResults:', error.message);
    }
    return [];
  };

  const addImages = async (images) => {
    for (const imageObj of images) {
      console.log('Processing image:', imageObj.url);

      const uniqueFileName = await copyImageToSupabase(imageObj.url);
      if (uniqueFileName) {
        const { data, error: urlError } = supabase.storage
          .from('images')
          .getPublicUrl(uniqueFileName);

        if (urlError) {
          console.error('Error generating public URL:', urlError.message);
          continue; // Skip this image
        }

        // Save to database and local state
        await supabase.from('photos').insert({
          customer_id: user.identities[0].id,
          photo_url: data.publicUrl
        });

        const localPhotos = localStorage.getItem('generatedPhotos');
        const localPhotosJson = localPhotos ? JSON.parse(localPhotos) : [];
        localPhotosJson.push(data.publicUrl);
        localStorage.setItem(
          'generatedPhotos',
          JSON.stringify(localPhotosJson)
        );

        setBackgroundImageList((current) => [
          ...current,
          { url: data.publicUrl, text: '' }
        ]);
      }
    }
  };

  useEffect(() => {
    const list = Object.values(backgroundImagePredictions);
    if (list.length > 0 && list.every((item) => item.status === 'COMPLETED')) {
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
    if (resultImages) {
      console.log('resultImages: ', resultImages);
      addImages(resultImages);
    }
  }, [resultImages]);

  useEffect(() => {
    const predictionAry = Object.entries(backgroundImagePredictions).filter(
      ([attempt, item]) => item.status !== 'COMPLETED'
    );
    if (predictionAry.length > 0) {
      intervalImage.current = setInterval(() => {
        predictionAry.forEach(([attempt, item]) => {
          getImageResults(attempt, item.status_url);
        });
      }, 3000);
    }
    return () => clearInterval(intervalImage.current);
  }, [backgroundImagePredictions]);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
    } else if (user) {
      // Restore uploadedFilePath from localStorage if it exists
      const savedFilePath = localStorage.getItem('uploadedFilePath');
      if (savedFilePath) {
        setUploadedFilePath(savedFilePath);
        setIsImageUploaded(true);
      }
    }
  }, [user, isLoadingUser]);

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
    // currently working with free users
    //if (subscription) {
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
        {displayContent}
        {!isGeneratingBGImages && (
          <div className="flex flex-col items-center p-2">
            <textarea
              type="text"
              id="backgroundPrompt"
              name="backgroundPrompt"
              placeholder="Enter text to generate image of your product/brand"
              value={backgroundPrompt || ''}
              cols="80"
              rows="15"
              onChange={handleChange}
              className="border-2 border-gray-300 rounded-md placeholder:pl-0.5"
            />
            <br></br>

            <Button
              variant="slim"
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
    /*} else {
      return <h1 className="text-black">You are not subscribed yet!</h1>;
    }*/
  }

  async function getFiles() {
    console.log('isImageUploaded: ', isImageUploaded);
    // Get public URL for the uploaded file
    const { data, error } = await supabase.storage
      .from('images')
      .getPublicUrl(uploadedFilePath);

    if (data != null) {
      setImageFile(data);
      setImageFileName(data.publicUrl);
      console.log('data: ', data);
      console.log('name of the img file is: ', data.publicUrl);
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

    // Get file extension and create a unique path with user ID
    const fileExt = file.name.split('.').pop().toLowerCase();
    const filePath = `${user.id}/${uuidv4()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (data) {
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        setImageForBg(publicUrlData.publicUrl); // Set the image link
        setUploadedFilePath(filePath);
        localStorage.setItem('uploadedFilePath', filePath); // Persist the file path
      }
      setIsImageUploaded(true);
      getFiles();
    } else {
      console.error('Error uploading file:', error);
      alert('Failed to upload image. Please try again.');
      setIsImageUploaded(false);
    }
  }

  const displayContent = imageForBg && (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      <img alt="uploaded" src={imageForBg} />
      <br />
    </div>
  );

  async function getImageTokenData() {
    console.log('user is: ', user.id);
    const imageTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=image_tokens`
    );
    console.log('imageTokenData: ', imageTokenData.data);
    setNumTokens(imageTokenData.data);
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

  /*useEffect(() => {
    if (user && subscription) {
      getTieredImageData();
    }
  }, [user]);*/

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Generate Images
          </h1>
          {console.log('isGeneratingBGImages is: ', isGeneratingBGImages)}
          <br></br>
          {/** working with free users */}
          {/*<p className="text-black sm:text-center">
            Number of image rendering credits available: {numTokens} /{' '}
            {numTieredTokens}
          </p>*/}
          <br></br>
          <p className="text-black sm:text-center">
            Choose a photo of <strong>1</strong> product. Tell the AI what
            background to generate.
          </p>
          <br />
          {subscribedAndModelChosen()}
        </div>
      </div>
    </section>
  );
}
