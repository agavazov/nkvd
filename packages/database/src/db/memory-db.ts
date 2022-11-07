import { NkvDatabase, StorageRecord } from './nkv-database';

export class MemoryDb implements NkvDatabase {
  storage: StorageRecord = {};

  async set(key: string, value: string) {
    this.storage[key] = value;
  }

  async get(key: string): Promise<string | undefined> {
    return this.storage?.[key];
  }

  async clear(): Promise<void> {
    this.storage = {};
  }

  async getAll<R>(callback: (records: StorageRecord) => R[]): Promise<R[]> {
    return callback(this.storage);
  }

  async exist(key: string): Promise<boolean> {
    return typeof this.storage[key] !== 'undefined';
  }

  async rm(key: string): Promise<void> {
    if (await this.exist(key)) {
      delete this.storage[key];
    }
  }

  async size(): Promise<number> {
    return Object.keys(this.storage).length;
  }
}
