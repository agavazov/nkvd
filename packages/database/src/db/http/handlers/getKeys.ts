import { RequestHandler } from '../../../net/http';

// . Get all keys
export const getKeys: RequestHandler = async (db) => {
  // Response
  return db.getAll(records => Object.keys(records));
};
