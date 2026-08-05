import Router from 'next/router';
import useRequest from '../../../hooks/useRequest';

export default function TicketsPage({ ticket }) {
  const { doRequest, errors } = useRequest({
    url: '/api/orders',
    method: 'post',
    body: {
      ticketId: ticket.id,
    },
    onSuccess: (order) => Router.push(`/orders/${order.id}`),
  });

  const submitOrder = (e) => {
    e.preventDefault();
    doRequest();
  };

  return (
    <div>
      <h1>{ticket.title}</h1>
      <h4>Price: {ticket.price}</h4>
      {errors.length ? (
        <div className="alert alert-danger">
          <h4>Ooops....</h4>
          <ul className="my-0">
            {errors.map((err) => (
              <li key={err.message}>{err.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <button className="btn btn-primary" onClick={submitOrder}>
        Purchase
      </button>
    </div>
  );
}

TicketsPage.getInitialProps = async (context, client) => {
  const { ticketId } = context.query;
  const { data } = await client.get(`/api/tickets/${ticketId}`);

  return { ticket: data };
};
