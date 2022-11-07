import * as http from 'http';
import { RequestOptions } from 'node:https';
import { parse } from 'url';
import { IncomeParams } from './http';

// .
export type MeshNode = {
  host: string,
  port: number,
  isDown: boolean,
  source?: string
}

export class Mesh {
  protected nodesList: MeshNode[] = [];

  // Maximum waiting time for each request
  protected requestTimeoutMs = 1000;

  // .
  protected pingInterval = 1500;

  // .
  constructor(protected currentNode: MeshNode, protected meshNetworkUrl: string) {
    this.join(currentNode, 'init');

    setInterval(() => this.ping(), this.pingInterval);
    this.ping();
  }

  get nodes(): MeshNode[] {
    return this.nodesList;
  }

  // .
  // no exceptions no waiting
  async replicate(path: string, params: IncomeParams): Promise<void> {
    if (params.noReplicate) {
      return;
    }

    this.nodes.filter(n => !n.isDown).forEach(n => {
      this.request(`http://${n.host}:${n.port}${path}`, params as { [key: string]: string })
        .catch(() => {
          /* do nothing */
        });
    });
  }

  // .
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

  // . validate if the node data pass & is valid
  isValid(nodeData: any): boolean {
    return typeof nodeData === 'object'
      && typeof nodeData?.host === 'string'
      && typeof nodeData?.isDown === 'boolean'
      && typeof nodeData?.port === 'number'
      && Number(typeof nodeData.port) > 1;
  }

  // .
  serialize(nodes: MeshNode[]): string {
    return nodes.map(n => `${n.host}:${n.port}`).join('|');
  }

  // .
  unSerialize(str: string): MeshNode[] {
    return str.split(/\|/g).map(n => {
      const [host, port] = n.split(/:/g);

      return { host, port: Number(port), isDown: false };
    });
  }

  // .
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

  // .
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
