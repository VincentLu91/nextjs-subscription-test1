import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { postData, CreditBadge, useCreditsFetcher } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import { STYLE_PRESET_PROMPTS } from '../lib/stylePresetPrompts';

const ATTEMPTS = 1;
const CDNURL = process.env.NEXT_PUBLIC_CDNURL;

export default function GenerateImages() {
  const [loading, setLoading] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [productImageIndex, setProductImageIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [promptObject, setPromptObject] = useState(null);
  const [promptStatus, setPromptStatus] = useState(null);
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);
  const [selectedImageSize, setSelectedImageSize] = useState('square_hd');
  const [stylePreset, setStylePreset] = useState('None');
  const [stylePrompt, setStylePrompt] = useState('None');

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

  const { numTokens, numTieredTokens, isCreditsLoading, fetchCredits } =
    useCreditsFetcher(user, 'image_tokens');

  console.log('isGeneratingBlenderImg=', isGeneratingBlenderImg);

  const intervalPrompt = useRef();
  const intervalImage = useRef();

  const clearUserData = () => {
    // Clear state
    setUploadedImages([]);
    setProductImageIndex(null);
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
      sessionStorage.removeItem(`pixBlenderPredictions_${user.id}`);
      sessionStorage.removeItem(`resultImages_${user.id}`);
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

    // ✅ Restore pixBlenderPredictions from sessionStorage
    const savedPredictions = sessionStorage.getItem(
      `pixBlenderPredictions_${user.id}`
    );
    const savedResultImages = sessionStorage.getItem(`resultImages_${user.id}`);

    if (savedPredictions) {
      const predictions = JSON.parse(savedPredictions);
      setPixBlenderPredictions(predictions);

      // ✅ Only resume loading if we *don't* already have finished results
      if (!savedResultImages) {
        const list = Object.values(predictions);
        const isFinished =
          list.length > 0 &&
          list.every(
            (item) => item.status === 'COMPLETED' || item.status === 'ERROR'
          );

        if (!isFinished) {
          setIsGeneratingBlenderImg(true);
          setIsBlenderImgLoading(true);
        }
      } else {
        setIsGeneratingBlenderImg(false);
        setIsBlenderImgLoading(false);
      }
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

    setProductImageIndex((currentIndex) => {
      if (currentIndex === null) return null;

      // If the deleted image was the selected product, clear the selection.
      if (currentIndex === index) return null;

      // If an image before the selected product was deleted, shift index left.
      if (currentIndex > index) return currentIndex - 1;

      return currentIndex;
    });

    // Reset the generate attempt state to allow fresh generation
    setHasAttemptedGenerate(false);

    // If no images left, clean up sessionStorage
    if (newImages.length === 0) {
      sessionStorage.removeItem('pixBlenderUploadedImages');
    }
  }

  function selectProductImage(index) {
    setProductImageIndex(index);
    setHasAttemptedGenerate(false);
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

      // First URL is the selected Product image; the rest are references
      const productImageUrl = urls[0];
      const referenceImageUrls = urls.slice(1);

      // Send images to API
      const resp = await axios.post('/api/blendImages', {
        prompt: pixBlenderPrompt,
        images: urls, // keep for backwards compatibility
        productImageUrl,
        referenceImageUrls,
        user: user.id,
        image_size: selectedImageSize,
        stylePrompt: stylePrompt
      });

      setPixBlenderPredictions((state) => {
        const newState = {
          ...state,
          [attempt]: resp.data
        };
        // ✅ Store predictions in sessionStorage
        if (user?.id) {
          sessionStorage.setItem(
            `pixBlenderPredictions_${user.id}`,
            JSON.stringify(newState)
          );
        }
        return newState;
      });
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
              // ✅ Store result images in sessionStorage
              if (user?.id) {
                sessionStorage.setItem(
                  `resultImages_${user.id}`,
                  JSON.stringify(newImages)
                );
              }
              return newImages;
            });

            setPixBlenderPredictions((state) => {
              const newState = {
                ...state,
                [attempt]: {
                  ...state[attempt],
                  status: 'COMPLETED',
                  images: result.data.images
                }
              };
              // ✅ Store predictions in sessionStorage
              if (user?.id) {
                sessionStorage.setItem(
                  `pixBlenderPredictions_${user.id}`,
                  JSON.stringify(newState)
                );
              }
              return newState;
            });

            return result.data.images;
          } else {
            throw new Error('No images received in response');
          }
        } catch (resultError) {
          console.error('Error fetching result images:', resultError);
          setPixBlenderPredictions((state) => {
            const newState = {
              ...state,
              [attempt]: {
                ...state[attempt],
                status: 'ERROR',
                error: resultError.message
              }
            };
            // ✅ Store predictions in sessionStorage even on error
            if (user?.id) {
              sessionStorage.setItem(
                `pixBlenderPredictions_${user.id}`,
                JSON.stringify(newState)
              );
            }
            return newState;
          });
        }
      } else if (output.data.status === 'ERROR') {
        throw new Error(output.data.error || 'Image generation failed');
      }
      // If not completed or error, return empty array to continue polling
      return [];
    } catch (error) {
      console.error('Error in getImageResults:', error.message);
      setPixBlenderPredictions((state) => {
        const newState = {
          ...state,
          [attempt]: {
            ...state[attempt],
            status: 'ERROR',
            error: error.message
          }
        };
        // ✅ Store predictions in sessionStorage even on error
        if (user?.id) {
          sessionStorage.setItem(
            `pixBlenderPredictions_${user.id}`,
            JSON.stringify(newState)
          );
        }
        return newState;
      });
      return [];
    }
  };

  const suggestPromptMultiImages = async () => {
    if (uploadedImages.length === 0) {
      alert('Please add some images first!');
      return [];
    }

    const prompts = [];

    const selectedProductImage = uploadedImages[productImageIndex];

    for (const image of [selectedProductImage]) {
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

  // Initial load and whenever subscription presence changes
  useEffect(() => {
    if (user) fetchCredits('mount/user', { silent: true });
  }, [user, subscription]);

  useEffect(() => {
    const onFocus = () => fetchCredits('focus', { silent: true });
    const onVisible = () =>
      document.visibilityState === 'visible' &&
      fetchCredits('visible', { silent: true });
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  useEffect(() => {
    if (!isGeneratingBlenderImg) return;
    const id = setInterval(
      () => fetchCredits('gen-poll', { silent: true }),
      3000
    );
    return () => clearInterval(id);
  }, [isGeneratingBlenderImg]);

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

        // Use user.id for consistency with OAuth and Supabase auth
        const { data: insertData, error: insertError } = await supabase
          .from('photos')
          .insert({
            customer_id: user.id,
            photo_url: data.publicUrl
          });

        if (insertError) {
          console.error('Error inserting photo to database:', insertError);
          alert(`Failed to save photo to gallery: ${insertError.message}`);
          continue;
        } else {
          console.log('Successfully inserted photo:', insertData);
        }

        const userKey = `pixblenderImages_${user.id}`;
        const localPhotos = sessionStorage.getItem(userKey);
        const localPhotosJson = localPhotos ? JSON.parse(localPhotos) : [];
        localPhotosJson.push(data.publicUrl);
        sessionStorage.setItem(userKey, JSON.stringify(localPhotosJson));

        setPixBlenderImageList((current) => [
          ...current,
          { url: data.publicUrl, text: '' }
        ]);

        // Update credits after successful image addition
        await fetchCredits('post-insert', { silent: true });
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
            `${completed} image${completed > 1 ? 's' : ''} generated and saved to gallery (available in paid plans).${
              failed > 0
                ? `\n${failed} generation${failed > 1 ? 's' : ''} failed.`
                : ''
            }\nClick thumbnail below to view your image and generate video.`
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
    let mounted = true;

    const predictionAry = Object.entries(pixBlenderPredictions).filter(
      ([attempt, item]) =>
        item.status !== 'COMPLETED' && item.status !== 'ERROR'
    );

    // ✅ Only start polling if we have pending predictions AND no results yet AND we're generating
    if (
      predictionAry.length > 0 &&
      isGeneratingBlenderImg &&
      resultImages.length === 0
    ) {
      // Clear any existing interval
      if (intervalImage.current) {
        clearInterval(intervalImage.current);
      }

      // Set maximum polling duration (5 minutes)
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 5 * 60 * 1000;

      intervalImage.current = setInterval(() => {
        if (!mounted) return;

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
      mounted = false;
      if (intervalImage.current) {
        clearInterval(intervalImage.current);
      }
    };
    // ✅ Add resultImages.length to deps to stop polling when results arrive
  }, [pixBlenderPredictions, isGeneratingBlenderImg, resultImages.length]);

  useEffect(() => {
    const initializeAndCheckStatus = async () => {
      if (!user) return;

      try {
        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
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

  const download = (url) => {
    saveAs(url, 'image');
  };

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    sessionStorage.setItem(`imageLink_${user.id}`, url);
    router.push('/view-image');
  };

  const goGenerateVideo = (url) => {
    setImageLink(url);
    sessionStorage.setItem(`imageLink_${user.id}`, url);
    router.push('/image-to-video?show=true');
  };

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Generate Images</h1>

          {/* Credits Badge with Tooltip */}
          <div className="relative">
            <CreditBadge
              user={user}
              numTokens={numTokens}
              numTieredTokens={numTieredTokens}
              isCreditsLoading={isCreditsLoading}
              hasNoSubscription={hasNoSubscription}
            />
          </div>
        </div>

        {/* Buy Credits Button - Show when tokens <= 5 and user has active subscription */}
        {(numTokens <= 5 || numTieredTokens <= 5) && ( // should work for free and paid users
          <div className="flex justify-center mb-8">
            <Link href="/buy-credits">
              <button className="px-8 py-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white font-semibold transition-all duration-200 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105">
                {!hasNoSubscription
                  ? 'Buy Additional Credits'
                  : 'Buy Credits to start generating images'}
              </button>
            </Link>
          </div>
        )}

        <p className="text-[#A1A1AA] mb-6">
          Upload your product photo (at least one) and reference images
          (optional).
        </p>
        <p className="text-[#A1A1AA] mb-6">
          Reference photos include scenes, styles, compositions, humans, or
          other visual elements.
        </p>
        <p className="text-[#A1A1AA] mb-6">
          No reference images? That’s okay — you can still generate with a
          preset look.
        </p>
        {/*<p className="text-white mb-6 font-bold">
          If your product has logos or labels, we recommend you to{' '}
          <Link
            href="/replace-bg"
            className="text-blue-500 underline hover:text-blue-400"
          >
            replace backgrounds
          </Link>
          .
        </p>*/}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Upload Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Upload Images & Choose Style
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
                    : 'Add your product photo first. Then add optional style references.'}
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
                      <button
                        type="button"
                        onClick={() => selectProductImage(index)}
                        className={`absolute bottom-2 left-2 z-10 rounded-full px-2 py-1 text-xs font-semibold ${
                          productImageIndex === index
                            ? 'bg-purple-600 text-white'
                            : 'bg-black bg-opacity-60 text-white hover:bg-opacity-80'
                        }`}
                      >
                        {productImageIndex === index
                          ? 'Product'
                          : 'Set as product'}
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
              <br />
              <div className="space-y-4">
                <p>Choose a look:</p>
                <select
                  value={stylePreset}
                  onChange={(e) => {
                    const selectedKey = e.target.value;
                    setStylePreset(selectedKey);
                    setStylePrompt(
                      selectedKey === 'None'
                        ? 'None'
                        : STYLE_PRESET_PROMPTS[selectedKey]
                    );
                  }}
                  className="w-full p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                >
                  <option value="None">None</option>
                  {Object.keys(STYLE_PRESET_PROMPTS).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Prompt Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              DESCRIBE & GENERATE
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <div className="space-y-4">
                  <p>Select Aspect Ratio</p>
                  <select
                    value={selectedImageSize}
                    onChange={(e) => setSelectedImageSize(e.target.value)}
                    className="w-full p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                  >
                    <option value="auto">Default</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                  <button
                    onClick={suggestPromptMultiImages}
                    className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      uploadedImages.length === 0 || isGeneratingBlenderImg
                    }
                  >
                    Need Help? Generate Prompt
                  </button>
                  <textarea
                    value={pixBlenderPrompt || ''}
                    onChange={handleChange}
                    placeholder="Describe the scene or style you want..."
                    className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                  />
                </div>

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

                      // Check if the selected product image actually contains a product
                      try {
                        let hasProduct = false;
                        for (const image of uploadedImages) {
                          const response = await fetch(image.url);
                          const blob = await response.blob();
                          const fileExt = image.name
                            .split('.')
                            .pop()
                            .toLowerCase();
                          const filePath = `${user.id}/${uuidv4()}.${fileExt}`;

                          const { data, error } = await supabase.storage
                            .from('images')
                            .upload(filePath, blob);

                          if (error) continue;

                          const { data: publicUrlData } = supabase.storage
                            .from('images')
                            .getPublicUrl(filePath);

                          if (!publicUrlData) continue;

                          const productCheck = await axios.post(
                            '/api/isProduct',
                            {
                              imageLink: publicUrlData.publicUrl,
                              user: user.id,
                              prompt:
                                'Does this image have a product - no animals or humans - just a standalone product? Please respond with only yes or no'
                            }
                          );

                          let attempts = 0;
                          while (attempts < 10) {
                            const output = await axios.get(
                              '/api/captionresults?url=' +
                                productCheck.data.urls.get
                            );
                            if (output.data.status === 'succeeded') {
                              const result = output.data.output;
                              if (result && result.length > 0) {
                                const response = result
                                  .join('')
                                  .toLowerCase()
                                  .trim();
                                if (response === 'yes') {
                                  hasProduct = true;
                                }
                              }
                              break;
                            }
                            attempts++;
                            await new Promise((resolve) =>
                              setTimeout(resolve, 2000)
                            );
                          }
                        }

                        if (!hasProduct) {
                          alert(
                            'The image marked as Product does not look like a standalone product. Please choose the product image before generating.'
                          );
                          return;
                        }
                      } catch (error) {
                        console.error('Error checking images:', error);
                      }

                      try {
                        // Clear all intervals and states
                        clearInterval(intervalImage.current);
                        setPixBlenderPredictions({});
                        setPixBlenderImageList([]); // Clear previous images
                        setResultImages([]); // Clear result images
                        setIsBlenderImgLoading(true);
                        setFinishMessage('');

                        // Get stored photos before clearing storage
                        const userKey = `pixblenderImages_${user.id}`;
                        const photos = JSON.parse(
                          sessionStorage.getItem(userKey) || '[]'
                        );

                        // Clear all relevant session storage
                        sessionStorage.removeItem(userKey);
                        sessionStorage.removeItem(
                          `pixBlenderPredictions_${user.id}`
                        );
                        sessionStorage.removeItem(`resultImages_${user.id}`);
                        photos.forEach((url) => {
                          const imageKey = `imageLink_${user.id}_${url}`;
                          sessionStorage.removeItem(imageKey);
                        });

                        console.log(
                          'setIsGeneratingBlenderImg set TRUE 920---'
                        );
                        setIsGeneratingBlenderImg(true);
                        if (
                          uploadedImages.length > 0 &&
                          productImageIndex === null
                        ) {
                          alert(
                            'Please choose which uploaded image is the product first.'
                          );
                          return;
                        }
                        // Put the selected product image first, then treat the rest as references
                        // Upload order does not matter.
                        // The user-selected Product image is moved first only for the generation payload.
                        if (productImageIndex === null) {
                          alert('Select which image is the product first.');
                          return;
                        }

                        const imagesForGeneration = [
                          uploadedImages[productImageIndex],
                          ...uploadedImages.filter(
                            (_, index) => index !== productImageIndex
                          )
                        ];

                        // Process all images at once
                        for (let i = 0; i < ATTEMPTS; i++) {
                          const result = await getImage(
                            i,
                            pixBlenderPrompt,
                            imagesForGeneration
                          );
                          if (!result) return; // Stop if there was an error
                        }

                        // Clear uploaded images after successful generation
                        setUploadedImages([]);
                        setProductImageIndex(null);
                        setHasAttemptedGenerate(false); // Reset since we're starting fresh
                        await fetchCredits('post-gen', { silent: true });
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
                      uploadedImages.length === 0 ||
                      productImageIndex === null
                    }
                    className={`w-full h-12 rounded-lg font-semibold text-white transition-all duration-200 motion-reduce:transition-none motion-reduce:animation-none ${
                      isGeneratingBlenderImg ||
                      uploadedImages.length === 0 ||
                      productImageIndex === null
                        ? 'bg-[#4A4A4A] cursor-not-allowed'
                        : 'bg-[#8256FF] hover:bg-[#6F48DB] animate-button-shadow'
                    }`}
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
                  className="relative rounded-lg overflow-hidden bg-[#181818] p-4"
                >
                  <div
                    className="cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                    onClick={() => viewGeneratedContent(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                  <div className="space-y-3 mt-4">
                    <div className="flex gap-3">
                      <Button
                        variant="slim"
                        onClick={() => viewGeneratedContent(image.url)}
                        className="flex-1 bg-[#8256FF] text-white hover:bg-[#6F48DB] border-[#8256FF] hover:border-[#6F48DB] hover:opacity-90"
                      >
                        Caption
                      </Button>
                      <Button
                        variant="slim"
                        onClick={() => download(image.url)}
                        className="flex-1 bg-[#943bdc] text-white hover:bg-[#7c32b8] border-[#943bdc] hover:border-[#7c32b8] hover:opacity-90"
                      >
                        Download
                      </Button>
                    </div>
                    <Button
                      variant="slim"
                      onClick={() => goGenerateVideo(image.url)}
                      className="w-full bg-[#8256FF] text-white hover:bg-[#6F48DB] border-[#8256FF] hover:border-[#6F48DB] hover:opacity-90"
                    >
                      Animate Product Image to Video
                    </Button>
                  </div>
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
