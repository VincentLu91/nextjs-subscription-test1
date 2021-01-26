import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { postData } from '../utils/helpers';
import { useUser } from '../components/UserContext';
import LoadingDots from '../components/ui/LoadingDots';
import Button from '../components/ui/Button';
import axios from "axios";
import { Card } from "react-bootstrap";

function ImageCard({ category, description, footer, children }) {
  return (
    <div className="border border-accents-1	max-w-3xl w-full p rounded-md m-auto my-8">
      <div className="px-5 py-4">
        <h3 className="text-2xl mb-1 font-medium">{category}</h3>
        <p className="text-accents-5">{description}</p>
        {children}
      </div>
      <div className="border-t border-accents-1 bg-primary-2 p-4 text-accents-3 rounded-b-md">
        {footer}
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState([]);
  const [visible, setVisible] = useState(5);
  const router = useRouter();
  const { userLoaded, user, session, userDetails, subscription } = useUser();

  useEffect(() => {
    if (!user) router.replace('/signin');
	allCardData();
  }, [user], []);

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
  
  const allCardData = async () => {
      const response = await axios.get("https://randomuser.me/api/?results=35");
      setCardData(response.data.results);
  };
  
  const renderCard = (person, index) => {
      return (
        <Card style={{ width: "18rem" }}>
          <Card.Img variant="top" src={person.picture.large} />
          <Card.Body>
            <Card.Title>
              {person.name.first} {person.name.last}
            </Card.Title>
            <Card.Text>
              <ul>
                <li>{person.email}</li>
                <li>{person.cell}</li>
                <li>{person.gender}</li>
              </ul>
            </Card.Text>
          </Card.Body>
        </Card>
      );
  };
  const loadMore = () => {
      setVisible(visible + 5);
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
		{subscriptionPrice > 0 ? // goal of this is to restrict content to subscribers.
	      <div className="wrapper">
	        <div className="cards">
	          {cardData.slice(0, visible).map(renderCard)}
	        </div>
	      </div>
	      /*{visible < cardData.length && (
	        <button onClick={loadMore}>Load 5 More</button>
	      )}*/
		  :
		  <h1>You are not subscribed yet!</h1>
	    }
	    </div>
	);
}
