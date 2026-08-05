import Link from 'next/link';
import buildClient from '../api/build-client';

const LandingPage = ({ currentUser, tickets }) => {
  if (!currentUser) {
    return <h1>You are not signed in. </h1>;
  } else {
    return (
      <div>
        <h1>Tickets</h1>

        {tickets?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Price</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((data) => {
                return (
                  <tr key={data.id}>
                    <td>{data.title}</td>
                    <td>{data.price}</td>
                    <td>
                      <Link href={`tickets/${data.id}`}> View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div>There are currently no tickets. </div>
        )}
      </div>
    );
  }
};

LandingPage.getInitialProps = async (context, client, currentUser) => {
  const { data } = await client.get('/api/tickets');
  return { tickets: data };
};

LandingPage.publicPage = true;

export default LandingPage;
