import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../utils/initSupabase';

export const UserContext = createContext();

export const UserContextProvider = (props) => {
  const [userLoaded, setUserLoaded] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [imageLink, setImageLink] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contentPrompt, setcontentPrompt] = useState(null);

  const [zipFiles, setZipFiles] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [zipFileName, setZipFileName] = useState(null);
  const [instancePrompt, setInstancePrompt] = useState(null);
  const [classPrompt, setClassPrompt] = useState(null);
  const [trainingID, setTrainingID] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [status, setStatus] = useState(null);
  const [trainingText, setTrainingText] = useState(
    'Upload zip file and begin training.'
  );
  const [modelName, setModelName] = useState(null);
  const [modelVersion, setModelVersion] = useState(null);
  const [mask, setMask] = useState(null);
  const [maskUrl, setMaskUrl] = useState(null);
  const [maskPrompt, setMaskPrompt] = useState(null);
  const [negativeMaskPrompt, setNegativeMaskPrompt] = useState(null);

  const [instanceList, setInstanceList] = useState([]);
  const [predictions, setPredictions] = useState({}); // { 0 : { get: 'url', cancel: "url", status: 'succeeded'}}
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

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
    imageList,
    setImageList,
    isLoading,
    setIsLoading,
    contentPrompt,
    setcontentPrompt,
    zipFiles,
    setZipFiles,
    isUploaded,
    setIsUploaded,
    zipFileName,
    setZipFileName,
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
    modelVersion,
    setModelVersion,
    mask,
    setMask,
    maskUrl,
    setMaskUrl,
    maskPrompt,
    setMaskPrompt,
    negativeMaskPrompt,
    setNegativeMaskPrompt,
    instanceList,
    setInstanceList,
    predictions,
    setPredictions,
    isGeneratingImages,
    setIsGeneratingImages
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
