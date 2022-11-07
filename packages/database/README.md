# [Database](https://github.com/agavazov/nkvd/tree/main/packages/database/)

The database is based on 3 parts: Storage, HTTP Server, Mesh Network. Each of the parts can
function independently or in this case they can be connected and a centralized service
can be obtained.

## Storage

At the moment the storage is nothing special. It is based on an interface that requires
the provision of several methods such as: `set`,`get`,`clear`,`getAll`,`exist`,`rm`,`size`.

After that an adapter can be written to work with Mongo, Redis, Files or any other type of storage.
Here is an example of how **basic in-memory** storage can be done

```typescript
import { NkvDatabase, StorageRecord } from './nkv-database';

export class MemoryDb implements NkvDatabase {
  // ...
}
```

## HTTP server

The HTTP server is simple, but perfectly covers the goals of the current service. It is based on events and dynamic
registration of handlers. In this way, we can restore additional services without the need to interrupt the running
services. Supports only GET requests with query params and returns only JSON response.

### Commands

| Route            | Summary                                           |
|------------------|---------------------------------------------------|
| /set?k={k}&v={v} | Set key k with value v                            |
| /get?k={k}       | Gets value with key k (`404` for missing keys)    |
| /rm?k={k}        | Removes key k (`404` for missing keys)            |
| /clear           | Removes all keys and values                       |
| /is?k={k}        | Check if key exists (`200` for yes, `404` for no) |
| /getKeys         | Should return all the keys in the store           |
| /getValues       | Should return all the values in the store         |
| /getAll          | Should return all pairs of key and value          |
| /healthcheck     | Return the health status                          |
| /status          | Settings of the node                              |
| /ping            | Join/invite the instance to the mesh              |

### Server events & Request lifecycle

The request lifecycle looks like this

1. `Events.RequestStart` When a new request arrives.
   `Data`: Income parameters
2. `Events.RequestComplete` After the handler is ready, but before the response is sent to the client.
   `Data`: Handler outcome data; Handler error; Server error (like 404)
3. `Events.RequestEnd` After the execution of the request.
   `Data`: Handler outcome data; Handler error; Server error (like 404)

And the server events

- `Events.Connect`: When the server is started. `Data`: Basic information about the server as port & host
- `Events.Disconnect`: When due to some error the server is stopped. `Data`: The error that caused this to happen

## Mesh

Dynamically append service that takes care of finding neighboring nodes and parallel
synchronization between them. The basic principle is to check if other nodes are
alive by providing them with the available list of own nodes at each query аnd at the
same time it expects them to return their list of nodes In this way, the network is
automatically updated.

### Ping

When there is no centralization and node `1` does not know about the others and trying to connect to `fail node` the
scenarios will look like this
![svg](https://raw.githubusercontent.com/agavazov/nkvd/main/docs/assets/mesh-state-1.svg)

But after the the `ping` implementation, things change like this:
![svg](https://raw.githubusercontent.com/agavazov/nkvd/main/docs/assets/mesh-state-2.svg)

When we run `ping` it pings all nodes in the current mesh network and inform them of the current (my)
list of nodesSo they will automatically know about the available list of nodes and add them to
their listAs we provide them with our list of nodes, they respond with theirsThis method is run
at a specified interval.

### .env variables

- `PORT` Service HTTP port
- `HOSTNAME` NodeID - Must be unique per node (usually is provided by Dcoker or K8S)
- `MESH_NETWORK_URL` The url to join to the mesh (use the closest node or the load-balancer
  url, e.g. http://127.0.0.1:8080)
