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
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { forEach } from 'jszip';

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
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const fileInputRef = useRef(null);
  const [promptObject, setPromptObject] = useState(null);
  const [promptStatus, setPromptStatus] = useState(null);

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

  const intervalPrompt = useRef();
  const intervalImage = useRef();

  function selectFiles() {
    fileInputRef.current.click();
  }

  function onFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.split('/')[0] !== 'image') continue;
      if (!uploadedImages.some((e) => e.name == files[i].name)) {
        setUploadedImages((prevImages) => [
          ...prevImages,
          {
            name: files[i].name,
            url: URL.createObjectURL(files[i])
          }
        ]);
      }
    }
  }

  function deleteImage(index) {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    // Clear prompt and reset image upload state if all images are deleted
    if (newImages.length === 0) {
      setBackgroundPrompt('');
      setIsImageUploaded(false);
      setUploadedUrls([]);
    }
  }

  function onDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
    event.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.split('/')[0] !== 'image') continue;
      if (!uploadedImages.some((e) => e.name == files[i].name)) {
        setUploadedImages((prevImages) => [
          ...prevImages,
          {
            name: files[i].name,
            url: URL.createObjectURL(files[i])
          }
        ]);
      }
    }
  }

  async function uploadImages() {
    if (uploadedImages.length === 0) {
      alert('Please upload images');
      return;
    }

    const urls = [];

    // Upload all images to Supabase
    for (const image of uploadedImages) {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const fileExt = image.name.split('.').pop().toLowerCase();
      const filePath = `${user.id}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, blob);

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        if (publicUrlData) {
          urls.push(publicUrlData.publicUrl);
        }
      } else {
        console.error('Error uploading file:', error);
        alert('Failed to upload image. Please try again.');
        return;
      }
    }

    if (urls.length > 0) {
      setUploadedUrls(urls);
      setImageForBg(urls[0]); // Set first image as preview
      setIsImageUploaded(true);
    }
  }

  const getImage = async (attempt, backgroundPrompt) => {
    if (uploadedUrls.length === 0) {
      console.error('No images uploaded');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }
    setResultImages([]);

    console.log('Sending images to API:', uploadedUrls);

    const resp = await axios.post('/api/fluxUno', {
      prompt: backgroundPrompt,
      images: uploadedUrls,
      user: user.id
    });

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

  const getImageResults = async (attempt, url) => {
    try {
      const output = await axios.get('/api/imageresults?url=' + url);
      if (output.data.status === 'COMPLETED') {
        const result = await axios.get(
          '/api/imageresults?url=' + output.data.response_url
        );
        console.log('Result images:', result.data.images);
        setResultImages(result.data.images);

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

  const suggestPromptMultiImages = async (uploadedUrls) => {
    if (!uploadedUrls || uploadedUrls.length === 0) {
      alert('No images have been uploaded!');
      return [];
    }

    const prompts = [];

    for (const imageUrl of uploadedUrls) {
      console.log('Processing image URL:', imageUrl);
      try {
        const rawPrompt = await axios.post(
          '/api/extractSubject?imageLink=' + imageUrl + `&user=${user.id}`
        );
        console.log('Raw prompt response:', rawPrompt.data);

        if (!rawPrompt.data.status_url) {
          console.error('No status URL received from extractSubject API');
          continue;
        }

        // Poll until we get the result
        let attempts = 0;
        let output;
        while (attempts < 10) {
          // Maximum 10 attempts
          output = await axios.get(
            '/api/imageresults?url=' + rawPrompt.data.status_url
          );
          console.log(
            'Image processing results (attempt ' + (attempts + 1) + '):',
            output.data
          );

          if (output.data.status === 'COMPLETED' && output.data.response_url) {
            const result = await axios.get(
              '/api/imageresults?url=' + output.data.response_url
            );
            console.log('Final image processing result:', result.data);

            if (result.data.output) {
              let promptText;
              if (Array.isArray(result.data.output)) {
                promptText = result.data.output.join('');
                // Only remove quotes if they exist at start and end
                if (promptText.startsWith('"') && promptText.endsWith('"')) {
                  promptText = promptText.slice(1, -1);
                }
              } else {
                promptText = result.data.output;
              }
              console.log('Generated prompt text:', promptText);
              prompts.push(promptText);
            }
            break;
          }

          // Wait 3 seconds before next attempt
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
        }

        if (!output?.data?.status === 'COMPLETED') {
          console.error(
            'Failed to process image after all attempts for image:',
            imageUrl
          );
        }
      } catch (error) {
        console.error('Error processing image:', imageUrl, error);
      }
    }

    // Send prompts to anyLlm API and poll for result
    try {
      const response = await axios.post('/api/anyLlm', null, {
        params: {
          promptArray: prompts.join(', '),
          user: user.id
        }
      });
      console.log('Initial AnyLlm API Response:', response.data);

      // Poll until we get the final result
      let attempts = 0;
      let output;
      while (attempts < 10) {
        // Maximum 10 attempts
        output = await axios.get(
          '/api/imageresults?url=' + response.data.status_url
        );
        console.log('AnyLlm poll attempt ' + (attempts + 1) + ':', output.data);

        if (output.data.status === 'COMPLETED') {
          const result = await axios.get(
            '/api/imageresults?url=' + output.data.response_url
          );
          console.log('Final AnyLlm result:', result.data);
          setBackgroundPrompt(result.data.output);
          return result.data;
        }

        // Wait 3 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
      }

      console.log('Failed to get AnyLlm result after all attempts');
      return prompts;
    } catch (error) {
      console.error('Error with AnyLlm API:', error);
      return prompts;
    }
  };

  const getPromptResults = async (url) => {
    const output = await axios.get('/api/captionresults?url=' + url);
    if (output.data.status === 'succeeded') {
      setPromptStatus(output.data.status);
      const result = output.data.output;
      if (result) {
        console.log('caption result: ', result);
        const joinedPrompt = result.join('');
        const joinedPromptWithoutQuotes = joinedPrompt.slice(1, -1);
        console.log(joinedPromptWithoutQuotes);
        setBackgroundPrompt(joinedPromptWithoutQuotes);
        setPromptStatus(null);
      } else {
        alert('nothing generated');
      }
    }
  };

  useEffect(() => {
    if (promptStatus) {
      intervalPrompt.current = setInterval(() => {
        console.log(promptStatus);
        getPromptResults(promptObject.data.urls.get);
      }, 3000);
    }
    return () => clearInterval(intervalPrompt.current);
  }, [promptStatus]);

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
    }
  }, [user, isLoadingUser]);

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
    return (
      <div className={styles['get-image-button']}>
        <br />
        {!isGeneratingBGImages && (
          <div className="flex flex-col items-center p-2">
            <div className={styles['image-card']}>
              <p className="text-black sm:text-center">
                Upload your product images below
              </p>
              <div className={styles['image-top']}></div>
              <div
                className={styles['drag-area']}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                {isDragging ? (
                  <span className={styles['select']}>Drop files here</span>
                ) : (
                  <>
                    Drag & Drop images here or{' '}
                    <span
                      className={styles['select']}
                      role="button"
                      onClick={selectFiles}
                    >
                      Browse
                    </span>
                  </>
                )}

                <input
                  name="file"
                  type="file"
                  className={styles['file']}
                  multiple
                  ref={fileInputRef}
                  onChange={onFileSelect}
                ></input>
              </div>

              {uploadedImages.length > 0 && (
                <div className={styles['image-container']}>
                  {uploadedImages.map((images, index) => (
                    <div className={styles['image']} key={index}>
                      <span
                        className={styles['delete']}
                        onClick={() => deleteImage(index)}
                      >
                        &times;
                      </span>
                      <Image
                        src={images.url}
                        alt={images.name}
                        width={300}
                        height={200}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={uploadImages}
                className="mt-4 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90 px-4 py-2 rounded"
              >
                Upload Images
              </button>
            </div>

            {isImageUploaded && (
              <>
                <p className="text-black sm:text-center mt-8">
                  No idea what content to generate? Click 'Generate Prompt' for
                  some ideas.
                </p>
                <Button
                  className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                  variant="slim"
                  onClick={async () => {
                    const generatedPrompts =
                      await suggestPromptMultiImages(uploadedUrls);
                    console.log('Generated prompts:', generatedPrompts);
                  }}
                >
                  Generate Prompt
                </Button>
                <br></br>
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
                  className="mt-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                  variant="slim"
                  onClick={async () => {
                    if (
                      backgroundPrompt == null ||
                      backgroundPrompt.trim() == '' ||
                      isImageUploaded == false
                    ) {
                      alert('Please enter all prompts and upload your images!');
                    } else {
                      clearInterval(intervalImage.current);
                      setBackgroundImagePredictions({});
                      setBackgroundImageList([]);
                      setisBGImagesLoading(true);
                      setFinishMessage('');
                      for (let i = 0; i < ATTEMPTS; i++) {
                        await getImage(i, backgroundPrompt);
                      }
                      // Clear states after generation
                      setBackgroundPrompt('');
                      setUploadedImages([]);
                      setIsImageUploaded(false);
                      setUploadedUrls([]);
                    }
                  }}
                >
                  Generate Image
                </Button>
              </>
            )}
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
  }

  return (
    <section className="bg-white mb-32">
      <p className="text-black sm:text-center">
        Heads up! brandpix.ai is moving out of beta and will soon become a paid
        service.
      </p>
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
            Pix Blender
          </h1>
          <br></br>
          <br></br>
          <p className="text-black sm:text-center">
            Our most flexible option: Combine multiple product images into one.
          </p>
          <p className="text-black sm:text-center">
            <strong>For Best Results:</strong> Avoid uploading images with
            <strong> labels</strong>, <strong>text</strong>, or highly detailed
            patterns, as these might not merge smoothly in the final image.
          </p>
          <br />
          {subscribedAndModelChosen()}
        </div>
      </div>
    </section>
  );
}
