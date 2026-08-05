import 'bootstrap/dist/css/bootstrap.css';
import Router from 'next/router';
import Navbar from '../components/Header';
import buildClient from '../api/build-client';

const AppComponent = ({ Component, pageProps, currentUser }) => {
  return (
    <div>
      <Navbar currentUser={currentUser} />
      <div className="container">
        <Component {...pageProps} currentUser={currentUser} />
      </div>
    </div>
  );
};

AppComponent.getInitialProps = async (appContext) => {
  const client = buildClient(appContext.ctx);
  const { data } = await client.get('/api/users/currentuser');

  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(
      appContext.ctx,
      client,
      data.currentUser,
    );
  }

  // Pages are protected by default. Opt out by setting
  // `Component.publicPage = true` on pages anyone can view signed out.
  if (!data.currentUser && !appContext.Component.publicPage) {
    const { res } = appContext.ctx;
    if (res) {
      res.writeHead(302, { Location: '/' });
      res.end();
    } else {
      Router.push('/');
    }
  }

  return { pageProps, currentUser: data.currentUser };
};

export default AppComponent;
