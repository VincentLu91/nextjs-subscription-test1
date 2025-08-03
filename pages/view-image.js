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
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
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
  const [numTieredTokens, setNumTieredTokens] = useState(16);
  const [prefersReducedMotion] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const interval = useRef();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/signin');
      setImageLink(null);
      if (typeof window !== 'undefined') {
        // Clear any imageLink items from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('imageLink_')) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const storedImageLink = localStorage.getItem(`imageLink_${user.id}`);
      if (storedImageLink) {
        setImageLink(storedImageLink);
      }
    }
  }, [user]);

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
    localStorage.setItem(`imageLink_${user.id}`, url);
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
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [user]);

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">
            View Content & Generate Captions
          </h1>

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

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Left Column - Image Preview */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Preview Image
            </label>
            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {imageLink ? (
                <>
                  <button
                    onClick={() => {
                      setImageLink(null);
                      localStorage.removeItem(`imageLink_${user.id}`);
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
                    No image selected. Please go back to Gallery and select AI
                    image
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
          </section>

          {/* Right Column - Action Panel */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Actions & Caption
            </label>
            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
              <button
                onClick={() => download(imageLink)}
                disabled={!imageLink}
                className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Content
              </button>

              <button
                onClick={() => goGenerateVideo(imageLink)}
                disabled={!imageLink}
                className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Video
              </button>

              <p className="text-sm text-[#A1A1AA]">
                Enter your instruction for the AI to generate a caption,
                including any product details or relevant context.
              </p>

              <input
                type="text"
                value={prompt}
                onChange={handleChange}
                placeholder="Describe the caption you want generated"
                className="w-full h-12 px-4 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
              />

              <button
                onClick={() => generateCaptionsReplicate(prompt, imageLink)}
                disabled={!prompt || !imageLink}
                className="w-full h-12 bg-[#8256FF] hover:bg-[#6F48DB] rounded-lg font-semibold text-white transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Caption
              </button>

              <textarea
                value={caption}
                onChange={handleChangeCaption}
                placeholder="Caption will appear here..."
                className="w-full h-60 p-5 bg-[#0F0F0F] border border-dashed border-[#27272A] rounded-lg text-[#E4E4E7] text-sm leading-relaxed placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none resize-none"
              />

              {isLoading && <LoadingDots />}
            </div>
          </section>
        </div>
      </div>
    </main>
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
