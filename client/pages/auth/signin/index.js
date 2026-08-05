import { useState, useEffect } from 'react';
import Router from 'next/router';
import useRequest from '../../../hooks/useRequest';
import Form from '../../../components/Form';

const SignIn = ({ currentUser }) => {
  useEffect(() => {
    if (currentUser) Router.push('/');
  }, [currentUser]);
  // Stores the current values entered into the sign-up form.
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const fields = [
    {
      name: 'email',
      type: 'email',
      label: 'Email Address',
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
    },
  ];
  // Configure the reusable request hook.
  // Calling doRequest() will submit the request and automatically
  // populate the errors array if the API returns validation errors.
  const { doRequest, errors } = useRequest({
    url: '/api/users/signin',
    method: 'post',
    body: {
      email: formData.email,
      password: formData.password,
    },
    onSuccess: () => Router.push('/'),
  });

  // Prevent the browser from refreshing the page and instead
  // submit the form using our custom request hook.
  const onFormSubmit = async (e) => {
    e.preventDefault();
    doRequest();
  };

  if (currentUser) return null;

  return (
    <Form
      formData={formData}
      setFormData={setFormData}
      onFormSubmit={onFormSubmit}
      errors={errors}
      formName={'Sign In'}
      fields={fields}
    />
  );
};

SignIn.publicPage = true;

export default SignIn;
