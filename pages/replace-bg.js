import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/initSupabase';

const ATTEMPTS = 1;
const CDNURL = process.env.NEXT_PUBLIC_CDNURL;

export default function ReplaceBg() {
  // Preserve all existing state
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(12);
  const [photoData, setPhotoData] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [promptObject, setPromptObject] = useState(null);
  const [promptStatus, setPromptStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [selectedSize, setSelectedSize] = useState('square');

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

  // Clear all state and storage for current user
  const clearUserData = () => {
    // Clear state
    setUploadedFilePath('');
    setImageForBg(null);
    setBackgroundImageList([]);
    setBackgroundImagePredictions({});
    setImageFile(null);
    setImageFileName('');
    setIsImageUploaded(false);
    setBackgroundPrompt('');
    setFinishMessage('');

    // Clear sessionStorage for current user if exists
    if (user?.id) {
      sessionStorage.removeItem(`replacebgImages_${user.id}`);
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

    const userKey = `replacebgImages_${user.id}`;
    const savedPhotos = sessionStorage.getItem(userKey);
    if (savedPhotos) {
      const photos = JSON.parse(savedPhotos);
      setBackgroundImageList(photos.map((url) => ({ url, text: '' })));
    } else {
      setBackgroundImageList([]);
    }

    const savedFilePath = sessionStorage.getItem(`uploadedFilePath_${user.id}`);
    if (savedFilePath) {
      setUploadedFilePath(savedFilePath);
      setIsImageUploaded(true);
    } else {
      setUploadedFilePath('');
      setIsImageUploaded(false);
    }
  };

  // Preserve all existing functionality
  const getImage = async (attempt, backgroundPrompt) => {
    if (!uploadedFilePath) {
      console.error('No image file uploaded or file path missing');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }
    const { data: freshUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadedFilePath);

    if (!freshUrlData) {
      console.error('Could not get fresh URL for image');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }

    // Determine shot size based on selection
    let shotSize;
    switch (selectedSize) {
      case '16:9':
        shotSize = [563, 1000];
        break;
      case '9:16':
        shotSize = [1000, 563];
        break;
      default: // square
        shotSize = [1000, 1000];
    }

    const resp = await axios.get(
      '/api/modifyImage?prompt=' +
        backgroundPrompt +
        '&image=' +
        freshUrlData.publicUrl +
        `&user=${user.id}` +
        `&size=${JSON.stringify(shotSize)}`
    );
    setBackgroundImagePredictions((state) => ({
      ...state,
      [attempt]: resp.data
    }));
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
        setResultImages(result.data.images);

        setBackgroundImagePredictions((state) => ({
          ...state,
          [attempt]: { ...state[attempt], status: 'COMPLETED' }
        }));

        return result.data.images;
      } else if (output.data.status === 'FAILED') {
        setBackgroundImagePredictions((state) => ({
          ...state,
          [attempt]: {
            ...state[attempt],
            status: 'FAILED',
            error: output.data.error || 'Generation failed'
          }
        }));
        return [];
      }
    } catch (error) {
      console.error('Error in getImageResults:', error.message);
      setBackgroundImagePredictions((state) => ({
        ...state,
        [attempt]: { ...state[attempt], status: 'FAILED', error: error.message }
      }));
    }
    return [];
  };

  const suggestPromptReplicate = async (imageLink) => {
    if (!imageLink) {
      alert("You haven't uploaded an image or there is an error!");
    } else {
      const rawPrompt = await axios.post(
        '/api/suggestPrompt?imageLink=' + imageLink + `&user=${user.id}`
      );
      setPromptObject(rawPrompt);
      setPromptStatus(rawPrompt.data.status);
    }
  };

  const getPromptResults = async (url) => {
    const output = await axios.get('/api/captionresults?url=' + url);
    if (output.data.status === 'succeeded') {
      setPromptStatus(output.data.status);
      const result = output.data.output;
      if (result) {
        const joinedPrompt = result.join('');
        const joinedPromptWithoutQuotes = joinedPrompt.slice(1, -1);
        setBackgroundPrompt(joinedPromptWithoutQuotes);
        setPromptStatus(null);
      } else {
        alert('nothing generated');
      }
    }
  };

  const addImages = async (images) => {
    for (const imageObj of images) {
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

        // Update state and storage atomically
        const userKey = `replacebgImages_${user.id}`;
        setBackgroundImageList((current) => {
          const newList = [...current, { url: data.publicUrl, text: '' }];
          // Only update session storage if we're not in the middle of generating
          if (!isGeneratingBGImages) {
            sessionStorage.setItem(
              userKey,
              JSON.stringify(newList.map((img) => img.url))
            );
          }
          return newList;
        });

        await getImageTokenData();
      }
    }
  };

  // Preserve all existing useEffects
  useEffect(() => {
    if (promptStatus) {
      intervalPrompt.current = setInterval(() => {
        getPromptResults(promptObject.data.urls.get);
      }, 3000);
    }
    return () => clearInterval(intervalPrompt.current);
  }, [promptStatus]);

  useEffect(() => {
    const list = Object.values(backgroundImagePredictions);
    const isComplete =
      list.length > 0 &&
      list.every(
        (item) => item.status === 'COMPLETED' || item.status === 'FAILED'
      );

    if (isComplete) {
      clearInterval(intervalImage.current);
      setisBGImagesLoading(false);
      setisGeneratingBGImages(false);

      const hasSuccessfulGeneration = list.some(
        (item) => item.status === 'COMPLETED'
      );

      if (!hasSuccessfulGeneration) {
        const errors = list
          .filter((item) => item.status === 'FAILED')
          .map((item) => item.error)
          .filter(Boolean);

        setFinishMessage(
          errors.length > 0
            ? `Generation failed: ${errors.join('. ')}. Please try again.`
            : 'No images were generated. Please try again with a different prompt.'
        );
      }
    }
  }, [backgroundImagePredictions]);

  // Set success message after images are actually added and generation is complete
  useEffect(() => {
    const list = Object.values(backgroundImagePredictions);
    const isComplete =
      list.length > 0 &&
      list.every(
        (item) => item.status === 'COMPLETED' || item.status === 'FAILED'
      );

    if (isComplete && backgroundImageList.length > 0) {
      setFinishMessage(
        'Images are generated and saved to gallery. \n' +
          'Click thumbnail below to view your image and generate video.'
      );
    }
  }, [backgroundImageList, backgroundImagePredictions]);

  // Handle storage updates after images are added
  useEffect(() => {
    if (backgroundImageList.length > 0) {
      const userKey = `replacebgImages_${user.id}`;
      const currentList = backgroundImageList.map((img) => img.url);
      sessionStorage.setItem(userKey, JSON.stringify(currentList));
    }
  }, [backgroundImageList, user?.id]);

  useEffect(() => {
    if (resultImages) {
      addImages(resultImages);
    }
  }, [resultImages]);

  useEffect(() => {
    const predictionAry = Object.entries(backgroundImagePredictions).filter(
      ([attempt, item]) =>
        item.status !== 'COMPLETED' && item.status !== 'FAILED'
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
    if (!isLoadingUser && !user) {
      router.replace('/signin');
      clearUserData(); // Clear all state when no user
    } else if (user) {
      clearOtherUserData(); // Clear other user data when component mounts with a user
      loadUserData(); // Load the current user's data
    }
  }, [user, isLoadingUser]);

  useEffect(() => {
    if (user && isImageUploaded) {
      getFiles();
    }
  }, [user, isImageUploaded]);

  useEffect(() => {
    if (user) {
      getImageTokenData();
    }
  }, [user]);

  useEffect(() => {
    if (user && subscription) {
      getTieredImageData();
    }
  }, [user]);

  useEffect(() => {
    setFinishMessage('');
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  async function uploadFile(e) {
    let file = e.target.files[0];
    if (!file) return;

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
        setImageForBg(publicUrlData.publicUrl);
        setUploadedFilePath(filePath);
        sessionStorage.setItem(`uploadedFilePath_${user.id}`, filePath);
      }
      setIsImageUploaded(true);
      getFiles();
    } else {
      console.error('Error uploading file:', error);
      alert('Failed to upload image. Please try again.');
      setIsImageUploaded(false);
    }
  }

  async function getFiles() {
    const { data, error } = await supabase.storage
      .from('images')
      .getPublicUrl(uploadedFilePath);

    if (data) {
      setImageFile(data);
      setImageFileName(data.publicUrl);
    } else {
      alert('Error loading images');
      console.log(error);
    }
  }

  async function getImageTokenData() {
    const imageTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=image_tokens`
    );
    setNumTokens(imageTokenData.data);
  }

  async function getTieredImageData() {
    const imageTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}` + `&tokenType=image_tokens`
    );
    setNumTieredTokens(imageTieredData.data);
  }

  const handlePromptChange = (e) => {
    setBackgroundPrompt(e.target.value);
  };

  const handleGenerateClick = async () => {
    if (!backgroundPrompt?.trim() || !isImageUploaded) {
      alert('Please enter all prompts and upload your image!');
      return;
    }

    // Clear all intervals and states
    clearInterval(intervalImage.current);
    setBackgroundImagePredictions({});
    setBackgroundImageList([]); // Clear previous images
    setResultImages([]); // Clear result images

    // Get stored photos before clearing storage
    const userKey = `replacebgImages_${user.id}`;
    const photos = JSON.parse(sessionStorage.getItem(userKey) || '[]');

    // Clear all relevant session storage
    sessionStorage.removeItem(userKey);
    photos.forEach((url) => {
      const imageKey = `imageLink_${user.id}_${url}`;
      sessionStorage.removeItem(imageKey);
    });
    setisBGImagesLoading(true);
    setFinishMessage('');

    for (let i = 0; i < ATTEMPTS; i++) {
      getImage(i, backgroundPrompt);
    }
    await getImageTokenData();
  };

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Replace Background of Product</h1>

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
        <p>
          Upload one photo of your product. Describe the scene. Our
          eCommerce-trained AI generates studio-quality backgrounds
          automatically.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Upload Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Upload Image
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div
                className={`relative flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] border-2 border-dashed border-[#3F3F46] rounded-xl cursor-pointer transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none
                  ${dragActive ? 'scale-[1.03] shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={uploadFile}
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
                  Drag and drop your product image here, or click to select
                </p>
              </div>

              {imageForBg && (
                <div className="mt-4 relative rounded-lg overflow-hidden">
                  <img
                    src={imageForBg}
                    alt="Uploaded image"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Prompt Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Background Description
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                >
                  <option value="square">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">
                    9:16 (Portrait - perfect for animating TikTok/Reels)
                  </option>
                </select>

                <button
                  onClick={() => suggestPromptReplicate(imageForBg)}
                  className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!imageForBg}
                >
                  Generate Prompt
                </button>

                <textarea
                  value={backgroundPrompt || ''}
                  onChange={handlePromptChange}
                  onFocus={() => setTextareaFocused(true)}
                  onBlur={() => setTextareaFocused(false)}
                  placeholder="Describe the background you want..."
                  className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <button
                  onClick={handleGenerateClick}
                  disabled={
                    isGeneratingBGImages ||
                    !backgroundPrompt?.trim() ||
                    !isImageUploaded
                  }
                  className={`w-full h-12 rounded-lg font-semibold text-white transition-all duration-200 motion-reduce:transition-none motion-reduce:animation-none
                    ${
                      isGeneratingBGImages
                        ? 'bg-[#4A4A4A] cursor-not-allowed'
                        : 'bg-[#8256FF] hover:bg-[#6F48DB] animate-button-shadow'
                    }`}
                >
                  {isGeneratingBGImages ? (
                    <span className="flex items-center justify-center">
                      Generating
                      <LoadingDots />
                    </span>
                  ) : (
                    'Generate Image'
                  )}
                </button>
              </div>

              {isBGImagesLoading && (
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
        {backgroundImageList.length > 0 && (
          <>
            <h1 className="text-2xl font-bold mt-10 mb-6">
              Your Generated Images
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {backgroundImageList.map((image, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  onClick={() => {
                    setImageLink(image.url);
                    sessionStorage.setItem(`imageLink_${user.id}`, image.url);
                    router.push('/view-image');
                  }}
                >
                  <img
                    src={image.url}
                    alt={`Generated background ${index + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile Sticky CTA */}
      {textareaFocused && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-[#27272A] transform transition-transform duration-250 ease-out translate-y-0 md:hidden motion-reduce:transition-none">
          <button
            onClick={handleGenerateClick}
            disabled={
              isGeneratingBGImages ||
              !backgroundPrompt?.trim() ||
              !isImageUploaded
            }
            className="w-full h-14 bg-[#8256FF] rounded-lg font-semibold text-white disabled:bg-[#4A4A4A] disabled:cursor-not-allowed"
          >
            {isGeneratingBGImages ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      )}

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
