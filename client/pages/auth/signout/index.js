import { useEffect } from 'react';
import useRequest from '../../../hooks/useRequest';
import Router from 'next/router';

const SignOut = () => {
  const { doRequest } = useRequest({
    url: '/api/users/signout',
    method: 'post',
    body: {},
  });

  useEffect(() => {
    // Regardless of whether the server confirms the session was cleared,
    // send the user to /signin so the app re-checks currentUser and stops
    // showing a stale signed-in state. Without this, a failed request
    // (e.g. the auth service being mid-restart) leaves the page stuck on
    // "Signing you out..." forever.
    doRequest().finally(() => Router.push('/signin'));
  }, []);

  return <div>Signing you out...</div>;
};

export default SignOut;
