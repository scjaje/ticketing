import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

function CheckoutForm({ order, currentUser }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrors([]);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: { email: currentUser.email },
    });

    if (error) {
      setErrors([{ message: error.message }]);
      setIsLoading(false);
      return;
    }

    try {
      await axios.post('/api/payments', {
        paymentMethodId: paymentMethod.id,
        orderId: order.id,
      });
      router.push('/orders');
    } catch (err) {
      setErrors(err.response.data.errors);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="form-group mt-2">
        <CardElement className="form-control" />
      </div>
      {errors.map((e, i) => (
        <div className="text-danger" key={i}>
          {e.message}
        </div>
      ))}
      <button className="btn btn-primary mt-2" disabled={!stripe || isLoading}>
        Pay
      </button>
    </form>
  );
}

export default function OrdersPage({ order, currentUser }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const findTimeLeft = () => {
      const remainingTime = new Date(order.expiresAt) - new Date();
      setTimeLeft(Math.round(remainingTime / 1000));
    };
    findTimeLeft();
    const timerId = setInterval(findTimeLeft, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [order]);

  return (
    <div>
      This is an individual order: {order.id}. <br />
      {+timeLeft > 0 ? (
        <div>
          Remaining time: {timeLeft} seconds
          <Elements stripe={stripePromise}>
            <CheckoutForm order={order} currentUser={currentUser} />
          </Elements>
        </div>
      ) : (
        <div> Sorry, this order has expired</div>
      )}
    </div>
  );
}

OrdersPage.getInitialProps = async (context, client) => {
  const { orderId } = context.query;
  const { data } = await client.get(`/api/orders/${orderId}`);

  return { order: data };
};
