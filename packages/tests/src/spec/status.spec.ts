import axios, { AxiosError } from 'axios';
import { expect } from 'chai';
import { env } from '../lib/env';

describe('/status', () => {
  describe('Get node status', () => {
    it('Should return expected setting properties as a response', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/status`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error).to.be.undefined;

      // Check response
      expect(response?.status).to.be.equal(200);
      expect(response?.data).to.be.an('object');
      expect(response?.data?.maxKeyLength).to.be.an('number');
      expect(response?.data?.maxValueLength).to.be.an('number');
      expect(response?.data?.hostname).to.be.an('string');
    });
  });
});
