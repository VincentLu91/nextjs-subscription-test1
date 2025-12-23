import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { postData, useCreditsFetcher, CreditBadge } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Form, Card } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';
import Input from '../components/ui/Input';
import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';

// import trainML's config code
import contentTypes from './api/contentTypes';
import { saveAs } from 'file-saver';

export default function ImageToVideo() {
  const [loading, setLoading] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [visible, setVisible] = useState(5);
  const [showImage, setShowImage] = useState(false);
  const [isFromOtherPage, setIsFromOtherPage] = useState(false);
  const [localImageLink, setLocalImageLink] = useState(null); // Local image for this page
  const router = useRouter();

  const {
    userLoaded,
    user,
    session,
    userDetails,
    isLoadingUser,
    subscription,
    imageLink,
    setImageLink,
    videoLink,
    setVideoLink,
    isVideoLoading,
    setIsVideoLoading,
    img2vidPrompt,
    setImg2vidPrompt
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionObject, setCaptionObject] = useState(null);
  const [captionStatus, setCaptionStatus] = useState(null);
  const { numTokens, numTieredTokens, isCreditsLoading, fetchCredits } =
    useCreditsFetcher(user, 'video_tokens');
  const [videoRespObj, setVideoRespObj] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
  const [finishMessage, setFinishMessage] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('auto');

  const interval = useRef();

  const hasSavedRef = useRef(new Set());

  const savedKeyFor = (userId, url) =>
    `savedVideo_${userId}_${encodeURIComponent(url)}`;

  const hasAlreadySaved = (userId, url) => {
    const k = savedKeyFor(userId, url);
    return hasSavedRef.current.has(k) || sessionStorage.getItem(k) === '1';
  };

  const markSaved = (userId, url) => {
    const k = savedKeyFor(userId, url);
    hasSavedRef.current.add(k);
    sessionStorage.setItem(k, '1');
  };

  const savedMapKey = (userId, url) =>
    `savedMap_${userId}_${encodeURIComponent(url)}`;

  const getSavedPublicUrl = (userId, url) =>
    sessionStorage.getItem(savedMapKey(userId, url));

  const setSavedPublicUrl = (userId, url, publicUrl) =>
    sessionStorage.setItem(savedMapKey(userId, url), publicUrl);

  const clearUserData = () => {
    // Clear state
    setImageLink(null);
    setVideoLink(null);
    setIsVideoLoading(false);
    setImg2vidPrompt('');
    setFinishMessage('');
    setResultVideo(null); // Clear resultVideo state
    setVideoRespObj(null); // Clear video response object
    setShowImage(false); // Reset showImage state
    setUploadedFilePath(''); // Clear uploaded file path

    // Clear sessionStorage for current user if exists
    if (user?.id) {
      sessionStorage.removeItem(`uploadedFilePath_${user.id}`);
    }

    // Clear sessionStorage for current user if exists
    if (user?.id) {
      sessionStorage.removeItem(`generatedVideos_${user.id}_img2vid`);
      sessionStorage.removeItem(`resultVideo_${user.id}`);
      sessionStorage.removeItem(`imageLink_${user.id}`);
      sessionStorage.removeItem(`videoLink_${user.id}`);
      sessionStorage.removeItem(`videoRespObj_${user.id}`);
      sessionStorage.removeItem(`showImage_${user.id}`); // Remove showImage from storage
    }
  };

  // Clear other user data from sessionStorage
  const clearOtherUserData = () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        (key.startsWith('generatedVideos_') ||
          key.startsWith('imageLink_') ||
          key.startsWith('videoLink_') ||
          key.startsWith('resultVideo_') ||
          key.startsWith('videoRespObj_') ||
          key.startsWith('showImage_')) && // Include showImage in cleanup
        !key.endsWith(user?.id || '')
      ) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const wasLoggedOut = useRef(false);

  // Restore uploadedFilePath and localImageLink from sessionStorage
  useEffect(() => {
    if (user?.id) {
      const storedFilePath = sessionStorage.getItem(
        `uploadedFilePath_${user.id}`
      );
      const storedLocalImageLink = sessionStorage.getItem(
        `localImageLink_${user.id}`
      );
      if (storedFilePath) {
        setUploadedFilePath(storedFilePath);
      }
      if (storedLocalImageLink) {
        setLocalImageLink(storedLocalImageLink);
      }
    }
  }, [user]);

  // Check URL parameter and sessionStorage to show image
  useEffect(() => {
    if (user?.id) {
      const storedShowImage = sessionStorage.getItem(`showImage_${user.id}`);
      const storedIsFromOtherPage = sessionStorage.getItem(
        `isFromOtherPage_${user.id}`
      );

      if (storedShowImage === 'true' || router.query.show === 'true') {
        setShowImage(true);
      }

      // If coming from other page via URL parameter
      if (router.query.show === 'true') {
        setIsFromOtherPage(true);
        sessionStorage.setItem(`isFromOtherPage_${user.id}`, 'true');
        // Clear local upload when coming from other page
        setLocalImageLink(null);
        setUploadedFilePath('');
        sessionStorage.removeItem(`localImageLink_${user.id}`);
        sessionStorage.removeItem(`uploadedFilePath_${user.id}`);
      } else if (storedIsFromOtherPage === 'true') {
        setIsFromOtherPage(true);
      } else {
        // Clear the isFromOtherPage flag if not set
        setIsFromOtherPage(false);
      }
    }
  }, [router.query, user]);

  // Persist showImage state to sessionStorage
  useEffect(() => {
    if (user?.id) {
      if (showImage) {
        sessionStorage.setItem(`showImage_${user.id}`, 'true');
      } else {
        sessionStorage.removeItem(`showImage_${user.id}`);
      }
    }
  }, [showImage, user]);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      // Set flag to prevent restoration after logout
      wasLoggedOut.current = true;
      // Clear all video state and storage before redirecting to signin
      setResultVideo(null);
      setVideoLink(null);
      // Clear all video-related data from sessionStorage on logout
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.includes('resultVideo_') ||
          key.includes('videoLink_') ||
          key.includes('generatedVideos_') ||
          key.includes('videoRespObj_') ||
          key.includes('showImage_') // Include showImage in cleanup
        ) {
          sessionStorage.removeItem(key);
        }
      });
      router.replace('/signin');
      clearUserData(); // Clear all state when no user
    } else if (user) {
      if (!wasLoggedOut.current) {
        // Only restore from sessionStorage if we're not coming from a logout
        const storedVideoLink = sessionStorage.getItem(`videoLink_${user.id}`);
        const storedResultVideo = sessionStorage.getItem(
          `resultVideo_${user.id}`
        );
        const storedVideoRespObj = sessionStorage.getItem(
          `videoRespObj_${user.id}`
        );
        const storedShowImage = sessionStorage.getItem(`showImage_${user.id}`);

        if (storedVideoLink) {
          setVideoLink(storedVideoLink);
        }
        if (storedResultVideo) {
          setResultVideo(storedResultVideo);
        }
        if (storedVideoRespObj) {
          const obj = JSON.parse(storedVideoRespObj);
          setVideoRespObj(obj);

          const storedResultVideo = sessionStorage.getItem(
            `resultVideo_${user.id}`
          );

          // ✅ Only resume loading if we *don’t* already have a finished result
          if (!storedResultVideo) {
            setIsVideoLoading(true);
          } else {
            setIsVideoLoading(false);
          }
        }

        if (storedShowImage === 'true') {
          setShowImage(true);
        }
      }
      wasLoggedOut.current = false; // Reset flag
      clearOtherUserData(); // Clear other user data when component mounts with a user
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
    setImg2vidPrompt(e.target.value);
    console.log('Prompt: ', e.target.value);
  };

  const handleChangeCaption = (e) => {
    setCaption(e.target.value);
    console.log('Caption: ', e.target.value);
  };

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
        // Store in localImageLink instead of global imageLink
        setLocalImageLink(publicUrlData.publicUrl);
        setUploadedFilePath(filePath);
        sessionStorage.setItem(`uploadedFilePath_${user.id}`, filePath);
        sessionStorage.setItem(
          `localImageLink_${user.id}`,
          publicUrlData.publicUrl
        );
        setShowImage(true);
        sessionStorage.setItem(`showImage_${user.id}`, 'true');
        // Clear isFromOtherPage when uploading locally
        setIsFromOtherPage(false);
        sessionStorage.removeItem(`isFromOtherPage_${user.id}`);
      }
    } else {
      console.error('Error uploading file:', error);
      alert('Failed to upload image. Please try again.');
    }
  }

  // Use localImageLink if available, otherwise use imageLink from context
  const activeImageLink = localImageLink || imageLink;

  const displayContent = showImage && activeImageLink && (
    <div className={styles['display-image']} style={{ position: 'relative' }}>
      {/* Close button */}
      <button
        onClick={async () => {
          if (uploadedFilePath) {
            // Remove file from Supabase storage
            const { error } = await supabase.storage
              .from('images')
              .remove([uploadedFilePath]);
            if (error) {
              console.error('Error removing file from storage:', error);
            }
          }
          // Clear state
          setLocalImageLink(null);
          setImageLink(null);
          setUploadedFilePath('');
          setShowImage(false);
          setIsFromOtherPage(false);
          // Clear storage
          sessionStorage.removeItem(`localImageLink_${user.id}`);
          sessionStorage.removeItem(`imageLink_${user.id}`);
          sessionStorage.removeItem(`showImage_${user.id}`);
          sessionStorage.removeItem(`uploadedFilePath_${user.id}`);
          sessionStorage.removeItem(`isFromOtherPage_${user.id}`);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: '30px',
          textAlign: 'center'
        }}
      >
        X
      </button>

      <img alt="uploaded" src={activeImageLink} />
      <br />
    </div>
  );

  const generateVideo = async (prompt, image) => {
    if (prompt == null || prompt.trim() == '' || !image) {
      setCaption("You haven't entered anything!");
      return;
    }

    // Only check if image contains a product for uploaded files
    // Skip the check for image URLs/links (e.g., generated images from other services)
    // Check if the current imageLink actually contains the uploadedFilePath
    // (if uploadedFilePath is set but imageLink doesn't contain it, user selected from gallery)
    const isUploadedFile = uploadedFilePath && image.includes(uploadedFilePath);

    if (isUploadedFile) {
      try {
        // Start product check
        const productCheck = await axios.post('/api/isProduct', {
          imageLink: image,
          user: user.id,
          /*prompt:
            'Does this image have a product - no animals or humans - just a standalone product? Please respond with only yes or no'*/
          prompt:
            'Does this image have a product? Please respond with only yes or no'
        });

        // Poll for result
        let checkComplete = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!checkComplete && attempts < maxAttempts) {
          const output = await axios.get(
            '/api/captionresults?url=' + productCheck.data.urls.get
          );
          console.log('Product check attempt', attempts + 1, ':', output.data);

          if (output.data.status === 'succeeded') {
            const result = output.data.output;
            if (!result || result.length === 0) {
              alert(
                'Error checking if image contains product. Please try again.'
              );
              setIsVideoLoading(false);
              return;
            }
            const response = result.join('').toLowerCase().trim();
            console.log('Product check response:', response);
            if (response === 'no') {
              alert(
                'Please upload a product image. The uploaded image does not appear to contain a product.'
              );
              setIsVideoLoading(false);
              return;
            }
            checkComplete = true;
          } else if (output.data.status === 'failed') {
            alert(
              'Error checking if image contains product. Please try again.'
            );
            setIsVideoLoading(false);
            return;
          }

          if (!checkComplete) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
          }
        }

        if (!checkComplete) {
          alert(
            'Timeout checking if image contains product. Please try again.'
          );
          setIsVideoLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking if image contains product:', error);
        alert('Error checking if image contains product. Please try again.');
        setIsVideoLoading(false);
        return;
      }
    }

    // Clear previous video state
    setResultVideo(null);
    setVideoRespObj(null);
    setFinishMessage(null);

    // Clear previous video from session storage
    sessionStorage.removeItem(`resultVideo_${user.id}`);
    sessionStorage.removeItem(`videoLink_${user.id}`);
    sessionStorage.removeItem(`videoRespObj_${user.id}`);

    // Clear any existing polling interval
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }

    setIsVideoLoading(true);
    fetchCredits('gen-start', { silent: true });
    try {
      setShowImage(true);
      sessionStorage.setItem(`showImage_${user.id}`, 'true');

      const videoResp = await axios.post(
        '/api/img2vid?user_prompt=' +
          prompt +
          '&image=' +
          image +
          `&user=${user.id}` +
          `&aspect_ratio=${selectedAspectRatio}`
      );

      if (!videoResp?.data) {
        throw new Error('Invalid response from video generation API');
      }

      setVideoRespObj(videoResp);
      sessionStorage.setItem(
        `videoRespObj_${user.id}`,
        JSON.stringify(videoResp)
      );
      console.log('videoResp status:', videoResp.data.status);
      console.log('videoResp request_id:', videoResp.data.request_id);
    } catch (error) {
      console.error('Error generating video:', error);
      alert(
        'There was an error generating your video. Please try using proper image and prompt'
      );
      setIsVideoLoading(false);
    }
  };

  const getVideoResults = async (url) => {
    try {
      console.log('video response url response: ', url);
      const output = await axios.get('/api/imageresults?url=' + url);

      if (output.data.status === 'COMPLETED') {
        const result = await axios.get(
          '/api/imageresults?url=' + output.data.response_url
        );

        if (!result.data.video?.url) {
          throw new Error('No video URL in response');
        }

        console.log('Result video url:', result.data.video.url);
        const videoUrl = result.data.video.url;

        // Save first (idempotent)
        await addVideos(videoUrl);

        // Then update UI state / storage
        setResultVideo(videoUrl);
        setVideoLink(videoUrl);
        sessionStorage.setItem(`resultVideo_${user.id}`, videoUrl);
        sessionStorage.setItem(`videoLink_${user.id}`, videoUrl);

        // Clear interval when video is completed
        if (interval.current) {
          clearInterval(interval.current);
          interval.current = null;
        }

        setIsVideoLoading(false);
        setFinishMessage(
          <div>
            Video has been generated and saved to gallery (available in paid
            plans). You can view them there or below. To view content or
            generate captions,{' '}
            <Link href={`/view-video?videoLink=${videoUrl}`}>
              <span className="text-[#8256FF] hover:underline cursor-pointer">
                click here
              </span>
            </Link>
            .
          </div>
        );
      }

      return output.data.status;
    } catch (error) {
      console.error('Error getting video results:', error);
      setIsVideoLoading(false);
      setFinishMessage(
        <div className="text-red-500">
          An error occurred while generating the video. Please try again.
        </div>
      );
      return 'FAILED';
    }
  };

  useEffect(() => {
    let mounted = true;

    if (
      videoRespObj?.data?.response_url &&
      isVideoLoading &&
      !resultVideo && // ✅ don't poll if we already have a result
      !interval.current
    ) {
      const pollVideo = async () => {
        if (!mounted) return;
        const status = await getVideoResults(videoRespObj.data.status_url);
        if (!mounted) return;
        if (status === 'FAILED') {
          clearInterval(interval.current);
          interval.current = null;
          setIsVideoLoading(false);
        }
      };

      pollVideo();
      interval.current = setInterval(pollVideo, 3000);
    }

    return () => {
      mounted = false;
      if (interval.current) {
        clearInterval(interval.current);
        interval.current = null;
      }
    };
    // ✅ deps trimmed so route changes don't re-trigger it
  }, [videoRespObj?.data?.response_url, isVideoLoading, resultVideo]);

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
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [user]);

  const loadingWithVideoPrompt = isVideoLoading && (
    <div className={styles['black-text']}>
      Description of video: {img2vidPrompt}
      <p>
        Loading
        <LoadingDots />
      </p>
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  const viewGeneratedContent = (videoUrl) => {
    setVideoLink(videoUrl); // Update state with the video URL
    sessionStorage.setItem(`selectedVideo_${user.id}`, videoUrl); // ✅ Use a dedicated key
    router.push('/view-video'); // Navigate to the content page
  };

  const download = (url) => {
    saveAs(url, 'video');
  };

  const renderCard = (resultVideo, index) => {
    return (
      <Card
        style={{ width: '10rem' }}
        key={index}
        className={`hover:cursor-pointer m-4 hover:scale-105 shadow-lg rounded-md ${styles.box}`}
        onClick={() => viewGeneratedContent(resultVideo)}
      >
        <video width="100%" src={resultVideo} controls={false} />
      </Card>
    );
  };

  async function copyVideoToSupabase(vid_url) {
    try {
      const response = await fetch(vid_url);
      console.log('vid_url :', vid_url);
      const blob = await response.blob();
      // Get file extension from the URL or default to mp4
      const fileExt = vid_url.split('.').pop().toLowerCase() || 'mp4';
      const uniqueFileName = `${user?.id}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('videos') // Specify the bucket name
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

  const addVideos = async (remoteUrl) => {
    if (!user?.id) return;

    // ✅ If we already have a public URL for this remote URL, skip re-upload/insert
    const existingPublic = getSavedPublicUrl(user.id, remoteUrl);
    if (existingPublic) {
      console.log(
        'Already saved mapping; skipping:',
        remoteUrl,
        '→',
        existingPublic
      );
      return;
    }

    // 1) Copy to Supabase storage
    const uniqueFileName = await copyVideoToSupabase(remoteUrl);
    if (!uniqueFileName) return;

    const { data, error: urlError } = supabase.storage
      .from('videos')
      .getPublicUrl(uniqueFileName);
    if (urlError) {
      console.error('Error generating public URL:', urlError.message);
      return;
    }

    const publicUrl = data.publicUrl;

    // 2) (Optional extra safety) Check DB by the *same* URL you actually insert
    const { data: existing, error: existingErr } = await supabase
      .from('videos')
      .select('id')
      .eq('video_url', publicUrl)
      .maybeSingle();

    if (!existingErr && existing) {
      console.log('DB already has this public URL; mapping and exit.');
      setSavedPublicUrl(user.id, remoteUrl, publicUrl);
      return;
    }

    // 3) Insert row
    const { error: insertErr } = await supabase.from('videos').insert({
      customer_id: user.identities?.[0]?.id ?? user.id,
      video_url: publicUrl
      // Optional but recommended if your API returns it:
      // request_id: videoRespObj?.data?.request_id
    });

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return;
    }

    // 4) Update local cache & mapping
    const localKey = `generatedVideos_${user.id}_img2vid`;
    const localList = JSON.parse(sessionStorage.getItem(localKey) || '[]');
    localList.push(publicUrl);
    sessionStorage.setItem(localKey, JSON.stringify(localList));

    setSavedPublicUrl(user.id, remoteUrl, publicUrl); // ✅ remember mapping
    await fetchCredits('post-mutation', { silent: true });
  };

  // Initial load and whenever subscription presence changes
  useEffect(() => {
    if (user) fetchCredits('mount/user', { silent: true });
  }, [user, subscription]);

  // Update credits on window focus/visibility
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

  // Poll credits during video generation
  useEffect(() => {
    if (!isVideoLoading) return;
    const id = setInterval(
      () => fetchCredits('gen-poll', { silent: true }),
      3000
    );
    return () => clearInterval(id);
  }, [isVideoLoading]);

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  return (
    <main className="bg-[#0C0C0C] text-white min-h-screen font-['Inter'] text-base leading-6">
      <div className="max-w-[960px] mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <h1 className="text-5xl font-bold">Image to Video</h1>

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
        {(numTokens <= 5 || numTieredTokens <= 5) && !hasNoSubscription && (
          <div className="flex justify-center mb-8">
            <Link href="/buy-credits">
              <button className="px-8 py-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white font-semibold transition-all duration-200 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105">
                Buy Additional Credits
              </button>
            </Link>
          </div>
        )}

        <p className="text-[#A1A1AA] mb-6">
          Create a short 5-second TikTok/Reel-style clip from a product photo.
          Great as a quick scroll-stopper, not a high-end cinematic ad.
        </p>
        <p className="text-[#A1A1AA] mb-6">
          Best results with images generated in BrandPix (create image{' '}
          <Link href="/pix-blender" className="underline hover:text-white">
            here
          </Link>
          ).
        </p>
        <p className="text-[#A1A1AA] mb-6">
          Select photo from{' '}
          <Link href="/image-gallery" className="underline hover:text-white">
            image gallery
          </Link>{' '}
          (paid plan), or upload a product photo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
          {/* Image Preview Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Selected Image
            </label>
            {!localImageLink && isFromOtherPage && showImage && imageLink ? (
              <p>✅ Using a BrandPix image – best quality for animations.</p>
            ) : (
              <p>
                ℹ️ Using your own photo is fine. For smoother lighting & edges,
                you'll get best results with images generated in BrandPix first
                (start{' '}
                <Link
                  href="/pix-blender"
                  className="underline hover:text-white"
                >
                  here
                </Link>
                ).
              </p>
            )}

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {displayContent ? (
                <div
                  className={`relative rounded-lg overflow-hidden ${!isVideoLoading && 'cursor-pointer'} ${dragActive && !isVideoLoading ? 'ring-2 ring-[#8256FF]' : ''}`}
                  onClick={() =>
                    !isVideoLoading &&
                    document.getElementById('file-upload').click()
                  }
                  onDragEnter={(e) => !isVideoLoading && handleDrag(e)}
                  onDragLeave={(e) => !isVideoLoading && handleDrag(e)}
                  onDragOver={(e) => !isVideoLoading && handleDrag(e)}
                  onDrop={(e) => !isVideoLoading && handleDrop(e)}
                >
                  <img
                    src={activeImageLink}
                    alt="Selected image"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-sm">
                      {isVideoLoading
                        ? 'Cannot replace image while generating video'
                        : dragActive
                          ? 'Drop to replace image'
                          : 'Click or drag to replace image'}
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={uploadFile}
                  />
                </div>
              ) : (
                <div
                  className={`relative flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] border-2 border-dashed border-[#3F3F46] rounded-xl ${!isVideoLoading && 'cursor-pointer'} transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none
                    ${dragActive && !isVideoLoading ? 'scale-[1.03] shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : ''}`}
                  onDragEnter={(e) => !isVideoLoading && handleDrag(e)}
                  onDragLeave={(e) => !isVideoLoading && handleDrag(e)}
                  onDragOver={(e) => !isVideoLoading && handleDrag(e)}
                  onDrop={(e) => !isVideoLoading && handleDrop(e)}
                  onClick={() =>
                    !isVideoLoading &&
                    document.getElementById('file-upload').click()
                  }
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
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
                    {isVideoLoading
                      ? 'Cannot upload image while generating video'
                      : 'Drag and drop your image here, or click to select'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Video Generation Card */}
          <section>
            <label className="text-sm font-semibold uppercase tracking-wider text-[#737373] mb-4 block">
              Video Generation
            </label>

            <div className="bg-[#181818] rounded-2xl p-8 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="space-y-4">
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  className="w-full p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                >
                  <option value="21:9">21:9</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="9:16">9:16</option>
                  {/*<option value="auto">Default</option>*/}
                </select>

                {/* Prompt suggestion chips */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setImg2vidPrompt(
                        'Show a customer using the product and looking satisfied.'
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium bg-[#27272A] text-[#E4E4E7] rounded-full hover:bg-[#3F3F46] transition-colors duration-200 motion-reduce:transition-none border border-[#3F3F46] hover:border-[#52525B]"
                  >
                    Show product in use
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImg2vidPrompt(
                        'Start with the messy/problem state, then cut to the product solving it.'
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium bg-[#27272A] text-[#E4E4E7] rounded-full hover:bg-[#3F3F46] transition-colors duration-200 motion-reduce:transition-none border border-[#3F3F46] hover:border-[#52525B]"
                  >
                    Before/after effect
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImg2vidPrompt(
                        'Start with a fast close-up of the product, then zoom out to reveal the full scene.'
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium bg-[#27272A] text-[#E4E4E7] rounded-full hover:bg-[#3F3F46] transition-colors duration-200 motion-reduce:transition-none border border-[#3F3F46] hover:border-[#52525B]"
                  >
                    Attention-grab hook
                  </button>
                </div>

                <textarea
                  value={img2vidPrompt}
                  onChange={handleChange}
                  placeholder="Describe the video scene you want to generate..."
                  className="w-full min-h-[160px] p-3 bg-[#0F0F0F] border border-[#27272A] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#8256FF] transition-colors duration-200 motion-reduce:transition-none"
                />

                <button
                  onClick={() => generateVideo(img2vidPrompt, activeImageLink)}
                  disabled={
                    isVideoLoading || !activeImageLink || !img2vidPrompt?.trim()
                  }
                  className={`w-full h-12 rounded-lg font-semibold text-white transition-all duration-200 motion-reduce:transition-none motion-reduce:animation-none
                    ${
                      isVideoLoading
                        ? 'bg-[#4A4A4A] cursor-not-allowed'
                        : 'bg-[#8256FF] hover:bg-[#6F48DB] animate-button-shadow'
                    }`}
                >
                  {isVideoLoading ? (
                    <span className="flex items-center justify-center">
                      Generating
                      <LoadingDots />
                    </span>
                  ) : (
                    'Generate Video'
                  )}
                </button>
              </div>

              {loadingWithVideoPrompt && (
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
        {/* Results Section */}
        {resultVideo && (
          <>
            <h1 className="text-2xl font-bold mt-10 mb-6">
              Step 1: Your lifestyle/product video
            </h1>
            <div className="grid grid-cols-1 gap-6">
              <div className="relative rounded-lg overflow-hidden bg-[#181818] p-4">
                <div
                  className="cursor-pointer transition-transform duration-200 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  onClick={() => viewGeneratedContent(resultVideo)}
                >
                  <video
                    src={resultVideo}
                    controls
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <div className="mt-4 text-[#A1A1AA]">
                  <p className="text-sm mb-1">
                    Step 2: Generate caption/ad copy (recommended)
                  </p>
                  <p className="text-sm">Step 3: Download your video</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="slim"
                    onClick={() => viewGeneratedContent(resultVideo)}
                    className="flex-1 bg-[#8256FF] text-white hover:bg-[#6F48DB] border-[#8256FF] hover:border-[#6F48DB] hover:opacity-90"
                  >
                    Generate Captions/Ad copy
                  </Button>
                  <Button
                    variant="slim"
                    onClick={() => download(resultVideo)}
                    className="flex-1 bg-transparent text-[#A1A1AA] hover:text-white border-2 border-[#3F3F46] hover:border-[#52525B] hover:bg-[#1F1F1F]"
                  >
                    Download Video
                  </Button>
                </div>
              </div>
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
