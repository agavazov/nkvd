import { env } from './lib/env';
import { Container, DockerConnect, Event } from './net/docker-connect';
import { tcpProxy } from './net/tcp-proxy';

// Create TCP load balancer
{
  // Connect to docker
  const connector = new DockerConnect(env.dockerApiLocation);

  connector.connect().catch(err => {
    console.error(`[!] There was a problem connecting to docker: ${err.message}`);
    process.exit(1);
  });

  // Simple event handler showing console messages
  dockerEventHandler(connector);

  // Create TCP load balancer
  loadBalancerStart(connector);
}

// . simplified function to
// Docker event handler
function dockerEventHandler(connector: DockerConnect) {
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
}

// . simplified function to
// Start the load balancer
function loadBalancerStart(connector: DockerConnect) {
  let containers: Container[] = [];

  // Road ribbon balancer
  let rri = 0;
  const rriGenerator = () => {
    // When there is no available containers
    if (containers.length <= 0) {
      return false;
    }

    // Road ribbon containers switch
    rri = ++rri >= containers.length ? 0 : rri;
    const container = containers[rri];

    if (typeof container?.meta?.hits === 'number') {
      container.meta.hits++;
    }

    return { host: container.ip, port: env.groupPort };
  };

  // When new container is joined to the network
  const filter = (item: Container) => item.group === env.groupName;

  connector.on(Event.ContainerConnect, (container) => {
    // Create metadata to log the load balancer hits
    container.meta = {
      hits: 0
    };

    containers = connector.containers.filter(filter);
  });

  connector.on(Event.ContainerDisconnect, () => {
    containers = connector.containers.filter(filter);
  });

  // Start the TCP server and register
  let totalErrors = 0;
  tcpProxy(env.servicePort, rriGenerator, (source, e) => {
    if (env.showErrors) {
      console.error(`${source}.error`, e.message);
    }

    totalErrors++;
  });

  // Show hit report
  let lastReport = '';
  setInterval(() => {
    const report = '[i] Hits -> '
      + containers.map(c => `${c.ip} [${c?.meta?.hits}]`).join(' | ')
      + ` | [!] ${totalErrors}`;
    if (lastReport !== report) {
      console.log(report);
      lastReport = report;
    }
  }, 10000);
}
