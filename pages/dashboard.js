import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from 'axios';
import { Card } from 'react-bootstrap';
import Select from 'react-select';

// import trainML's config code
import config from './api/config';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const { userLoaded, user, session, userDetails, subscription } = useUser();
  const [ganBase64, setGanBase64] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [imageLabel, setImageLabel] = useState(null);
  const [imageAPI, setImageAPI] = useState(null);

  const getImage = async () => {
    try {
      const resp = await axios.post(
        `${imageAPI.api_address}${imageAPI.route_path}`
      );
      console.log(resp.data);
      return resp.data;
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response);
      } else {
        console.log(error);
      }
    }
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

  /*const imageTypes = [
    { value: 'face1', label: 'Face1' },
    { value: 'face2', label: 'Face2' }
  ];*/

  // handle onChange event of the dropdown
  const handleChange = (e) => {
    setImageLabel(e.label);
    console.log('Image Type selected: ', e.label);
    setImageAPI(e.value);
    console.log('Image API selected: ', e.value);
  };

  const displayContent = showImage && (
    <img alt="uploaded" src={`data:image/png;base64,${ganBase64}`} />
  );

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
        <div>
          <Select
            placeholder="Select Option"
            value={config.find((obj) => obj.value === imageLabel)} // set selected value
            options={config} // set list of the data
            onChange={handleChange} // assign onChange function
          />
          <Button
            onClick={async () => {
              const result = await getImage();
              if (result) {
                const ganImage = Object.entries(result)[0];
                alert(ganImage[1]);
                setGanBase64(ganImage[1]);
                setShowImage(true);
              } else {
                alert('nothing generated');
              }
            }}
          >
            Get Image
          </Button>
          {/*displayContent*/}
          {imageLabel && displayContent}
        </div>
      ) : (
        <h1>You are not subscribed yet!</h1>
      )}
    </div>
  );
}
