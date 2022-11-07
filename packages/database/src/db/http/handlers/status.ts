import { env } from '../../../lib/env';
import { RequestHandler } from '../../../net/http';
import { dbMaxKeyLength, dbMaxValueLength } from '../../nkv-database';

/**
 * Provide server settings
 * @todo move this handler to different directory
 */
export const status: RequestHandler = async (db) => {
  // Response
  return {
    version: '0.0.1',
    hostname: env.hostname,
    port: env.port,
    maxKeyLength: dbMaxKeyLength,
    maxValueLength: dbMaxValueLength,
    availableRecords: await db.size()
  };
};
