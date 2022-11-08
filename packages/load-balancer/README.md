# [Load Balancer](https://github.com/agavazov/nkvd/tree/main/packages/load-balancer/)

## TCP Proxy

Simple TCP proxy written on NodeJS which can handle almost everything (based on `TCP` of course)

### How to make road ribbon load balancer

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
