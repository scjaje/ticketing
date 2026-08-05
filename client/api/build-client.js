import axios from 'axios';

/**
 * Runs before the page is rendered.
 * Fetches the current user's information so it is available as props
 * whether the page is rendered on the server or in the browser.
 */
export default ({ req }) => {
  // Next.js runs getInitialProps on both the server and the browser.
  // We need to make the request differently depending on where this code is executing.
  if (typeof window === 'undefined') {
    // window only exists in the browser.
    // If it's undefined, this code is running on the server.

    // When running on the server, there is no browser to proxy requests through
    // the ingress. Instead, we communicate directly with the ingress controller
    // using Kubernetes' internal DNS name.

    // kubectl get services
    // To see the services in the namespace:
    // get services -n ingress-nginx

    // Then send the request to:
    // http://NAMEOFSERVICE.NAMESPACE.svc.cluster.local/

    // You have to pass the headers that match what is in the ingress-srv.yaml so
    // it knows where to send the request

    // Forward the original request headers so the ingress controller can
    // determine which service should handle this request. This also preserves
    // cookies for authentication.
    return axios.create({
      baseURL:
        'http://ingress-nginx-controller.ingress-nginx.svc.cluster.local',
      headers: req.headers,
    });
  } else {
    // In the browser, requests automatically go through the current domain,
    // so a relative URL is enough.
    return axios.create({
      baseURL: '/',
    });
  }
};
