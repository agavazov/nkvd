import axios, { AxiosError } from 'axios';
import { expect } from 'chai';
import { env } from '../lib/env';
import { warmupCheck } from '../lib/warmup-check';

describe('/healthcheck', () => {
  describe('Wait to warmup', () => {
    const tries = 10;

    it('Should be warmed up soon', async () => {
      // Get the status
      const isWarmedUp = await warmupCheck(tries);

      // Test the status
      expect(isWarmedUp).to.be.equal(true);
    }).timeout(10000 * tries);
  });

  describe('Get node health status', () => {
    it('Should be healthy', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/healthcheck`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error).to.be.undefined;

      // Check response
      expect(response?.status).to.be.equal(200);
      expect(response?.data).to.be.an('object');
    });
  });
});
