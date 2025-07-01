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

export default function GenerateApparel() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [modelImagePath, setModelImagePath] = useState('');
  const [garmentImagePath, setGarmentImagePath] = useState('');
  const [modelImageUrl, setModelImageUrl] = useState('');
  const [garmentImageUrl, setGarmentImageUrl] = useState('');
  const [selectedOption, setSelectedOption] = useState('tops');

  const router = useRouter();
  const {
    userLoaded,
    isLoadingUser,
    user,
    session,
    userDetails,
    subscription,
    setImageLink,
    tryOnImageList,
    setTryOnImageList,
    isApparelLoading,
    setisApparelLoading,
    setImageFile,
    isImageUploaded,
    setIsImageUploaded,
    imageFileName,
    setImageFileName,
    tryOnPredictions,
    setTryOnPredictions,
    isGeneratingApparel,
    setisGeneratingApparel,
    isGeneratingTryOn,
    setIsGeneratingTryOn
  } = useUser();

  const intervalImage = useRef();

  const getImage = async (attempt) => {
    if (!modelImagePath || !garmentImagePath) {
      console.error('Both model and garment images must be uploaded');
      setisGeneratingApparel(false);
      setisApparelLoading(false);
      return;
    }
    setResultImages([]);
    // Get fresh public URLs for both images
    const { data: modelUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(modelImagePath);

    const { data: garmentUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(garmentImagePath);

    if (!modelUrlData || !garmentUrlData) {
      console.error('Could not get fresh URLs for images');
      setisGeneratingApparel(false);
      setisApparelLoading(false);
      return;
    }

    const resp = await axios.get('/api/tryon', {
      params: {
        model_image: modelUrlData.publicUrl,
        garment_image: garmentUrlData.publicUrl,
        category: selectedOption,
        user: user.id
      }
    });
    setTryOnPredictions((state) => ({
      ...state,
      [attempt]: resp.data
    }));
    console.log('Resp data is: ', resp.data);
    setIsGeneratingTryOn(true);
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
        .from('images')
        .upload(uniqueFileName, blob, {
          contentType: blob.type
        });

      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }

      return uniqueFileName;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  };

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
        setTryOnPredictions((state) => ({
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
          continue;
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

        setTryOnImageList((current) => [...current, { url: data.publicUrl }]);
        await getImageTokenData();
      }
    }
  };

  useEffect(() => {
    const list = Object.values(tryOnPredictions);
    if (list.length > 0 && list.every((item) => item.status === 'COMPLETED')) {
      console.log('try-on results: ', tryOnPredictions);
      clearInterval(intervalImage.current);
      setIsGeneratingTryOn(false);
      setFinishMessage(
        'Clothes swapping complete! The results have been saved to your gallery.\n' +
          'Please go to the Gallery page to see your clothes swapping results.'
      );
    }
  }, [tryOnPredictions]);

  useEffect(() => {
    if (resultImages) {
      addImages(resultImages);
    }
  }, [resultImages]);

  useEffect(() => {
    const predictionAry = Object.entries(tryOnPredictions).filter(
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
  }, [tryOnPredictions]);

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
    if (user && subscription) {
      getTieredImageData();
    }
  }, [user]);

  const loadingMessage = isGeneratingTryOn && (
    <div className={styles['black-text']}>
      <p>
        Generating...
        <LoadingDots />
      </p>
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    localStorage.setItem('imageLink', url);
    router.push('/view-content');
  };

  const renderCard = (image, index) => {
    return (
      <Card
        style={{ width: '10rem' }}
        key={index}
        className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
        onClick={() => viewGeneratedContent(image.url)}
      >
        <Card.Img variant="top" src={image.url} />
      </Card>
    );
  };

  function subscribedAndModelChosen() {
    if (subscription) {
      return (
        <div className={styles['get-image-button']}>
          <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
            <Form.Label>Upload Model Image (Person)</Form.Label>
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => uploadFile(e, 'model')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                  Choose File
                </div>
              </div>
              {modelImagePath && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: {modelImagePath.split('/').pop()}
                </div>
              )}
            </div>
          </Form.Group>
          <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
            <Form.Label>Upload Clothing Piece (shirts, pants)</Form.Label>
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => uploadFile(e, 'garment')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                  Choose File
                </div>
              </div>
              {garmentImagePath && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: {garmentImagePath.split('/').pop()}
                </div>
              )}
            </div>
          </Form.Group>
          <br />
          {displayContent}
          {!isGeneratingTryOn && (
            <div className="flex flex-col items-center p-2">
              <p>Category:</p>
              <select value={selectedOption} onChange={handleOptionChange}>
                <option value="tops">Top</option>
                <option value="bottoms">Bottom</option>
                <option value="one-pieces">Full-Body</option>
              </select>
              {/*<p>Selected: {selectedOption}</p>*/}
              <Button
                className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                variant="slim"
                onClick={async () => {
                  if (!modelImagePath || !garmentImagePath) {
                    alert('Please upload both model and garment images!');
                  } else {
                    clearInterval(intervalImage.current);
                    setTryOnPredictions({});
                    setTryOnImageList([]);
                    setIsGeneratingTryOn(true);
                    setFinishMessage('');
                    for (let i = 0; i < ATTEMPTS; i++) {
                      getImage(i);
                    }
                    await getImageTokenData();
                  }
                }}
              >
                Generate Image
              </Button>
            </div>
          )}
          <br></br>
          {loadingMessage}
          {finishMessage}
          <div className={styles['grid']}>{tryOnImageList.map(renderCard)}</div>
        </div>
      );
    } else {
      return <h1 className="text-black">You are not subscribed yet!</h1>;
    }
  }

  async function getFiles() {
    console.log('isImageUploaded: ', isImageUploaded);
    // Get public URLs for both files
    const { data: modelData, error: modelError } = await supabase.storage
      .from('images')
      .getPublicUrl(modelImagePath);

    const { data: garmentData, error: garmentError } = await supabase.storage
      .from('images')
      .getPublicUrl(garmentImagePath);

    if (modelData != null) {
      setImageFile(modelData);
      setImageFileName(modelData.publicUrl);
      console.log('model image: ', modelData.publicUrl);
    }

    if (modelError || garmentError) {
      alert('Error loading images');
      console.log('Model error:', modelError);
      console.log('Garment error:', garmentError);
    }
  }

  useEffect(() => {
    if (user && isImageUploaded) {
      getFiles();
    }
  }, [user, isImageUploaded]);

  async function uploadFile(e, type) {
    let file = e.target.files[0];
    console.log('file: ', file);
    if (file == undefined) {
      return;
    }

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
        if (type === 'model') {
          setModelImageUrl(publicUrlData.publicUrl);
          setModelImagePath(filePath);
        } else {
          setGarmentImageUrl(publicUrlData.publicUrl);
          setGarmentImagePath(filePath);
        }
      }
      setIsImageUploaded(true);
      getFiles();
    } else {
      console.error('Error uploading file:', error);
      alert('Failed to upload image. Please try again.');
      setIsImageUploaded(false);
    }
  }

  const displayContent = (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      {modelImageUrl && (
        <>
          <h3 className="text-black mb-2">Model Image:</h3>
          <img alt="model" src={modelImageUrl} className="mb-4" />
        </>
      )}
      {garmentImageUrl && (
        <>
          <h3 className="text-black mb-2">Garment Image:</h3>
          <img alt="garment" src={garmentImageUrl} className="mb-4" />
        </>
      )}
    </div>
  );

  return (
    <section className="bg-white mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Clothes Swapping
          </h1>
          {console.log('isGeneratingTryOn: ', isGeneratingTryOn)}
          <br></br>
          <p className="text-black sm:text-center">
            Number of image rendering credits available: {numTokens} /{' '}
            {numTieredTokens}
          </p>
          <br></br>
          <p className="text-black sm:text-center">
            Upload a photo of a person and a clothing item to try on. The AI
            will generate the result.
          </p>
          <br />
          {subscribedAndModelChosen()}
        </div>
      </div>
    </section>
  );
}
