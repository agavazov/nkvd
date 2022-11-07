## NKVD In short

**NKVD** is a project presenting an **HTTP key-value** database that can be
dynamically replicated using **full mesh** logic. Besides the main goal, several
other features have been added to the project as **integration & stress tests**,
and a pretty cool ✨ **Docker TCP Load Balancer** that automatically detects new containers

---

### Database

The database uses an in-memory storage adapter (other types can be added) accessible
via an HTTP server, and a full-mesh network is used for replication.

---

### Docker Load Balancer

This one is very usefull if you want to have a dynamic load balancer that routes TCP traffic and automatically detects
the appearance or disappearance of a container in a specific scale group.

This one is very useful if you want to have a dynamic load balancer that routes TCP traffic
and automatically detects the joining/connect or leaving/disconnect ofa container
in a specific scale group.

---

### Testing

Well-organized integration tests covering all database scenarios and stress tests
based on the powerful parallel execution of tasks in JavaScript.

---

### Demo

[![gif](/docs/assets/demo.gif)](https://youtu.be/bsdi9aSfBoY)

**[CLICK HERE FOR MORE](https://youtu.be/bsdi9aSfBoY)**

---

### How to start

The project is 100% based on NodeJs and TypeScript
and each package is prepared to work with Docker.

You can build, run and test the project via `NPM` because **all actions are described** in
`package.json`. The project is presented as a `monorepo` that can be run via
[lerna](https://www.npmjs.com/package/lerna) and [concurrently](https://www.npmjs.com/package/concurrently).

Or you can use `docker compose`

#### 1. Build the project

`docker compose build`

#### 2. Start everything

`docker compose up`

#### 3. Run all integration tests

`docker compose run tests npm run test`

#### 4. Attach new database node

`docker compose run -d database`

#### 5. Stress tests

`docker compose run tests npm run stress`

---

### Coverage

✅ In-memory
✅ Only HTTP GET queries
✅ Stress tests
✅ Performance for millions of keys
✅ Scalable
✅ Mesh (add & remove node)
✅ Limitations: key - 64 chars; value - 256 chars
🙊 Conflicts in a distributed transaction - _May need one more day_
🙉 Nodes disconnect - _There is a small problem which requires one or two more hours to be solved_

#### Criteria

✅ Clean code
✅ Proper comments in code (quality, not quantity)
✅ Architecture
✅ Documentation
✅ Tests
✅ Linters
✅ .gitignore
✅ Test coverage reporting
✅ Single command (for start, test, stress, linters, etc.)
🙈 CI configuration - _Almost done... All CI scenarios are covered and described in the documentation_

---

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

But after the `ping` implementation, things change like this:

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

---

# [Load Balancer](https://github.com/agavazov/nkvd/tree/main/packages/load-balancer/)

## TCP Proxy

Simple TCP proxy written on NodeJS which can handle almost everything (based on `TCP` of course)

### How to make ribbon balancer load balancer

```typescript
import { ErrorHandler, tcpProxy } from './net/tcp-proxy';

// Container to access
const containers = [
  { host: 'google.com', port: 80 },
  { host: 'yahoo.com', port: 80 }
];

// Error logger
const errorHandler: ErrorHandler = (source, e) => {
  console.error(`${source}.error`, e.message);
};

// Road ribbon balancer
let rri = 0;
const rriGenerator = () => {
  rri = ++rri >= containers.length ? 0 : rri;

  return containers[rri];
};

// TCP Proxy
tcpProxy(80, rriGenerator, errorHandler);
```

## Docker Connect

This class will observe the docker server containers and inform you via events when something is changed

### How to listen for docker changes

```typescript
import { DockerConnect, Event } from './net/docker-connect';

const apiLocation = '/var/run/docker.sock'; // or http://docker-api:8080
const connector = new DockerConnect(apiLocation);

connector.on(Event.Disconnect, (err) => {
  console.error(`[!] Docker connection is lost: ${err.message}`);
  process.exit(1);
});

connector.on(Event.Connect, (data) => {
  console.log(`[i] All set, now we are using Docker [${data.Name}].`);
});

connector.on(Event.ContainerConnect, (container) => {
  console.log(`[+] А new container arrives [${JSON.stringify(container)}].`);
});

connector.on(Event.ContainerDisconnect, (container) => {
  console.log(`[-] A container left [${JSON.stringify(container)}].`);
});
```

You can listen HTTP end-point or Linux Socket. Keep in mind if you want to access
the linux socket in a container you have to provide extra privileges and mount it.

```yaml
services:
  proxy:
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # ...
```

### .env variables

- `DOCKER_API_LOCATION` Docker unix socket "/var/run/docker.sock" or Docker API URL "http://localhost"
- `SERVICE_PORT` Broadcast/public load balancer port
- `GROUP_PORT` Port of the container(s) which will receives the TCP request
- `GROUP_NAME` Scalled group name (usually the name of the config in docker-compose.yaml)

---

# [Tests](https://github.com/agavazov/nkvd/tree/main/packages/tests/)

### Integration tests

```shell
npm run test
```

or

```shell
docker compose run tests npm run stress
```

Expected output:

```
  /status
    Get node status
      ✔ Should return expected setting properties as a response

  /set command
    Successful record set
      ✔ Should save [empty value] without error
      ✔ Should save [normal value] without error
    UTF16 successful record set
      ✔ Should save [UTF8 key] and [UTF16 value] without error
      ✔ Should get the [UTF16 value] by the [UTF8 key] without error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached
      ✔ Should respond with an error for missing [value]
      ✔ Should respond with an error for [maximum value length] reached

  /get command
    Successful record get
      ✔ Should save [normal record] without error
      ✔ Should [get the same record] without error
    Missing record
      ✔ Should respond with an error for [missing record]
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /rm command
    Successful record remove
      ✔ Should save [normal record] without error
      ✔ Should [remove the same record] without error
      ✔ Should not allow to remove the same record again with [missing record] error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /is command
    Successful record exist check
      ✔ Should save [normal record] without error
      ✔ Should find the [same exists record] without error
      ✔ Should [remove the same record] without error
      ✔ Should not allow to remove the same record again with [missing record] error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /clear command
    Successful cleat all the records
      ✔ Should save [normal record] without error
      ✔ Should [get the some records] without error (121ms)
      ✔ Should [clear all records] without error

  /getKeys command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the keys
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records keys] without error

  /getValues command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the values
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records values] without error

  /getAll command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the records
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records] without error

  41 passing
```

### Stress tests

```shell
npm run stress
```

or

```shell
docker compose run tests npm run stress
```

Expected output:

```
Stress test with:
 - Requests: 100000
 - Clusters: 50
 - Workers per cluster: 20

==================

[<] Left Requests / [!] Errors / [^] Success

[<] 99000 / [!] 0 / [^] 1000
[<] 98000 / [!] 0 / [^] 2000
[<] 97000 / [!] 0 / [^] 3000
...
...
[<] 3000 / [!] 8 / [^] 96992
[<] 2000 / [!] 9 / [^] 97991
[<] 1000 / [!] 9 / [^] 98991
[<] 0 / [!] 9 / [^] 99991

==================

Report:
 - Total requests: 100000
 - Total time: 98.92 sec
 - Avg request response: 0.33 ms
 - Errors: 9
 - Success: 99991
```

### .env variables

- `SERVICE_URL` The url of the service which will be tested
- `STRESS_AMOUNT` Total amount of the requests to send
- `STRESS_CLUSTERS` How many clusters will work in parallel
- `STERSS_WORKERS` Haw many requests workers will work in parallel in each cluster
