import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useContext } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import Select from 'react-select';
import styles from '../styles/Home.module.css';

// import trainML's config code
import contentTypes from './api/contentTypes';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const {
    userLoaded,
    user,
    session,
    userDetails,
    subscription,
    setImageLink,
    imageList,
    setImageList,
    isLoading,
    setIsLoading,
    contentPrompt,
    setcontentPrompt
  } = useUser();

  const getImage = async (contentPrompt) => {
    const resp = await axios.get(
      '/api/imagepredictions?prompt=' + contentPrompt
    );
    //alert('Resp data is: ', resp.data);
    return resp.data;
  };

  useEffect(
    () => {
      if (!user) router.replace('/signin');
    },
    [user],
    []
  );

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
    setcontentPrompt(e.target.value);
    console.log('contentPrompt: ', e.target.value);
  };

  const loadingWithContentPrompt = isLoading && (
    <div className={styles['white-text']}>
      <p>Loading...</p>
      <LoadingDots />
    </div>
  );

  const viewGeneratedContent = (url) => {
    setImageLink(url);
    router.push('/view-content');
  };

  const renderCard = (image, index) => {
    return (
      <Card
        style={{ width: '10rem', backgroundColor: 'orange' }} // the smaller the width, the more columns of images displayed
        key={index}
        className={styles['box']}
      >
        <Card.Img variant="top" src={image.url} />
        <Card.Body>
          <Card.Text>{image.text}</Card.Text>
          <Button
            variant="primary"
            onClick={() => viewGeneratedContent(image.url)}
          >
            View Content
          </Button>
        </Card.Body>
      </Card>
    );
  };

  const subscriptionName = subscription && subscription.prices.products.name;
  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription.prices.currency,
      minimumFractionDigits: 0
    }).format(subscription.prices.unit_amount / 100);

  return (
    <div className="App">
      {subscription ? ( // goal of this is to restrict content to subscribers.
        <div className={styles['get-image-button']}>
          <input
            type="text"
            id="contentPrompt"
            name="contentPrompt"
            onChange={handleChange}
            value={contentPrompt}
            defaultValue={contentPrompt}
            placeholder="Generate image of your product"
            style={{ width: '370px' }}
          />
          <br></br>
          <Button
            onClick={async () => {
              if (contentPrompt == null || contentPrompt.trim() == '') {
                alert('Please enter a contentPrompt');
              } else {
                setImageList([]); // when generation begins, list of images is empty
                let i = 0;
                setIsLoading(true);
                for (i = 0; i < 2; i++) {
                  // 2 is a placeholder, later I plan to generate 16 images
                  const result = await getImage(contentPrompt);
                  if (result) {
                    setImageList((current) => [
                      ...current,
                      { url: result, text: '' } // placeholder text is empty for optional caption generation
                    ]);
                  } else {
                    alert('nothing generated');
                  }
                }
                setIsLoading(false);
              }
            }}
          >
            Generate Image
          </Button>
          <br></br>
          {loadingWithContentPrompt}
          <div className={styles['grid']}>{imageList.map(renderCard)}</div>
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
