import * as http from 'http';
import { RequestOptions } from 'node:https';
import { parse } from 'url';
import { IncomeParams } from './http';

/**
 * Structure of each node in the mesh network
 * host: can be IP address or hostname (e.g. localhost, example.com, etc...)
 * port: the HTTP port of the node
 * isDown: means the node is not accessible anymore
 * source: info about from where did this node get here
 */
export type MeshNode = {
  host: string,
  port: number,
  isDown: boolean,
  source?: string
}

/**
 * It takes care of finding new nodes and replicating requests submitted to the current one
 * The basic principle is to check if other nodes are alive by providing
 * them with the available list of own nodes at each query аnd at the same time
 * it expects them to return their list of nodes
 * In this way, the network is automatically upgraded
 */
export class Mesh {
  // List of all registered nodes (including those which are down/unavailable)
  protected nodesList: MeshNode[] = [];

  // Maximum waiting time for each request
  protected requestTimeoutMs = 1000;

  // In what interval we will check the status of other nodes
  // and check for new nodes to connect with
  protected pingInterval = 1500;

  /**
   * Init the mesh cluster
   * Immediately after initialization it will start monitoring for other nodes
   *
   * @param currentNode Current node host & ip
   * * We need information about the current node so that we can present them to others
   * * and not call it when replicating a request
   *
   * @param meshNetworkUrl HTTP url from where we can find another nodes
   * * This can be neighbor node or load balancer
   */
  constructor(protected currentNode: MeshNode, protected meshNetworkUrl: string) {
    this.join(currentNode, 'init');

    setInterval(() => this.ping(), this.pingInterval);
    this.ping();
  }

  // Getter of the current node list
  get nodes(): MeshNode[] {
    return this.nodesList;
  }

  // Run parallel request to all nodes in the current mesh network
  async replicate(path: string, params: IncomeParams): Promise<void> {
    // Check if the request which will be replicated comes from another replication
    if (params.noReplicate) {
      return;
    }

    // Tell to other nodes that this request is replication
    params.noReplicate = 'true';

    // Run parallel request to all nodes and don't wait for response or error
    this.nodes.filter(n => !n.isDown).forEach(n => {
      this.request(`http://${n.host}:${n.port}${path}`, params as { [key: string]: string })
        .catch(() => {
          /* do nothing */
        });
    });
  }

  // Join node to the current mesh
  join(node: MeshNode, source = '') {
    // Check node object structure
    if (this.isValid(node)) {
      return;
    }

    // Skip non working nodes
    if (node.isDown) {
      return;
    }

    // SKip non unique nodes
    if (this.nodes.find(n => n.host === node.host && n.port === node.port)) {
      return;
    }

    // Append to current list
    node.source = source;
    this.nodes.push(node);

    // Show console info
    console.log(`[+] New node join [${node.host}:${node.port}] from [${node.source}]`);
  }

  // Validate if the node data pass & is valid (usually it will be)
  isValid(nodeData: any): boolean {
    return typeof nodeData === 'object'
      && typeof nodeData?.host === 'string'
      && typeof nodeData?.isDown === 'boolean'
      && typeof nodeData?.port === 'number'
      && Number(typeof nodeData.port) > 1;
  }

  // Simplify the nodes list because we have to send it via HTTP request
  serialize(nodes: MeshNode[]): string {
    return nodes.map(n => `${n.host}:${n.port}`).join('|');
  }

  // Parse the provided list of nodes
  unSerialize(str: string): MeshNode[] {
    return str.split(/\|/g).map(n => {
      const [host, port] = n.split(/:/g);

      return { host, port: Number(port), isDown: false };
    }).filter(n => this.isValid(n));
  }

  // Ping all nodes in the current mesh network and inform them of the current (my) list of nodes
  // So they will automatically know about the available list of nodes and add them to their list
  // As we provide them with our list of nodes, they respond with theirs
  // This method is run at a specified interval @see this.pingInterval
  ping() {
    // Collect all nodes which are working to check them and get their working nodes
    const workingNodes = this.nodes.filter(n => !n.isDown);

    // Collect the mesh nodes and mesh url and ping them
    const pingUrls: (string | MeshNode)[] = [this.meshNetworkUrl, ...workingNodes];

    // Ping all urls in parallel (except current node)
    pingUrls.filter(n => n !== this.currentNode).forEach(node => {
      const url = typeof node === 'string' ? node : `http://${node.host}:${node.port}`;
      this.request<{ nodes: MeshNode[] }>(`${url}/ping`, { nodes: this.serialize(workingNodes) })
        // Join all nodes from the response
        .then(rs => rs?.nodes?.forEach(node => this.join(node, 'ping')))
        // Mark the node which is down
        .catch(e => {
          if (e.code === 'ECONNREFUSED' && typeof node !== 'string') {
            node.isDown = true;
          }
        });
    });
  }

  // HTTP Request method used to communicate between the nodes
  // Expected response is JSON
  async request<T>(url: string, params: { [key: string]: string } = {}): Promise<T> {
    const requestUrl = `${url}?${(new URLSearchParams(params)).toString()}`;
    const urlParse = parse(requestUrl);

    return new Promise<T>((resolve, reject) => {
      const options: RequestOptions = {
        ...urlParse,
        timeout: this.requestTimeoutMs
      };

      // Make HTTP or HTTPS request
      const request = http.request(options, (res) => {
        // When there is an error the rejection will be calls
        res.on('error', reject);

        // Collect the response
        let response = '';
        res.on('data', data => response += data);

        // When request timeout reached
        res.on('timeout', () => {
          reject(new Error('Request timeout'));

          // Close the connection
          request.destroy();
        });

        // Resolve the response
        res.on('end', () => {
          // Expected response is JSON
          try {
            resolve(JSON.parse(response) as T);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      // Global request error check
      request.on('error', reject);

      // Nothing else to set, run the request
      request.end();
    });
  }
}
