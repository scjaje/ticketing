import { useState } from 'react';
import Router from 'next/router';
import Form from '../../components/Form';
import useRequest from '../../hooks/useRequest';

const NewTicketsPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
  });

  const fields = [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price',
      onBlur: true,
    },
  ];

  // Configure the reusable request hook.
  // Calling doRequest() will submit the request and automatically
  // populate the errors array if the API returns validation errors.
  const { doRequest, errors } = useRequest({
    url: '/api/tickets',
    method: 'post',
    body: {
      title: formData.title,
      price: formData.price,
    },
    onSuccess: () => Router.push('/'),
  });

  const onFormSubmit = async (e) => {
    e.preventDefault();
    doRequest();
  };

  return (
    <Form
      formData={formData}
      setFormData={setFormData}
      onFormSubmit={onFormSubmit}
      errors={errors}
      formName={'Create a Ticket'}
      fields={fields}
    />
  );
};

export default NewTicketsPage;
