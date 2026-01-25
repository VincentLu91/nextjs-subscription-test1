import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '../components/UserContext';
import { CreditBadge, useCreditsFetcher } from '../utils/helpers';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import styles from '../styles/Home.module.css';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
const ATTEMPTS = 1;

export default function GenerateApparel() {
  // Keep all existing state and hooks
  const [loading, setLoading] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [visible, setVisible] = useState(5);
  const [finishMessage, setFinishMessage] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [resultImages, setResultImages] = useState([]);
  const [modelImagePath, setModelImagePath] = useState('');
  const [garmentImagePath, setGarmentImagePath] = useState('');
  const [modelImageUrl, setModelImageUrl] = useState('');
  const [garmentImageUrl, setGarmentImageUrl] = useState('');
  const [selectedOption, setSelectedOption] = useState('tops');
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const { numTokens, numTieredTokens, isCreditsLoading, fetchCredits } =
    useCreditsFetcher(user, 'image_tokens');

  // Initial load and whenever subscription presence changes
  useEffect(() => {
    if (user) fetchCredits('mount/user', { silent: true });
  }, [user, subscription]);

  // Refresh credits on window focus and visibility change
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

  // Poll for credits while generating
  useEffect(() => {
    if (!isGeneratingTryOn) return;
    const id = setInterval(
      () => fetchCredits('gen-poll', { silent: true }),
      3000
    );
    return () => clearInterval(id);
  }, [isGeneratingTryOn]);

  const clearUserData = () => {
    // Clear state
    setModelImagePath('');
    setGarmentImagePath('');
    //setImageForBg(null);
    setTryOnImageList([]);
    setTryOnPredictions({});
    setImageFile(null);
    setImageFileName('');
    setIsImageUploaded(false);
    setFinishMessage('');

    // Clear sessionStorage for current user if exists
    if (user?.id) {
      sessionStorage.removeItem(`apparelImages_${user.id}`);
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

    const userKey = `apparelImages_${user.id}`;
    const savedPhotos = sessionStorage.getItem(userKey);
    if (savedPhotos) {
      const photos = JSON.parse(savedPhotos);
      setTryOnImageList(photos.map((url) => ({ url, text: '' })));
    } else {
      setTryOnImageList([]);
    }
  };

  // Keep all existing functions
  const getImage = async (attempt) => {
    if (!modelImagePath || !garmentImagePath) {
      console.error('Both model and garment images must be uploaded');
      setisGeneratingApparel(false);
      setisApparelLoading(false);
      return;
    }
    setResultImages([]);
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
    setIsGeneratingTryOn(true);
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
        setResultImages(result.data.images);
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
          customer_id: user.id,
          photo_url: data.publicUrl
        });

        const userKey = `apparelImages_${user.id}`;
        const localPhotos = sessionStorage.getItem(userKey);
        const localPhotosJson = localPhotos ? JSON.parse(localPhotos) : [];
        localPhotosJson.push(data.publicUrl);
        sessionStorage.setItem(userKey, JSON.stringify(localPhotosJson));

        setTryOnImageList((current) => [...current, { url: data.publicUrl }]);
        await fetchCredits('post-insert', { silent: true });
      }
    }
  };

  // Keep all existing useEffects
  useEffect(() => {
    const list = Object.values(tryOnPredictions);
    if (list.length > 0 && list.every((item) => item.status === 'COMPLETED')) {
      clearInterval(intervalImage.current);
      setIsGeneratingTryOn(false);
      setFinishMessage(
        'Image is generated and saved to gallery (available in paid plans).\n' +
          'Click thumbnail below to view your image and generate video.'
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
    if (!isLoadingUser && !user) {
      router.replace('/signin');
      clearUserData(); // Clear all state when no user
    } else if (user) {
      clearOtherUserData(); // Clear other user data when component mounts with a user
      loadUserData(); // Load the current user's data
    }
  }, [user, isLoadingUser]);

  async function uploadFile(e, type) {
    let file = e.target.files[0];
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

  async function getFiles() {
    const { data: modelData, error: modelError } = await supabase.storage
      .from('images')
      .getPublicUrl(modelImagePath);

    const { data: garmentData, error: garmentError } = await supabase.storage
      .from('images')
      .getPublicUrl(garmentImagePath);

    if (modelData != null) {
      setImageFile(modelData);
      setImageFileName(modelData.publicUrl);
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
      clearInterval(intervalImage.current);
    };
  }, [user]);

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

  useEffect(() => {
    setFinishMessage('');
  }, []);

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Clothes Swapping</h1>

          {/* Credits Badge */}
          <CreditBadge
            user={user}
            numTokens={numTokens}
            numTieredTokens={numTieredTokens}
            isCreditsLoading={isCreditsLoading}
            hasNoSubscription={hasNoSubscription}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Left Column - Preview Frame */}
          <div
            className={`w-full transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${mounted ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="w-full aspect-square mx-auto bg-[#181818] rounded-2xl border border-[rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {modelImageUrl ? (
                <img
                  src={modelImageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain rounded-2xl"
                  style={{ transition: 'opacity 400ms' }}
                />
              ) : (
                <svg
                  className="w-[120px] h-[120px] stroke-[rgba(255,255,255,0.12)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="8" r="4" strokeWidth="2" />
                  <path
                    d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {garmentImageUrl && (
                <img
                  src={garmentImageUrl}
                  alt="Garment thumbnail"
                  className="absolute bottom-5 right-5 w-24 h-24 object-contain rounded-xl border border-[rgba(255,255,255,0.08)] shadow-lg hover:scale-105 hover:ring-2 hover:ring-[#8B5CF6] transition-all duration-200"
                />
              )}
            </div>
          </div>

          {/* Right Column - Form Card */}
          <div
            className={`transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="grid gap-6">
                {/* Model Upload Dropzone */}
                <div>
                  <label className="block text-[14px] text-[rgba(255,255,255,0.6)] mb-2">
                    Upload Model Image (Person)
                  </label>
                  <div
                    className="h-[140px] border-2 border-dashed border-[#3F3F46] rounded-xl relative group transition-all duration-300 ease-in-out hover:border-[#8256FF] hover:bg-[rgba(130,86,255,0.08)]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const event = { target: { files: [file] } };
                        uploadFile(event, 'model');
                      }
                    }}
                    onClick={() =>
                      document.getElementById('modelFileInput').click()
                    }
                  >
                    <input
                      id="modelFileInput"
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={(e) => uploadFile(e, 'model')}
                      className="hidden"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <svg
                        className="w-12 h-12 text-[rgba(255,255,255,0.6)]"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
                        />
                      </svg>
                      <span className="mt-2 text-[14px] text-[rgba(255,255,255,0.6)]">
                        Drop your file here or click to upload
                      </span>
                    </div>
                  </div>
                </div>

                {/* Garment Upload Dropzone */}
                <div>
                  <label className="block text-[14px] text-[rgba(255,255,255,0.6)] mb-2">
                    Upload Clothing Piece
                  </label>
                  <div
                    className="h-[140px] border-2 border-dashed border-[#3F3F46] rounded-xl relative group transition-all duration-300 ease-in-out hover:border-[#8256FF] hover:bg-[rgba(130,86,255,0.08)]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove(
                        'border-[#8B5CF6]',
                        'bg-[rgba(139,92,246,0.08)]'
                      );
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const event = { target: { files: [file] } };
                        uploadFile(event, 'garment');
                      }
                    }}
                    onClick={() =>
                      document.getElementById('garmentFileInput').click()
                    }
                  >
                    <input
                      id="garmentFileInput"
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={(e) => uploadFile(e, 'garment')}
                      className="hidden"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <svg
                        className="w-12 h-12 text-[rgba(255,255,255,0.6)]"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
                        />
                      </svg>
                      <span className="mt-2 text-[14px] text-[rgba(255,255,255,0.6)]">
                        Drop your file here or click to upload
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Select */}
                <div>
                  <label className="block text-[14px] text-[rgba(255,255,255,0.6)] mb-2">
                    Category
                  </label>
                  <select
                    value={selectedOption}
                    onChange={handleOptionChange}
                    className="w-full h-12 bg-[#0F0F0F] border border-[#27272A] rounded-lg px-4 text-white focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                  >
                    <option value="tops">Top</option>
                    <option value="bottoms">Bottom</option>
                    <option value="one-pieces">Full-Body</option>
                  </select>
                </div>

                {/* Generate Button */}
                {!isGeneratingTryOn && (
                  <button
                    onClick={async () => {
                      if (!modelImagePath || !garmentImagePath) {
                        alert('Please upload both model and garment images!');
                      } else {
                        clearInterval(intervalImage.current);
                        setTryOnPredictions({});
                        setTryOnImageList([]);
                        setIsGeneratingTryOn(true);
                        setFinishMessage('');
                        fetchCredits('gen-start', { silent: true });
                        for (let i = 0; i < ATTEMPTS; i++) {
                          getImage(i);
                        }
                        await fetchCredits('post-mutation', { silent: true });
                      }
                    }}
                    className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Image
                  </button>
                )}

                {/* Loading & Status Messages */}
                {isGeneratingTryOn && (
                  <div className="text-center">
                    <p className="text-white flex items-center justify-center">
                      Generating...
                      <LoadingDots />
                    </p>
                    <p className="text-[rgba(255,255,255,0.6)] mt-2">
                      Please do not refresh or you will lose all progress!
                    </p>
                  </div>
                )}

                {finishMessage && (
                  <p className="text-[rgba(255,255,255,0.8)] text-center">
                    {finishMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {tryOnImageList.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mt-10 mb-6">
              Your Generated Images
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {tryOnImageList.map((image, index) => (
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
    </main>
  );
}
