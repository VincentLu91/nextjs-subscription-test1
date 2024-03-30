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

// https://eolmngjyubxaxlvtwbzs.supabase.co/storage/v1/object/public/images/062f6e29-5681-46f1-a4c4-48e60a441e4d/71894cfe-50dc-46fd-a31d-429671fba93e

const CDNURL =
  'https://eolmngjyubxaxlvtwbzs.supabase.co/storage/v1/object/public/images/';

// CDNURL + user.id + "/" + image.name

export default function Train() {
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
    setTrainingText
  } = useUser();
  const [instanceList, setInstanceList] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
        //link.download = 'snapcial-ai.zip';
        //link.click();
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
      //'cd3f925f7ab21afaef7d45224790eedbb837eeac40d22e8fefe015489ab644aa';
      // https://replicate.com/stability-ai/sdxl/versions
      '7ca7f0d3a51cd993449541539270971d38a24d9a0d42f073caf25190d41346d7';
    if (instancePrompt == null || instancePrompt.trim() == '') {
      alert("You haven't entered anything!");
    } else if (classPrompt == null || classPrompt.trim() == '') {
      alert("You haven't entered anything!");
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
        console.log('training data: ', trainingInfo.data);
        // start making the call to Replicate API to train the model to save model_version
        const resp = axios
          .get(
            '/api/trainImageGen?instance_prompt=' +
              instancePrompt +
              '&class_prompt=a%20photo%20of%20a%20' +
              classPrompt +
              '&instance_data=' +
              CDNURL +
              user.identities[0].id +
              '/' +
              zipFileName +
              '&trainer_version=' +
              trainerVersion
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

  async function getTrainingStatus() {
    if (trainingID) {
      const trainingStatus = await axios.get(
        '/api/trainImageStatus?training_id=' + trainingID
      );
      if (trainingStatus) {
        //console.log('trainingStatus: ', trainingStatus.data.status);
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
            console.log(trainingStatusResponse.data[0]);
          }
        }
        if ([null, 'canceled'].includes(trainingStatus.data.status)) {
          setIsTraining(false);
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
    <div className={styles['white-text']}>
      <LoadingDots />
    </div>
  );

  useEffect(() => {
    if (status === 'queued') {
      setTrainingText('Getting Ready...');
    } else if (status === 'processing') {
      setTrainingText('Training Now...');
    } else if (status === 'pushing') {
      setTrainingText('Finalizing...');
    } else if (status === 'succeeded') {
      setTrainingText('Training completed!');
    } else {
      setTrainingText('Upload zip file and begin training.');
    }
  }, [status]);

  function renderView() {
    if (subscription) {
      return (
        <div>
          <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
            Training page
          </h1>
          <br></br>
          <br></br>
          {trainingText}
          {isTraining ? (
            <h1>{loadingWhileTraining}</h1>
          ) : (
            <div className={styles['white-text']}>
              <br></br>
              <Form.Group className="mb-3" style={{ maxWidth: '500px' }}>
                <Form.Control
                  type="file"
                  //accept="image/png, image/jpeg"
                  accept="*"
                  onChange={(e) => uploadFile(e)}
                />
              </Form.Group>
              <div className={styles['image-card']}>
                <div className={styles['image-top']}>
                  <p>Drag & Drop image uploading</p>
                </div>
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

                <button type="button" onClick={uploadImages}>
                  Upload
                </button>
              </div>
              {/* 
              to get an image: CDNURL + user.id + "/" + image.name
              images: [image1, image2, image3]
          */}
              <Row xs={1} md={3} className="g-4">
                {zipFiles.map((file) => {
                  return (
                    <div className={styles['get-image-button']}>
                      <Col>
                        <Card>
                          <Card.Img
                            variant="top"
                            src={CDNURL + user.id + '/' + file.name}
                          />
                          <Card.Body>
                            <Button
                              variant="danger"
                              onClick={() => deleteFile(file.name)}
                            >
                              Delete File
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                      <br></br>
                      <input
                        type="text"
                        id="instancePrompt"
                        name="instancePrompt"
                        onChange={handleChangeInstancePrompt}
                        value={instancePrompt || ''}
                        //defaultValue={instancePrompt}
                        placeholder="Enter name of product/brand to train"
                        style={{ width: '420px' }}
                      />
                      <br></br>
                      <input
                        type="text"
                        id="classPrompt"
                        name="classPrompt"
                        onChange={handleChangeClassPrompt}
                        value={classPrompt || ''}
                        //defaultValue={classPrompt}
                        placeholder="Enter class of product/brand to train"
                        style={{ width: '420px' }}
                      />
                      <br></br>
                      {console.log('zipFileName: ', zipFileName)}
                      <Button
                        onClick={() => trainModel(instancePrompt, classPrompt)}
                      >
                        Train Model
                      </Button>
                    </div>
                  );
                })}
              </Row>
              <br></br>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div>
          <h1 className="text-4xl text-white sm:text-center sm:text-6xl">
            Training page
          </h1>
          <br></br>
          <br></br>
          <h1>You are not subscribed yet!</h1>
        </div>
      );
    }
  }

  return <div className="App">{renderView()}</div>;
}
