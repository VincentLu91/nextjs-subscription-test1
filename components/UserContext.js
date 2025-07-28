import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../utils/initSupabase';

export const UserContext = createContext();

export const UserContextProvider = (props) => {
  const [userLoaded, setUserLoaded] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [imageLink, setImageLink] = useState(null);
  const [videoLink, setVideoLink] = useState(null);
  const [imageForBg, setImageForBg] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [backgroundImageList, setBackgroundImageList] = useState([]);
  const [pixBlenderImageList, setPixBlenderImageList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBGImagesLoading, setisBGImagesLoading] = useState(false);
  const [isBlenderImgLoading, setIsBlenderImgLoading] = useState(false);
  const [contentPrompt, setcontentPrompt] = useState(null);
  const [img2vidPrompt, setImg2vidPrompt] = useState(null);
  const [backgroundPrompt, setBackgroundPrompt] = useState(null);
  const [pixBlenderPrompt, setPixBlenderPrompt] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const [zipFiles, setZipFiles] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isImageUploaded, setIsImageUploaded] = useState(false);
  const [zipFileName, setZipFileName] = useState(null);
  const [imageFile, setImageFile] = useState([]);
  const [imageFileName, setImageFileName] = useState([]);
  const [instancePrompt, setInstancePrompt] = useState(null);
  const [classPrompt, setClassPrompt] = useState(null);
  const [trainingID, setTrainingID] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [status, setStatus] = useState(null);
  const [trainingText, setTrainingText] = useState(
    'Upload zip file and begin training.'
  );
  const [modelName, setModelName] = useState(null);
  const [imageStyle, setImageStyle] = useState(null);
  const [modelVersion, setModelVersion] = useState(null);
  const [modelClass, setModelClass] = useState(null);

  const [instanceList, setInstanceList] = useState([]);
  const [predictions, setPredictions] = useState({}); // { 0 : { get: 'url', cancel: "url", status: 'succeeded'}}
  const [backgroundImagePredictions, setBackgroundImagePredictions] = useState(
    {}
  );
  const [pixBlenderPredictions, setPixBlenderPredictions] = useState({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [isGeneratingBGImages, setisGeneratingBGImages] = useState(false);
  const [isGeneratingBlenderImg, setIsGeneratingBlenderImg] = useState(false);
  const [isApparelLoading, setisApparelLoading] = useState(false);
  const [isGeneratingApparel, setisGeneratingApparel] = useState(false);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [tryOnImageList, setTryOnImageList] = useState([]);
  const [tryOnPredictions, setTryOnPredictions] = useState({});

  const [isImagesButtonClicked, setIsImagesButtonClicked] = useState(false);
  const [statusPercentage, setStatusPercentage] = useState(0);
  const [generatedPhotos, setGeneratedPhotos] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);

  useEffect(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoadingUser(false);
      }
    );

    return () => {
      authListener.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get the user details.
  const getUserDetails = () => supabase.from('users').select('*').single();

  // Get the user's trialing or active subscription.
  const getSubscription = () =>
    supabase
      .from('subscriptions')
      .select('*, prices(*, products(*))')
      .in('status', ['trialing', 'active'])
      .single();

  useEffect(() => {
    if (user) {
      Promise.allSettled([getUserDetails(), getSubscription()]).then(
        (results) => {
          setUserDetails(results[0].value.data);
          setSubscription(results[1].value.data);
          setUserLoaded(true);
        }
      );
    }
  }, [user]);

  const value = {
    session,
    user,
    userDetails,
    userLoaded,
    isLoadingUser,
    subscription,
    signIn: (options) => supabase.auth.signInWithPassword(options),
    signUp: (options) => supabase.auth.signUp(options),
    signOut: () => {
      setUserDetails(null);
      setSubscription(null);
      return supabase.auth.signOut();
    },
    imageLink,
    setImageLink,
    videoLink,
    setVideoLink,
    imageForBg,
    setImageForBg,
    imageList,
    setImageList,
    videoList,
    setVideoList,
    isLoading,
    setIsLoading,
    contentPrompt,
    setcontentPrompt,
    img2vidPrompt,
    setImg2vidPrompt,
    zipFiles,
    setZipFiles,
    isUploaded,
    setIsUploaded,
    isImageUploaded,
    setIsImageUploaded,
    zipFileName,
    setZipFileName,
    imageFile,
    setImageFile,
    imageFileName,
    setImageFileName,
    instancePrompt,
    setInstancePrompt,
    classPrompt,
    setClassPrompt,
    trainingID,
    setTrainingID,
    isTraining,
    setIsTraining,
    status,
    setStatus,
    trainingText,
    setTrainingText,
    modelName,
    setModelName,
    imageStyle,
    setImageStyle,
    modelVersion,
    setModelVersion,
    modelClass,
    setModelClass,
    backgroundPrompt,
    setBackgroundPrompt,
    pixBlenderPrompt,
    setPixBlenderPrompt,
    isBGImagesLoading,
    setisBGImagesLoading,
    isBlenderImgLoading,
    setIsBlenderImgLoading,
    isVideoLoading,
    setIsVideoLoading,
    isGeneratingBGImages,
    setisGeneratingBGImages,
    isGeneratingBlenderImg,
    setIsGeneratingBlenderImg,
    backgroundImageList,
    setBackgroundImageList,
    backgroundImagePredictions,
    setBackgroundImagePredictions,
    pixBlenderImageList,
    setPixBlenderImageList,
    pixBlenderPredictions,
    setPixBlenderPredictions,
    instanceList,
    setInstanceList,
    predictions,
    setPredictions,
    isGeneratingImages,
    setIsGeneratingImages,
    isGeneratingVideos,
    setIsGeneratingVideos,
    isImagesButtonClicked,
    setIsImagesButtonClicked,
    statusPercentage,
    setStatusPercentage,
    generatedPhotos,
    setGeneratedPhotos,
    generatedVideos,
    setGeneratedVideos,
    isApparelLoading,
    setisApparelLoading,
    isGeneratingApparel,
    setisGeneratingApparel,
    isGeneratingTryOn,
    setIsGeneratingTryOn,
    tryOnImageList,
    setTryOnImageList,
    tryOnPredictions,
    setTryOnPredictions
  };
  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error(`useUser must be used within a UserContextProvider.`);
  }
  return context;
};
