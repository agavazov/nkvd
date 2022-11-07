import { NkvDatabase, StorageRecord } from './nkv-database';

export class MemoryDb implements NkvDatabase {
  /**
   * In memory storage
   * It can be anything you want
   */
  storage: StorageRecord = {};

  /**
   * Add new record or update existing one
   *
   * @param key the key of the record
   * @param value the string value of the record
   */
  async set(key: string, value: string) {
    this.storage[key] = value;
  }

  /**
   * Get a record
   */
  async get(key: string): Promise<string | undefined> {
    return this.storage?.[key];
  }

  /**
   * Clear the storage
   */
  async clear(): Promise<void> {
    this.storage = {};
  }

  /**
   * Get all records
   *
   * @param callback lambda/callback function which will
   * transform the records to the appropriate format
   */
  async getAll<R>(callback: (records: StorageRecord) => R[]): Promise<R[]> {
    return callback(this.storage);
  }

  /**
   * Check if the record exists
   *
   * @param key the key of the record
   */
  async exist(key: string): Promise<boolean> {
    return typeof this.storage[key] !== 'undefined';
  }

  /**
   * Remove a record
   *
   * @param key the key of the record
   */
  async rm(key: string): Promise<void> {
    if (await this.exist(key)) {
      delete this.storage[key];
    }
  }

  /**
   * Return the number of the stored records
   */
  async size(): Promise<number> {
    return Object.keys(this.storage).length;
  }
}
