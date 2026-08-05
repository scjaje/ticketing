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

export default function UsersOrdersPage({ orders, currentUser }) {
  return (
    <div>
      {orders.length ? (
        <ul>
          {orders.map((order) => {
            return (
              <li id="order.id">
                Title: {order.ticket.title} - {order.status}
              </li>
            );
          })}
        </ul>
      ) : (
        <div> You currently do not have any orders.</div>
      )}
    </div>
  );
}

UsersOrdersPage.getInitialProps = async (context, client) => {
  const { data } = await client.get(`/api/orders`);

  return { orders: data };
};
