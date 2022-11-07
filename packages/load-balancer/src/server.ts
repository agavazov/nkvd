import { env } from './lib/env';
import { Container, DockerConnect, Event } from './net/docker-connect';
import { tcpProxy } from './net/tcp-proxy';

/**
 * Dynamic TCP Load Balancer that through pull to docker
 * requests discovers new or disconnected nodes
 *
 * This script combines `DockerConnect` and `tcpProxy`
 * via `Road Ribbon` switching nodes to handle incoming TCP requests
 */
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

/**
 * Docker event handler
 *
 * In this case is just logger that provides info about the docker containers
 */
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

/**
 * TCP Load Balancer
 *
 * Once we have access to the docker events, we can
 * intercept the containers from the required scale group.
 *
 * When a new container arrives, it will be checked and if it
 * matches within the scale group, it will start serving TCP requests
 *
 * If any container is not working as expected it will be removed from the service list
 */
function loadBalancerStart(connector: DockerConnect) {
  // The available containers that will serve TCP requests
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

  // Filter callback that checks if it matches the group name
  const filter = (item: Container) => item.group === env.groupName;

  // When new container is joined to the network
  connector.on(Event.ContainerConnect, (container) => {
    // Create metadata to log the load balancer hits
    container.meta = {
      hits: 0
    };

    containers = connector.containers.filter(filter);
  });

  // Remove disconnected containers file the list
  connector.on(Event.ContainerDisconnect, () => {
    containers = connector.containers.filter(filter);
  });

  // Start the TCP server and register by providing
  // `rriGenerator` which will be called after each request.
  // And provide an error handler, in this case, to log and count the errors .
  let totalErrors = 0;
  tcpProxy(env.servicePort, rriGenerator, (source, e) => {
    if (env.showErrors) {
      console.error(`${source}.error`, e.message);
    }

    totalErrors++;
  });

  // Show hit & errors report (displayed only if there is a difference from the last run)
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
