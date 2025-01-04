import { useRouter } from 'next/router';
import { useState, useEffect, useContext, useRef } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card, Form, Container, Row, Col } from 'react-bootstrap';
import styles from '../styles/Home.module.css';

import { supabase } from '../utils/initSupabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import JSZip from 'jszip';
import Input from '../components/ui/Input';

// https://eolmngjyubxaxlvtwbzs.supabase.co/storage/v1/object/public/images/062f6e29-5681-46f1-a4c4-48e60a441e4d/71894cfe-50dc-46fd-a31d-429671fba93e

const CDNURL = process.env.NEXT_PUBLIC_CDNURL;

// CDNURL + user.id + "/" + image.name

export default function Dashboard() {
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
    isImagesButtonClicked,
    setIsImagesButtonClicked,
    statusPercentage,
    setStatusPercentage
  } = useUser();
  const [instanceList, setInstanceList] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [numTokens, setNumTokens] = useState(null);
  const [numTieredTokens, setNumTieredTokens] = useState(null);

  const zip = new JSZip(); // instance of JSZip

  function selectFiles() {
    fileInputRef.current.click();
  }

  function onFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
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
    setUploadedImages((prevImages) => prevImages.filter((_, i) => i !== index));
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

  async function uploadImages() {
    console.log('Images: ', uploadedImages);
    if (uploadedImages.length == 0) {
      alert('Please upload images');
      return;
    }
    setIsImagesButtonClicked(true);
    // Add Images to the zip file
    for (let i = 0; i < uploadedImages.length; i++) {
      const response = await fetch(uploadedImages[i].url);
      const blob = await response.blob();
      console.log(blob);
      zip.file(uploadedImages[i].name.split('/').pop(), blob);

      if (i == uploadedImages.length - 1) {
        // Generate the zip file
        const zipData = await zip.generateAsync({
          type: 'blob',
          streamFiles: true
        });
        console.log(zipData);
        // Create a download link for the zip file
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(zipData);
        console.log('link.href is: ', link.href);
        // this IS the actual zip file url ^^. Consider saving that as a state variable
        // to upload to the supabase storage.
        // Upload the zip file to Supabase storage
        if (zipFiles) {
          deleteFile(zipFileName);
          setIsUploaded(false);
        }
        const { data, error } = await supabase.storage
          .from('images')
          .upload(user.id + '/' + uuidv4() + '.zip', zipData, {
            contentType: 'application/zip',
            cacheControl: '3600' // optional cache control
          });

        if (data) {
          setIsUploaded(true);
          getFiles();
        } else {
          console.log(error);
        }
      }
    }
  }

  const interval = useRef();
  //{ current: undefined }
  //{ current: "queued" }
  //{ current: "processing" } etc...
  // the difference between useRef and state variables is that changing values doesn't re-render components

  useEffect(() => {
    if (!isLoadingUser && !user) router.replace('/signin');
  }, [user]);

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

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  async function getFiles() {
    console.log('isUploaded: ', isUploaded);
    const { data, error } = await supabase.storage
      .from('images')
      .list(user?.id + '/', {
        limit: 1,
        offset: 0,
        //sortBy: { column: 'name', order: 'asc' }
        sortBy: { column: 'updated_at', order: 'desc' }
      }); // Cooper/
    // data: [image1, image2, image3]
    // image1: {name: "subscribeToCooperCodes.png"}

    // to load image1: CDNURL.com/subscribeToCooperCodes.png -> hosted image

    if (data != null) {
      setZipFiles(data);
      setZipFileName(data[0].name);
      console.log('data: ', data);
    } else {
      alert('Error loading images');
      console.log(error);
    }
  }

  useEffect(() => {
    if (user && isUploaded) {
      getFiles();
    }
  }, [user, isUploaded]);

  async function uploadFile(e) {
    let file = e.target.files[0];
    console.log('file: ', file);
    if (file == undefined) {
      return; // don't upload an empty file!
    }

    if (zipFiles) {
      deleteFile(zipFileName);
      setIsUploaded(false);
    }

    // userid: Cooper
    // Cooper/
    // Cooper/myNameOfImage.png
    // Lindsay/myNameOfImage.png

    const { data, error } = await supabase.storage
      .from('images')
      .upload(user.id + '/' + uuidv4() + '.zip', file); // add .zip extension otherwise training will err our

    if (data) {
      setIsUploaded(true);
      getFiles();
    } else {
      console.log(error);
    }
  }

  async function deleteFile(zipFileName) {
    const { error } = await supabase.storage
      .from('images')
      .remove([user.id + '/' + zipFileName]);

    if (error) {
      alert(error);
    } else {
      //getFiles();
      setIsUploaded(false);
      setZipFiles([]);
    }
  }

  const handleChangeInstancePrompt = (e) => {
    setInstancePrompt(e.target.value);
    console.log('instancePrompt: ', e.target.value);
  };

  const handleChangeClassPrompt = (e) => {
    setClassPrompt(e.target.value);
    console.log('classPrompt: ', e.target.value);
  };

  const getInstancePrompts = async () => {
    if (!user?.identities[0]?.id) {
      return; // i.e., if user hasn't trained anything yet.
    }
    let instanceArr = [];
    const instancePromptsInfo = await supabase
      .from('ai-models')
      .select('*')
      .eq('user_auth_id', user.identities[0].id);
    /*setInstanceList(
      instancePromptsInfo.data.map((i) => {
        //console.log(i.instance_prompt);
        i.instance_prompt;
      })
    );*/
    instancePromptsInfo.data.map((i) => {
      console.log(i.instance_prompt);
      //i.instance_prompt;
      instanceArr.push(i.instance_prompt);
    });
    console.log('instanceArr: ', instanceArr);
    setInstanceList(instanceArr);
  };

  useEffect(() => {
    getInstancePrompts();
  }, []);

  // next, implement deleting any models without model_versions i.e., user closes window while training
  const deleteIncompleteModels = async () => {
    console.log('delete incomplete model.....');
    console.log('********user***********', user, isTraining);
    await supabase
      .from('ai-models')
      .delete()
      .eq('user_auth_id', user?.identities[0]?.id)
      .is('model_version', null);
  };

  useEffect(() => {
    if (!isTraining) {
      deleteIncompleteModels();
    }
  }, [isTraining]);

  const trainModel = async (instancePrompt, classPrompt) => {
    if (instanceList.includes(instancePrompt)) {
      alert('please select a distinct name');
      return;
    }
    let trainerVersion =
      'd995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801944';
    if (instancePrompt == null || instancePrompt.trim() == '') {
      alert("You haven't entered anything!");
    } else if (classPrompt == null || classPrompt.trim() == '') {
      alert("You haven't entered anything!");
    } else if (!zipFileName) {
      alert("You haven't uploaded images yet or clicked the Upload button yet");
    } else {
      // check for the latest model version, if none, use default
      const prevModelInfo = await supabase
        .from('ai-models')
        .select('id, created_at, model_version, user_auth_id')
        .eq('user_auth_id', user.identities[0].id)
        .order('created_at', { ascending: false })
        .limit(1);
      console.log('prevModelInfo: ', prevModelInfo.data);
      // assign the model_version for training, so long as it exists, otherwise keep the initialized value
      /*if (prevModelInfo.data[0].model_version != null) {
        trainerVersion = prevModelInfo.data[0].model_version;
      }*/ console.log('trainerVersion: ', trainerVersion); // // I think dreambooth model version only allows versions from replicate dreambooth, not MY dreambooth
      const trainingInfo = await supabase
        .from('ai-models')
        .insert({
          instance_prompt: instancePrompt,
          class_prompt: classPrompt,
          user_auth_id: user.identities[0].id, // this references the authentication data, NOT `users` table
          instance_data: CDNURL + user.identities[0].id + '/' + zipFileName
        })
        .select();
      if (trainingInfo.error) {
        alert('cannot train!');
        console.log('training error: ', trainingInfo.error);
      } else {
        // moved local storage away from here
        console.log('training data: ', trainingInfo.data);
        // start making the call to Replicate API to train the model to save model_version
        const resp = axios
          .get(
            '/api/trainImageGen?instance_prompt=' +
              instancePrompt +
              '&class_prompt=' +
              classPrompt +
              '&instance_data=' +
              CDNURL +
              user.identities[0].id +
              '/' +
              zipFileName +
              '&trainer_version=' +
              trainerVersion +
              `&user=${user.id}`
          )
          .then((resp) => {
            console.log('resp training: ', resp);
            console.log('resp.data.id: ', resp.data.id);
            console.log('resp.data.status: ', resp.data.status);
            setTrainingID(resp.data.id);
            setStatus(resp.data.status);
          })
          .finally(() => {
            setIsTraining(true);
            setTrainingText('Getting Ready...');
          });
      }
    }
  };

  async function getTrainingTokenData() {
    console.log('user is: ', user.id);
    const trainingTokenData = await axios.get(
      `/api/tokenInfo?user=${user.id}` + `&tokenType=training_tokens`
    );
    console.log('trainingTokenData: ', trainingTokenData.data);
    setNumTokens(trainingTokenData.data);
  }

  // currently working with free users
  /*useEffect(() => {
    if (user && subscription) {
      getTrainingTokenData();
    }
  }, [user]);*/

  async function getTieredTokenData() {
    console.log('user is: ', user.id);
    const trainingTieredData = await axios.get(
      // when user first subscribes, it tries to get a price_id that didn't exist yet
      `/api/tieredToken?user=${user.id}` + `&tokenType=training_tokens`
    );
    console.log('trainingTieredData: ', trainingTieredData.data);
    setNumTieredTokens(trainingTieredData.data);
  }

  useEffect(() => {
    if (user && subscription) {
      // maybe check if user is subscribed at all?
      getTieredTokenData();
    }
  }, [user]);

  async function getTrainingStatus() {
    if (trainingID) {
      const trainingStatus = await axios.get(
        '/api/trainImageStatus?training_id=' + trainingID
      );
      if (trainingStatus) {
        //console.log('trainingStatus: ', trainingStatus.data.status);
        if (trainingStatus.data.logs) {
          let logs = trainingStatus.data.logs;
          const lines = logs.split('\n');

          const percentages = [];
          const elapsedTimes = [];
          const percentagePattern = /step.*?(\d+)%/;
          const timePattern = /elapsed=(\d+\.\d+)s/;

          lines.forEach((line) => {
            console.log('Processing line: ', line);
            // Extract percentage
            const percentageMatch = line.match(percentagePattern);
            if (percentageMatch && percentageMatch.length > 1) {
              const percentage = parseInt(percentageMatch[1]);
              percentages.push(percentage);
            } else if (line.match(/step/)) {
              console.log('Line matching percentage pattern:', line);
            }

            // Extract elapsed time
            const timeMatch = line.match(timePattern);
            if (timeMatch) {
              const elapsedTime = parseFloat(timeMatch[1]);
              elapsedTimes.push(elapsedTime);
            }
          });
          console.log('Percentages: ', percentages);
          if (percentages.length > 0) {
            setStatusPercentage(percentages[percentages.length - 1]);
          }
        }
        if (trainingStatus.data.status === 'succeeded') {
          clearInterval(interval.current);

          //setTrainingText('Training completed!');
          // update the record with the model_version
          console.log('success');
          // version is something like
          // vincentlu91/sdxl-tuning:eb6a135512a977d328ecfd5e615afc509ebc605816154a6c8a0b0be39cf2e0cc
          const inputString = trainingStatus.data.output.version;
          const delimiter = ':';
          const parts = inputString.split(delimiter);
          const result = '';
          if (parts.length > 1) {
            //result = parts[1];
            console.log(parts[1]); // Output: eb6a135512a977d328ecfd5e615afc509ebc605816154a6c8a0b0be39cf2e0cc
          } else {
            console.log('Delimiter not found in the string.');
          }
          // now store the version number
          const trainingStatusResponse = await supabase
            .from('ai-models')
            .update({ model_version: parts[1] })
            .eq(
              'instance_data',
              CDNURL + user.identities[0].id + '/' + zipFileName
            )
            .select();
          if (trainingStatusResponse.error)
            console.log(trainingStatusResponse.error);
          if (trainingStatusResponse.data) {
            setIsTraining(false);
            setUploadedImages([]);
            setZipFiles([]);
            setIsUploaded(false);
            console.log(trainingStatusResponse.data[0]);
          }
          setIsImagesButtonClicked(false);
          setInstancePrompt(null);
          setClassPrompt(null);
          // update the local storage...
          console.log('trainingStatusResponse: ', trainingStatusResponse);
          const localInstances = localStorage.getItem('storedInstances');
          if (localInstances) {
            let localInstancesJson = JSON.parse(localInstances);
            localInstancesJson.push(trainingStatusResponse.data[0]);
            localStorage.setItem(
              'storedInstances',
              JSON.stringify(localInstancesJson)
            );
          }
          router.push({
            pathname: '/generate-images',
            query: { message: 'congrats, now begin generating!' }
          });
        }
        if ([null, 'canceled'].includes(trainingStatus.data.status)) {
          setIsTraining(false);
          setUploadedImages([]);
          setZipFiles([]);
          //setTrainingText('Upload zip file and begin training.');
        }
        setStatus(trainingStatus.data.status);
      }
    }
  }

  useEffect(() => {
    // if !(status == null || status == 'canceled' || status == 'succeeded')
    if (![null, 'canceled', 'succeeded'].includes(status)) {
      interval.current = setInterval(() => {
        console.log('status: ', status);
        getTrainingStatus();
      }, 2000);
    }
    // at every 2 seconds, an 'interval' is created via calling setInterval().
    // clearInterval literally 'clears' the interval at the end of every 2 seconds before a new interval is created
    // otherwise, new instances of 'interval' are created, and you end up printing past + present values of status
    return () => clearInterval(interval.current);
  }, [status]);

  const loadingWhileTraining = isTraining && (
    <div className={styles['black-text']}>
      <LoadingDots /> {statusPercentage}%
      <p>Please do not refresh or you will lose all progress!</p>
    </div>
  );

  useEffect(() => {
    // Set initial text based on status
    updateTrainingText();
  }, []);

  useEffect(() => {
    // Update training text whenever status changes
    updateTrainingText();
  }, [status]);

  useEffect(() => {
    // Cleanup function to reset status when trainingText is 'Training completed!'
    if (trainingText === 'Training completed!') {
      const timeoutId = setTimeout(() => {
        setStatus(null);
        setZipFileName(null); // Assuming setStatus is a function to update the status
        setIsImagesButtonClicked(false);
      }, 3000); // 3 seconds delay

      // Clear the timeout if component unmounts or trainingText changes before the timeout
      setStatusPercentage(0);
      return () => clearTimeout(timeoutId);
    }
  }, [trainingText]);

  const updateTrainingText = () => {
    if (status === 'queued') {
      setTrainingText('Getting Ready...');
    } else if (status === 'processing') {
      setTrainingText('Training Now...');
    } else if (status === 'pushing') {
      setTrainingText('Finalizing...');
    } else if (status === 'succeeded') {
      setTrainingText('Training completed!');
    } else {
      setTrainingText('Upload images');
    }
  };

  function renderView() {
    // currently working with free users
    //if (subscription) {
    return (
      <section className="bg-white mb-32">
        <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
              Create Your AI Model
            </h1>
            <br></br>
            {/** working with free users */}
            {/*<p className="text-black sm:text-center">
              Number of training sessions available: {numTokens} /{' '}
              {numTieredTokens}
            </p>*/}
            <br></br>
            <p className="text-black sm:text-center">
              Give your Product an identity!
            </p>
            <br></br>
            <p className="text-black sm:text-center">
              Training takes <strong>30-60 mins</strong>—perfect time for a
              coffee break! When done, you'll be redirected to "Generate
              Images."
            </p>

            <br></br>
            <p
              className="text-black sm:text-center"
              //style={{ color: 'var(--text-secondary)' }}
            >
              {trainingText}
              <br />
            </p>
            {isTraining ? (
              <div style={{ textAlign: 'center', color: 'black' }}>
                {loadingWhileTraining}
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center' }}>
                  <br />
                  <label
                    htmlFor="instancePrompt"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name of Product/Brand:
                  </label>
                  <input
                    type="text"
                    id="instancePrompt"
                    name="instancePrompt"
                    onChange={handleChangeInstancePrompt}
                    value={instancePrompt || ''}
                    //defaultValue={instancePrompt}
                    placeholder="Enter name of product/brand to train"
                    style={{ width: '420px' }}
                    className="border-2 border-gray-300 rounded-md placeholder:pl-1 text-black"
                  />
                  <br></br>
                  <br></br>
                  <label
                    htmlFor="classPrompt"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category of Product/Brand:
                  </label>
                  <input
                    type="text"
                    id="classPrompt"
                    name="classPrompt"
                    onChange={handleChangeClassPrompt}
                    value={classPrompt || ''}
                    //defaultValue={classPrompt}
                    placeholder="Enter product category e.g., VR headset, lotion, etc"
                    style={{ width: '420px' }}
                    className="border-2 border-gray-300 rounded-md placeholder:pl-1 text-black"
                  />
                </div>
                <br></br>
                {/** ignore this below */}
                {/* <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
                <Form.Control
                  type="file"
                  //accept="image/png, image/jpeg"
                  accept="*"
                  onChange={(e) => uploadFile(e)}
                />
          </Form.Group>*/}
                <div className={styles['image-card']}>
                  <p className="sm:text-center">
                    Upload 3-20+ images of your product in various angles,
                    perspectives, and lighting.
                  </p>
                  <div className={styles['image-top']}></div>
                  <div
                    className={styles['drag-area']}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    {isDragging ? (
                      <span className={styles['select']}>Drop files here</span>
                    ) : (
                      <>
                        Drag & Drop image here or{' '}
                        <span
                          className={styles['select']}
                          role="button"
                          onClick={selectFiles}
                        >
                          Browse
                        </span>
                      </>
                    )}

                    <input
                      name="file"
                      type="file"
                      className={styles['file']}
                      multiple
                      ref={fileInputRef}
                      onChange={onFileSelect}
                    ></input>
                  </div>
                  <div className={styles['image-container']}>
                    {uploadedImages.map((images, index) => (
                      <div className={styles['image']} key={index}>
                        <span
                          className={styles['delete']}
                          onClick={() => deleteImage(index)}
                        >
                          &times;
                        </span>
                        <Image
                          src={images.url}
                          alt={images.name}
                          width={300}
                          height={200}
                        />
                      </div>
                    ))}
                  </div>

                  {/* replace the HTML below */}
                  <button
                    type="button"
                    onClick={uploadImages}
                    disabled={isImagesButtonClicked}
                    style={{
                      backgroundColor: isImagesButtonClicked
                        ? 'gray'
                        : 'var(--secondary)'
                    }}
                  >
                    {isImagesButtonClicked
                      ? zipFileName
                        ? 'Go train'
                        : 'Please wait'
                      : 'Upload'}
                  </button>
                </div>
                {/* 
              to get an image: CDNURL + user.id + "/" + image.name
              images: [image1, image2, image3]
          */}
                <Row xs={1} md={3} className="g-4">
                  <div className="flex flex-col items-center sm:flex-col sm:items-center">
                    <br></br>
                    {console.log('zipFileName: ', zipFileName)}
                    {zipFileName && (
                      <Button
                        variant="slim"
                        onClick={() => trainModel(instancePrompt, classPrompt)}
                      >
                        Train Model
                      </Button>
                    )}
                  </div>
                </Row>
                <br></br>
              </div>
            )}
          </div>
        </div>
      </section>
    );
    /*} else {
      return (
        <section className="bg-white mb-32">
          <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:flex-col sm:align-center">
              <h1 className="text-4xl font-extrabold text-black sm:text-center sm:text-6xl">
                Training page
              </h1>
              <br></br>
              <br></br>
              <h1 className="text-black">You are not subscribed yet!</h1>
            </div>
          </div>
        </section>
      );
    }*/
  }

  return <div className="App">{renderView()}</div>;
}
