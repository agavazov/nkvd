import * as dbHandlers from './db/http/handlerRegister';
import { MemoryDb } from './db/memory-db';
import { env } from './lib/env';
import { Event, HttpServer } from './net/http';
import { Mesh } from './net/mesh';

/**
 * 3 services are started here: Database, HTTP server and Mesh Network
 *
 * # Database
 * After we have selected and initialized an adapter for the database,
 * we need to provide it to the HTTP server and register
 * request handlers to take care of servicing client requests.
 * Requests are separated into two types mutable & immutable
 * - Mutable requests change data in database storage.
 *   They must be replicated to the other nodes via the mesh network.
 * - Immutables are executed per node and have no impact on the data
 *
 * # HTTP server
 * The HTTP server is simple, but perfectly covers the goals of the current service.
 * It is based on events and dynamic registration of handlers.
 * In this way, we can restore additional services without the
 * need to interrupt the running services.
 * Supports only GET requests with query params and returns only JSON response
 *
 * # Mesh
 * Dynamically append service that takes care of finding neighboring
 * nodes and parallel synchronization between them.
 * The basic principle is to check if other nodes are alive by providing
 * them with the available list of own nodes at each query аnd at the same time
 * it expects them to return their list of nodes
 * In this way, the network is automatically updated
 */
(async () => {
  // Init DB & HTTP and combine them
  const db = new MemoryDb();

  const server = new HttpServer<MemoryDb>(db, env.port);

  // Start the http listener
  server.connect();

  // Print hello world when the server is ready
  server.on(Event.Connect, ({ port }) => {
    console.log(`[i] DB is listening on http://127.0.0.1:${port}`);
  });

  // Register database http handlers
  {
    // Set record ?k=KEY&v=VALUE @mutable
    server.handle('/set', dbHandlers.set);

    // Get record ?k=KEY&v=VALUE
    server.handle('/get', dbHandlers.get);

    // Remove record ?k=KEY @mutable
    server.handle('/rm', dbHandlers.rm);

    // Clear all records @mutable
    server.handle('/clear', dbHandlers.clear);

    // Is exists ?k=KEY
    server.handle('/is', dbHandlers.is);

    // Get all keys
    server.handle('/getKeys', dbHandlers.getKeys);

    // Get all values
    server.handle('/getValues', dbHandlers.getValues);

    // Get all records
    server.handle('/getAll', dbHandlers.getAll);

    // Check is the server return http code 200
    server.handle('/healthcheck', dbHandlers.healthcheck);

    // Get server settings
    server.handle('/status', dbHandlers.status);
  }

  // Extend server to work in a network mesh only if there is a mesh network to join
  // Without interrupt current functionality
  if (env.meshNetworkUrl) {
    // Init the mesh class
    const mesh = new Mesh({
      host: env.hostname,
      port: env.port,
      isDown: false
    }, env.meshNetworkUrl);

    // Handle the `ping` request by providing the current service
    // nodes and the other service nodes provided in the URL
    server.handle('/ping', (db, params) => {
      // Check for passed nodes from the others
      mesh.unSerialize(String(params?.nodes))?.forEach((n: any) => mesh.join(n, 'passed'));

      // Return current nodes to the others
      return { nodes: mesh.nodes };
    });

    // When some @mutable command is accessed, we need to replicate the request to the network
    // The replication is async, so it does not slow down the execution of the main process
    server.on(Event.RequestComplete, ({ path, params, responseData }) => {
      // Skip if the request is not changing anything to the database storage
      if (['/set', '/rm', '/clear'].indexOf(path) === -1) {
        return;
      }

      // If the handler returns errors, it means that the operation
      // was not successful and will not be replicated
      if (responseData?.error) {
        return;
      }

      // Replicate the request to all nodes in the mesh
      mesh.replicate(path, params)
        .catch(console.error);
    });
  }
})();
