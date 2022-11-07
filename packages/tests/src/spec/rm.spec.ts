import axios, { AxiosError } from 'axios';
import { expect } from 'chai';
import { env } from '../lib/env';

describe('/rm command', () => {
  describe('Successful record remove', () => {
    const testKey = 'test:rm:1';

    it('Should save [normal record] without error', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/set?k=${testKey}&v=ok`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error).to.be.undefined;

      // Check response
      expect(response?.status).to.be.equal(200);
      expect(response?.data).to.be.an('object');
      expect(response?.data?.success).to.be.equal(true);
    });

    it('Should [remove the same record] without error', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/rm?k=${testKey}`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error).to.be.undefined;

      // Check response
      expect(response?.status).to.be.equal(200);
      expect(response?.data).to.be.an('object');
      expect(response?.data?.success).to.be.equal(true);
    });

    it('Should not allow to remove the same record again with [missing record] error', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/rm?k=${testKey}`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error?.response?.status).to.be.equal(404);
      expect(error).to.be.an('object');
      expect(error?.response?.data?.error).to.be.equal('MISSING_RECORD');

      // Check response
      expect(response?.data).to.be.undefined;
    });
  });

  describe('Fail scenarios', () => {
    it('Should respond with an error for [missing key]', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/rm`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error?.response?.status).to.be.equal(400);
      expect(error).to.be.an('object');
      expect(error?.response?.data?.error).to.be.equal('MISSING_KEY_PARAM');

      // Check response
      expect(response?.data).to.be.undefined;
    });

    it('Should respond with an error for [empty key]', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/rm?k=`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error?.response?.status).to.be.equal(400);
      expect(error).to.be.an('object');
      expect(error?.response?.data?.error).to.be.equal('EMPTY_KEY');

      // Check response
      expect(response?.data).to.be.undefined;
    });

    it('Should respond with an error for [maximum key length] reached', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/rm?k=${'x'.repeat(500)}`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error?.response?.status).to.be.equal(400);
      expect(error).to.be.an('object');
      expect(error?.response?.data?.error).to.be.equal('MAXIMUM_KEY_LENGTH_REACHED');

      // Check response
      expect(response?.data).to.be.undefined;
    });
  });
});
