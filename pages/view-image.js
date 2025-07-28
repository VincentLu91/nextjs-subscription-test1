import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Form } from 'react-bootstrap';
import { saveAs } from 'file-saver';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';

export default function ViewImage() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const {
    userLoaded,
    user,
    session,
    userDetails,
    isLoadingUser,
    subscription,
    imageLink,
    setImageLink
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionObject, setCaptionObject] = useState(null);
  const [captionStatus, setCaptionStatus] = useState(null);
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);
  const [prefersReducedMotion] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const interval = useRef();

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

  useEffect(() => {
    const storedImageLink = localStorage.getItem('imageLink');
    if (storedImageLink) {
      setImageLink(storedImageLink);
    }
  }, []);

  const handleChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleChangeCaption = (e) => {
    setCaption(e.target.value);
  };

  const download = (url) => {
    saveAs(url, 'image');
  };

  const goGenerateVideo = (url) => {
    setImageLink(url);
    localStorage.setItem('imageLink', url);
    router.push('/image-to-video');
  };

  async function uploadFile(e) {
    let file = e.target.files[0];
    if (!file) return;

    const filePath = `${user.id}/${uuidv4()}.png`;
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (data) {
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (publicUrlData) {
        setImageLink(publicUrlData.publicUrl);
      }
    } else {
      console.log(error);
    }
  }

  const generateCaptionsReplicate = async (prompt, imageLink) => {
    if (!prompt?.trim() || !imageLink) {
      setCaption("You haven't entered anything!");
      return;
    }

    const rawCaption = await axios.post(
      '/api/imageCaption?prompt=' +
        prompt +
        'in the style of a social media caption' +
        '&imageLink=' +
        imageLink +
        `&user=${user.id}`
    );

    setCaptionObject(rawCaption);
    setCaptionStatus(rawCaption.data.status);
  };

  const getCaptionResults = async (url) => {
    const output = await axios.get('/api/captionresults?url=' + url);
    if (output.data.status === 'succeeded') {
      setCaptionStatus(output.data.status);
      const result = output.data.output;
      if (result) {
        const joinedCaption = result.join('');
        const joinedCaptionWithoutQuotes = joinedCaption.slice(1, -1);
        setCaption(joinedCaptionWithoutQuotes);
        setCaptionStatus(null);
      } else {
        alert('nothing generated');
      }
    }
  };

  useEffect(() => {
    if (captionStatus) {
      interval.current = setInterval(() => {
        getCaptionResults(captionObject.data.urls.get);
      }, 3000);
    }
    return () => clearInterval(interval.current);
  }, [captionStatus]);

  async function getCaptionTokenData() {
    if (!user?.id) return;
    const captionTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}&tokenType=caption_tokens`
    );
    setNumTokens(captionTokenData.data);
  }

  useEffect(() => {
    if (user) {
      getCaptionTokenData();
    }
  }, [user]);

  async function getTieredTokenData() {
    if (!user?.id) return;
    const captionTieredData = await axios.get(
      `/api/tieredToken?user=${user.id}&tokenType=caption_tokens`
    );
    setNumTieredTokens(captionTieredData.data);
  }

  useEffect(() => {
    if (user && subscription) {
      getTieredTokenData();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {subscription ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
              <h1 className="text-4xl font-extrabold text-white">
                View Content & Generate Captions
              </h1>

              {/* Credits Badge */}
              <div
                className={`inline-flex px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 motion-reduce:transition-none ${
                  !prefersReducedMotion &&
                  'hover:shadow-[0_4px_12px_rgba(168,85,247,0.35)] hover:scale-105'
                } ${numTokens <= 10 ? 'bg-[#FFC107] text-black ring-2 ring-[#FFC107]' : 'bg-[#8256FF] text-white ring-2 ring-[#8256FF]'}`}
                role="status"
                aria-label={`Credits remaining: ${numTokens} out of ${numTieredTokens}`}
              >
                Credits: {numTokens} / {numTieredTokens}
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-[72px] mt-[40px] sm:gap-[48px]">
              {/* Left Column - Image Preview */}
              <div>
                <div className="bg-[#0F0F0F] rounded-xl relative overflow-hidden">
                  {imageLink ? (
                    <>
                      <button
                        onClick={() => {
                          setImageLink(null);
                          localStorage.removeItem('imageLink');
                        }}
                        className={`absolute top-4 left-4 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center z-10 text-[#F87171] transition-transform duration-200 ${
                          !prefersReducedMotion && 'hover:scale-110'
                        }`}
                        aria-label="Close preview"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <div className="p-4">
                        <img
                          src={imageLink}
                          alt="Preview"
                          className="w-full h-auto rounded animate-fade-in"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-white mb-4">
                        No image selected. Please go back to Gallery and select
                        AI image
                      </p>
                      {/*<Form.Control
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={uploadFile}
                      className="max-w-sm mx-auto"
                    />*/}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Action Panel */}
              <div className="sm:mt-[24px]">
                <div className="bg-[#181818] rounded-2xl p-6 sm:p-10 lg:p-12 space-y-6">
                  <button
                    onClick={() => download(imageLink)}
                    disabled={!imageLink}
                    className={`w-full h-[52px] bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white text-base font-semibold rounded-xl transition-all duration-150 ${
                      !prefersReducedMotion &&
                      'hover:shadow-lg hover:shadow-[#A855F7]/45 active:scale-[0.97]'
                    } disabled:opacity-50`}
                  >
                    Download Content
                  </button>

                  <button
                    onClick={() => goGenerateVideo(imageLink)}
                    disabled={!imageLink}
                    className={`w-full h-[52px] bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white text-base font-semibold rounded-xl transition-all duration-150 ${
                      !prefersReducedMotion &&
                      'hover:shadow-lg hover:shadow-[#A855F7]/45 active:scale-[0.97]'
                    } disabled:opacity-50`}
                  >
                    Generate Video
                  </button>

                  <p className="text-sm text-[#9CA3AF] max-w-[380px]">
                    Enter your instruction for the AI to generate a caption,
                    including any product details or relevant context.
                  </p>

                  <input
                    type="text"
                    value={prompt}
                    onChange={handleChange}
                    placeholder="Describe the caption you want generated"
                    className="w-full h-12 px-4 bg-[#101010] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A855F7] transition-shadow"
                  />

                  <button
                    onClick={() => generateCaptionsReplicate(prompt, imageLink)}
                    disabled={!prompt || !imageLink}
                    className={`w-full h-[52px] bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white text-base font-semibold rounded-xl transition-all duration-150 ${
                      !prefersReducedMotion &&
                      'hover:shadow-lg hover:shadow-[#A855F7]/45 active:scale-[0.97]'
                    } disabled:opacity-50`}
                  >
                    Generate Caption
                  </button>

                  <textarea
                    value={caption}
                    onChange={handleChangeCaption}
                    placeholder="Caption will appear here..."
                    className="w-full h-60 p-5 bg-[#0F0F0F] border border-dashed border-[#2A2A2A] rounded-xl text-[#E5E7EB] text-sm leading-relaxed placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/20 transition-shadow resize-none"
                  />

                  {isLoading && <LoadingDots />}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-2xl text-white">
              You need to subscribe to access this feature!
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}

// Add required keyframe animations to globals.css
const fadeInAnimation = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 400ms ease-out forwards;
}
`;
