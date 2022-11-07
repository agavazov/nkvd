import axios, { AxiosError } from 'axios';
import { expect } from 'chai';
import { env } from '../lib/env';

describe('/getKeys command', () => {
  describe('Successful clear all the records', () => {
    it('Should [clear all records] without error', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/clear`;
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
  });

  describe('Successful get all the keys', () => {
    const testRecords = [...Array(10).keys()].map(key => ({
      k: `test:getKeys:k:${key}`,
      v: `test:getKeys:v:${key}`
    }));

    it(`Should save [TWICE ${testRecords.length} records] without error`, async () => {
      for (let i = 1; i <= 2; i++) {
        for (const testItem of testRecords) {
          let response;
          let error: AxiosError<any> | undefined;

          try {
            const url = `${env.serviceUrl}/set?k=${testItem.k}&v=${testItem.v}`;
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
        }
      }
    });

    it('Should [get the SAME UNIQUE records keys] without error', async () => {
      let response;
      let error: AxiosError<any> | undefined;

      try {
        const url = `${env.serviceUrl}/getKeys`;
        response = await axios.get(url);
      } catch (e) {
        error = e as AxiosError<any>;
      }

      // Check errors
      expect(error).to.be.undefined;

      // Check response
      expect(response?.status).to.be.equal(200);
      expect(response?.data).to.be.an('array');
      expect(response?.data.length).to.be.greaterThanOrEqual(testRecords.length);

      // Compare the records
      for (const testItem of testRecords) {
        const matches = response?.data.filter((dataItem: string) => {
          return dataItem === testItem.k;
        });

        expect(matches.length).to.be.equal(1);
      }
    });
  });
});
