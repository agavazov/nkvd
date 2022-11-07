import axios, { AxiosError, HttpStatusCode } from 'axios';
import { env } from './env';

// Warmup (unavailable) HTTP status code
const waitingStatusCode = HttpStatusCode.ServiceUnavailable; // 503

// . check when the service is warmed up
export const warmupCheck = async (tries = 15): Promise<boolean> => {
  // . loop with few tries and sleeps till the service is warmed up
  for (let i = 1; i <= tries; i++) {
    let response;
    let error: AxiosError<any> | undefined;

    try {
      response = await axios.get(`${env.serviceUrl}/`);
    } catch (e) {
      error = e as AxiosError<any>;
    }

    // Get the status code from the response or from the error
    const statusCode = response?.status || error?.response?.status;

    // Break the process when the status is different from warm up
    if (statusCode !== waitingStatusCode) {
      return true;
    }

    // Sleep for 1 second
    await new Promise(r => setTimeout(r, 1000));
  }

  // After the loop ends and if there is no difference status code than warmup (unavailable)
  return false;
};
