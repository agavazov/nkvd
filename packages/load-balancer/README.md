# [Load Balancer](https://github.com/agavazov/nkvd/tree/main/packages/load-balancer/)

## TCP Proxy

Simple TCP proxy written on Node.js which can handle almost everything (based on `TCP` of course)

### How to make a round-robin load balancer

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

// Round-robin balancer
let rri = 0;
const rriGenerator = () => {
  rri = ++rri >= containers.length ? 0 : rri;

  return containers[rri];
};

// TCP Proxy
tcpProxy(80, rriGenerator, errorHandler);
```

## Docker Connect

This class will observe the Docker server containers and inform you via events when something changes

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
  console.log(`[+] A new container arrives [${JSON.stringify(container)}].`);
});

connector.on(Event.ContainerDisconnect, (container) => {
  console.log(`[-] A container left [${JSON.stringify(container)}].`);
});
```

You can listen to an HTTP endpoint or a Linux socket. Keep in mind if you want to access
the Linux socket in a container you have to provide extra privileges and mount it.

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

- `DOCKER_API_LOCATION` Docker Unix socket "/var/run/docker.sock" or Docker API URL "http://localhost"
- `SERVICE_PORT` Broadcast/public load balancer port
- `GROUP_PORT` Port of the container(s) which will receive the TCP request
- `GROUP_NAME` Scaled group name (usually the name of the config in docker-compose.yaml)
