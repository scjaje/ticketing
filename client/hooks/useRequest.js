import axios from 'axios';
import { useState } from 'react';

/**
 * Custom hook for making API requests.
 *
 * Automatically tracks any validation or server errors returned
 * from the request and optionally calls a success callback.
 *
 * @param {Object} options - Configuration for the request.
 * @param {string} options.url - The API endpoint to send the request to.
 * @param {string} options.method - The HTTP method (e.g. 'get', 'post').
 * @param {Object} options.body - The request body sent with the request.
 * @param {Function} [options.onSuccess] - Optional callback that runs when the request succeeds.
 *
 * @returns {{
 *   doRequest: Function,
 *   isLoading: Boolean,
 *   errors: Array
 * }} An object containing the request function and any returned errors.
 */
export default function useRequest({ url, method, body, onSuccess }) {
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Sends the configured request to the server.
   *
   * Clears any previous errors before making the request.
   * If the request succeeds, the optional onSuccess callback
   * is executed and the response data is returned.
   * If the request fails, any server validation errors are stored.
   *
   * @returns {Promise<Object|undefined>} The response data if successful.
   */
  const doRequest = async () => {
    let response;

    try {
      setErrors([]);
      response = await axios[method](url, body);
    } catch (err) {
      setErrors(
        err.response?.data?.errors ?? [
          { message: 'Something went wrong. Please try again.' },
        ],
      );
      setIsLoading(false);
      return;
    }
    setIsLoading(false);

    if (onSuccess) {
      onSuccess(response.data);
    }

    return response.data;
  };

  return { doRequest, isLoading, errors };
}
