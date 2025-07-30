import { useRouter } from 'next/router';
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

  // Preserve all existing functionality
  const getImage = async (attempt, backgroundPrompt) => {
    if (!uploadedFilePath) {
      console.error('No image file uploaded or file path missing');
      setisGeneratingBGImages(false);
      setisBGImagesLoading(false);
      return;
    }
    setResultImages([]);
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
      }
    } catch (error) {
      console.error('Error in getImageResults:', error.message);
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
    if (list.length > 0 && list.every((item) => item.status === 'COMPLETED')) {
      clearInterval(intervalImage.current);
      setisBGImagesLoading(false);
      setisGeneratingBGImages(false);
      setFinishMessage(
        'All images are generated and saved to gallery. You can also view them below. \n' +
          'Please go to the Gallery page to see all your generated images'
      );
    }
  }, [backgroundImagePredictions]);

  useEffect(() => {
    if (resultImages) {
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
      const savedFilePath = localStorage.getItem('uploadedFilePath');
      if (savedFilePath) {
        setUploadedFilePath(savedFilePath);
        setIsImageUploaded(true);
      }
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
        localStorage.setItem('uploadedFilePath', filePath);
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

    clearInterval(intervalImage.current);
    setBackgroundImagePredictions({});
    setBackgroundImageList([]);
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
          <h1 className="text-5xl font-bold">Replace Background</h1>

          {/* Credits Badge */}
          <div
            className={`inline-flex px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-colors duration-200 motion-reduce:transition-none
              ${numTokens <= 10 ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]' : 'bg-[#8256FF] text-white ring-2 ring-[#8256FF]'}`}
            aria-live="polite"
          >
            Credits: {numTokens} / {numTieredTokens}
          </div>
        </div>

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
                  Drag and drop your image here, or click to select
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
                    localStorage.setItem('imageLink', image.url);
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
