import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';

const ATTEMPTS = 1;
const CDNURL = process.env.NEXT_PUBLIC_CDNURL;

export default function GenerateImages() {
  const [loading, setLoading] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(12);
  const [photoData, setPhotoData] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [promptObject, setPromptObject] = useState(null);
  const [promptStatus, setPromptStatus] = useState(null);
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);

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
    pixBlenderImageList,
    setPixBlenderImageList,
    isBlenderImgLoading,
    setIsBlenderImgLoading,
    pixBlenderPrompt,
    setPixBlenderPrompt,
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
    pixBlenderPredictions,
    setPixBlenderPredictions,
    isGeneratingBlenderImg,
    setIsGeneratingBlenderImg
  } = useUser();

  console.log('isGeneratingBlenderImg=', isGeneratingBlenderImg);

  const intervalPrompt = useRef();
  const intervalImage = useRef();

  const clearUserData = () => {
    // Clear state
    setUploadedImages([]);
    setImageForBg(null);
    setPixBlenderImageList([]);
    setPixBlenderPredictions({});
    setImageFile(null);
    setImageFileName('');
    setIsImageUploaded(false);
    setPixBlenderPrompt('');
    setFinishMessage('');
    setIsGeneratingBlenderImg(false); // this ensures when signed out, button will revert back

    // Clear sessionStorage for current user if exists
    if (user?.id) {
      sessionStorage.removeItem(`pixblenderImages_${user.id}`);
      sessionStorage.removeItem(`uploadedFilePath_${user.id}`);
      sessionStorage.removeItem(`imageLink_${user.id}`);
    }
  };

  // Clear other user data from sessionStorage
  const clearOtherUserData = () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        (key.startsWith('generatedPhotos_') ||
          key.startsWith('uploadedFilePath_') ||
          key.startsWith('imageLink_')) &&
        !key.endsWith(user?.id || '')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  };

  // Load user's data from sessionStorage
  const loadUserData = () => {
    if (!user?.id) return;

    const userKey = `pixblenderImages_${user.id}`;
    const savedPhotos = sessionStorage.getItem(userKey);
    if (savedPhotos) {
      const photos = JSON.parse(savedPhotos);
      setPixBlenderImageList(photos.map((url) => ({ url, text: '' })));
    } else {
      setPixBlenderImageList([]);
    }

    /*const savedFilePath = sessionStorage.getItem(`uploadedFilePath_${user.id}`);
    if (savedFilePath) {
      setUploadedFilePath(savedFilePath); // not sure
      setIsImageUploaded(true);
    } else {
      setUploadedFilePath('');
      setIsImageUploaded(false);
    }*/
  };

  // Update isImageUploaded based on uploadedImages length
  useEffect(() => {
    setIsImageUploaded(uploadedImages.length > 0);
  }, [uploadedImages]);

  function selectFiles() {
    fileInputRef.current.click();
  }

  function onFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    setHasAttemptedGenerate(false);
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
    // Reset the generate attempt state to allow fresh generation
    setHasAttemptedGenerate(false);

    // If no images left, clean up sessionStorage
    if (newImages.length === 0) {
      sessionStorage.removeItem('pixBlenderUploadedImages');
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
    setHasAttemptedGenerate(false);
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

  const getImage = async (attempt, pixBlenderPrompt, imagesToProcess) => {
    try {
      setResultImages([]);
      const urls = [];

      // Upload all images to Supabase
      for (const image of imagesToProcess) {
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
          throw new Error(`Failed to upload image: ${error.message}`);
        }
      }

      if (urls.length === 0) {
        throw new Error('No images were successfully uploaded');
      }

      // Send images to API
      const resp = await axios.post('/api/fluxUno', {
        prompt: pixBlenderPrompt,
        images: urls,
        user: user.id
      });

      setPixBlenderPredictions((state) => ({
        ...state,
        [attempt]: resp.data
      }));
      console.log('setIsGeneratingBlenderImg set TRUE 240---');
      setIsGeneratingBlenderImg(true);
      return resp.data;
    } catch (error) {
      console.error('Error in getImage:', error);
      alert(error.message);
      setIsGeneratingBlenderImg(false);
      setIsBlenderImgLoading(false);
      return null;
    }
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
      const output = await axios.get(
        '/api/imageresults?url=' + encodeURIComponent(url)
      );

      if (output.data.status === 'COMPLETED') {
        try {
          const result = await axios.get(
            '/api/imageresults?url=' +
              encodeURIComponent(output.data.response_url)
          );

          if (result.data.images && result.data.images.length > 0) {
            console.log('Result images:', result.data.images);

            // Update results using functional update to ensure we have latest state
            setResultImages((prevImages) => {
              const newImages = [...result.data.images];
              return newImages;
            });

            setPixBlenderPredictions((state) => ({
              ...state,
              [attempt]: {
                ...state[attempt],
                status: 'COMPLETED',
                images: result.data.images
              }
            }));

            return result.data.images;
          } else {
            throw new Error('No images received in response');
          }
        } catch (resultError) {
          console.error('Error fetching result images:', resultError);
          setPixBlenderPredictions((state) => ({
            ...state,
            [attempt]: {
              ...state[attempt],
              status: 'ERROR',
              error: resultError.message
            }
          }));
        }
      } else if (output.data.status === 'ERROR') {
        throw new Error(output.data.error || 'Image generation failed');
      }
      // If not completed or error, return empty array to continue polling
      return [];
    } catch (error) {
      console.error('Error in getImageResults:', error.message);
      setPixBlenderPredictions((state) => ({
        ...state,
        [attempt]: {
          ...state[attempt],
          status: 'ERROR',
          error: error.message
        }
      }));
      return [];
    }
  };

  const suggestPromptMultiImages = async () => {
    if (uploadedImages.length === 0) {
      alert('Please add some images first!');
      return [];
    }

    const prompts = [];

    for (const image of uploadedImages) {
      console.log('Processing image:', image.url);
      try {
        // Upload image to Supabase first
        const response = await fetch(image.url);
        const blob = await response.blob();
        const fileExt = image.name.split('.').pop().toLowerCase();
        const filePath = `${user.id}/${uuidv4()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('images')
          .upload(filePath, blob);

        if (error) {
          console.error('Failed to upload image:', error.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        if (!publicUrlData) {
          console.error('Failed to get public URL for image');
          continue;
        }

        const rawPrompt = await axios.post('/api/extractSubject', null, {
          params: {
            imageLink: publicUrlData.publicUrl,
            user: user.id
          }
        });
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
            image.url
          );
        }
      } catch (error) {
        console.error('Error processing image:', image.url, error);
      }
    }

    // Send prompts to anyLlm API and poll for result
    try {
      // Format prompts into a descriptive list
      const validPrompts = prompts.map((p) => p.trim()).filter(Boolean);
      if (validPrompts.length === 0) {
        throw new Error('No valid prompts generated from images');
      }

      // Create a descriptive list of subjects
      const subjectsList = validPrompts
        .map((p, i) => `${i + 1}. ${p}`)
        .join('\n');
      const promptInstruction = `I have the following subjects:\n${subjectsList}\n\nCreate a detailed prompt that describes how to combine all of these subjects into a single image. The prompt should specify how the subjects should be arranged and interact with each other in the scene. Focus on their spatial relationship and visual composition.`;

      const response = await axios.post('/api/anyLlm', null, {
        params: {
          promptArray: promptInstruction,
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
          setPixBlenderPrompt(result.data.output);
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
        setPixBlenderPrompt(joinedPromptWithoutQuotes);
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

        const userKey = `pixblenderImages_${user.id}`;
        const localPhotos = sessionStorage.getItem(userKey);
        const localPhotosJson = localPhotos ? JSON.parse(localPhotos) : [];
        localPhotosJson.push(data.publicUrl);
        sessionStorage.setItem(userKey, JSON.stringify(localPhotosJson));

        setPixBlenderImageList((current) => [
          ...current,
          { url: data.publicUrl, text: '' }
        ]);

        // Update token count after successful image addition
        await getImageTokenData();
      }
    }
  };

  useEffect(() => {
    const list = Object.values(pixBlenderPredictions);
    if (list.length > 0) {
      // Check if all attempts are either completed or errored
      const isFinished = list.every(
        (item) => item.status === 'COMPLETED' || item.status === 'ERROR'
      );

      if (isFinished) {
        console.log('Background image predictions:', pixBlenderPredictions);
        clearInterval(intervalImage.current);
        setIsBlenderImgLoading(false);
        setIsGeneratingBlenderImg(false);

        // Count successful and failed attempts
        const completed = list.filter(
          (item) => item.status === 'COMPLETED'
        ).length;
        const failed = list.filter((item) => item.status === 'ERROR').length;

        if (completed > 0) {
          setFinishMessage(
            `${completed} image${completed > 1 ? 's' : ''} generated and saved to gallery.${
              failed > 0
                ? `\n${failed} generation${failed > 1 ? 's' : ''} failed.`
                : ''
            }\nPlease go to the Gallery page to see all your generated images.`
          );
        } else {
          setFinishMessage(
            'Image generation failed. Please try again with different images or prompt.'
          );
        }
      }
    }
  }, [pixBlenderPredictions]);

  useEffect(() => {
    if (resultImages) {
      console.log('resultImages: ', resultImages);
      addImages(resultImages);
    }
  }, [resultImages]);

  useEffect(() => {
    const predictionAry = Object.entries(pixBlenderPredictions).filter(
      ([attempt, item]) =>
        item.status !== 'COMPLETED' && item.status !== 'ERROR'
    );

    if (predictionAry.length > 0) {
      // Clear any existing interval
      if (intervalImage.current) {
        clearInterval(intervalImage.current);
      }

      // Set maximum polling duration (5 minutes)
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 5 * 60 * 1000;

      intervalImage.current = setInterval(() => {
        // Check if we've exceeded maximum polling duration
        if (Date.now() - startTime > MAX_POLLING_DURATION) {
          clearInterval(intervalImage.current);
          setIsBlenderImgLoading(false);
          setIsGeneratingBlenderImg(false);
          setFinishMessage('Image generation timed out. Please try again.');
          return;
        }

        predictionAry.forEach(([attempt, item]) => {
          if (item.status_url) {
            getImageResults(attempt, item.status_url);
          }
        });
      }, 3000);
    }

    return () => {
      if (intervalImage.current) {
        clearInterval(intervalImage.current);
      }
    };
  }, [pixBlenderPredictions]);

  useEffect(() => {
    const initializeAndCheckStatus = async () => {
      if (!user) return;

      try {
        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Show banner if no subscription exists
        setHasNoSubscription(!subscription);
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    initializeAndCheckStatus();

    // Handle auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        initializeAndCheckStatus();
        clearOtherUserData(); // Clear other user data when a new user logs in
        loadUserData(); // Load the new user's data
      } else {
        clearUserData(); // Clear all state and storage on logout
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(intervalPrompt.current);
      clearInterval(intervalImage.current);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFinishMessage('');
      setPixBlenderImageList([]);
      sessionStorage.removeItem('pixBlenderImageList');
    }
  }, [user]);

  useEffect(() => {
    setFinishMessage('');
  }, []);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
      clearUserData(); // Clear all state when no user
    } else if (user) {
      clearOtherUserData(); // Clear other user data when component mounts with a user
      loadUserData(); // Load the current user's data
    }
  }, [user, isLoadingUser]);

  // Save uploaded images to sessionStorage whenever they change
  useEffect(() => {
    if (uploadedImages.length > 0) {
      sessionStorage.setItem(
        'pixBlenderUploadedImages',
        JSON.stringify(uploadedImages)
      );
    } else {
      sessionStorage.removeItem('pixBlenderUploadedImages');
    }
  }, [uploadedImages]);

  const handleChange = (e) => {
    setPixBlenderPrompt(e.target.value);
    console.log('pixBlenderPrompt: ', e.target.value);
  };

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    sessionStorage.setItem(`imageLink_${user.id}`, url);
    router.push('/view-image');
  };

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Pix Blender</h1>

          {/* Credits Badge with Tooltip */}
          <div className="relative">
            {hasNoSubscription && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 bg-gradient-to-r from-[#423680] to-[#7B63FA] text-white text-sm font-semibold rounded-lg shadow-lg whitespace-nowrap">
                Need more credits? Start your free trial —{' '}
                <Link href="/pricing" className="underline hover:text-blue-200">
                  no card required
                </Link>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#7B63FA]"></div>
              </div>
            )}
            <div
              className={`inline-flex px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-colors duration-200 motion-reduce:transition-none
                ${numTokens <= 10 ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]' : 'bg-[#7B63FA] text-white ring-2 ring-[#7B63FA]'}`}
              aria-live="polite"
            >
              Credits {numTokens} / {numTieredTokens}
            </div>
          </div>
        </div>

        <p className="text-[#A1A1AA] mb-6">
          Our most flexible option: Combine multiple product images into one.
        </p>
        <p className="text-[#A1A1AA] mb-10">
          <strong>For Best Results:</strong> Avoid uploading images with labels,
          text, or highly detailed patterns, as these might not merge smoothly
          in the final image.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Upload Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Upload Images
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div
                className={`relative flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] border-2 border-dashed border-[#3F3F46] rounded-xl cursor-pointer transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none
                  ${isDragging ? 'scale-[1.03] shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={selectFiles}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={onFileSelect}
                />

                <svg
                  className="w-12 h-12 text-[#52525B] opacity-40 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>

                <p className="text-sm text-[#A1A1AA]">
                  {isDragging
                    ? 'Drop files here'
                    : 'Drag and drop your images here, or click to select'}
                </p>
              </div>

              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => deleteImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70"
                      >
                        &times;
                      </button>
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Prompt Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Image Description
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <button
                  onClick={suggestPromptMultiImages}
                  className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    uploadedImages.length === 0 || isGeneratingBlenderImg
                  }
                >
                  Generate Prompt
                </button>

                <textarea
                  value={pixBlenderPrompt || ''}
                  onChange={handleChange}
                  placeholder="Describe how you want to combine your images..."
                  className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <div className="space-y-2">
                  {uploadedImages.length === 0 &&
                    hasAttemptedGenerate &&
                    !isGeneratingBlenderImg && (
                      <p className="text-[#FF4444] text-sm">
                        Please upload at least one image
                      </p>
                    )}
                  <button
                    onClick={async () => {
                      setHasAttemptedGenerate(true);

                      if (uploadedImages.length === 0) {
                        return;
                      }

                      if (!pixBlenderPrompt?.trim()) {
                        alert('Please enter a prompt!');
                        return;
                      }

                      try {
                        clearInterval(intervalImage.current);
                        setPixBlenderPredictions({});
                        setPixBlenderImageList([]);
                        setIsBlenderImgLoading(true);
                        setFinishMessage('');
                        console.log(
                          'setIsGeneratingBlenderImg set TRUE 920---'
                        );
                        setIsGeneratingBlenderImg(true);

                        // Process all images at once
                        for (let i = 0; i < ATTEMPTS; i++) {
                          const result = await getImage(
                            i,
                            pixBlenderPrompt,
                            uploadedImages
                          );
                          if (!result) return; // Stop if there was an error
                        }

                        // Clear uploaded images after successful generation
                        setUploadedImages([]);
                        setHasAttemptedGenerate(false); // Reset since we're starting fresh
                        await getImageTokenData();
                      } catch (error) {
                        console.error('Error generating images:', error);
                        alert('Failed to generate images. Please try again.');
                        setIsGeneratingBlenderImg(false);
                        setIsBlenderImgLoading(false);
                      }
                    }}
                    disabled={
                      isGeneratingBlenderImg ||
                      !pixBlenderPrompt?.trim() ||
                      uploadedImages.length === 0
                    }
                    className={`w-full h-12 rounded-lg font-semibold text-white transition-all duration-200 motion-reduce:transition-none motion-reduce:animation-none ${uploadedImages.length === 0 ? 'bg-[#4A4A4A] cursor-not-allowed' : ''} ${isGeneratingBlenderImg ? 'bg-[#4A4A4A] cursor-not-allowed' : 'bg-[#8256FF] hover:bg-[#6F48DB] animate-button-shadow'}`}
                  >
                    {isGeneratingBlenderImg ? (
                      <span className="flex items-center justify-center">
                        Generating
                        <LoadingDots />
                      </span>
                    ) : (
                      'Generate Image'
                    )}
                  </button>
                </div>
              </div>

              {isBlenderImgLoading && (
                <div className="mt-4 text-[#A1A1AA]">
                  <p>Processing your request...</p>
                  <p className="text-sm">Please do not refresh the page</p>
                </div>
              )}

              {finishMessage && (
                <div className="mt-4 p-4 bg-[#1F1F1F] rounded-lg text-[#E4E4E7]">
                  {finishMessage}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Results Grid */}
        {pixBlenderImageList.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mt-10 mb-6">
              Your Generated Images
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {pixBlenderImageList.map((image, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  onClick={() => viewGeneratedContent(image.url)}
                >
                  <img
                    src={image.url}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes button-shadow {
          0% {
            box-shadow: 0 0 0 0 rgba(130, 86, 255, 0.45);
          }
          100% {
            box-shadow: 0 0 0 24px rgba(130, 86, 255, 0);
          }
        }
        .animate-button-shadow:not(:disabled):active {
          animation: button-shadow 400ms ease-out;
        }
      `}</style>
    </main>
  );
}
