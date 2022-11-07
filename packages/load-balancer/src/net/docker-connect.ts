import { existsSync } from 'node:fs';
import http from 'node:http';
import https, { RequestOptions } from 'node:https';
import { parse } from 'node:url';

/**
 * Callback function that will be used when an event is executed
 */
type EventListener = <T>(data: T | any) => void

/**
 * The structure of the event listeners.
 * Each record must have information about which event it
 * is listening for and the listener function which will be called
 */
type EventRecord = {
  event: Event,
  listener: EventListener
}

/**
 * The events that can occur when communicating with docker
 *  - Connect: When a docker connection is established. This event will only happen once
 *  - Disconnect: @todo
 *  - ContainerConnect: @todo
 *  - ContainerDisconnect:  @todo
 */
export enum Event {
  Connect,
  Disconnect,
  ContainerConnect,
  ContainerDisconnect
}

// Docker container states - https://docs.docker.com/engine/reference/commandline/ps/#filtering
export enum ContainerState {
  Created = 'created',
  Running = 'running',
  Restarting = 'restarting',
  Exited = 'exited',
  Paused = 'paused',
  Dead = 'dead'
}

// .
export type Container = {
  id: string,
  group: string,
  ip: string,
  state: ContainerState,
  meta?: { [key: string]: any }
}

// Response of http://docker/info
export type DockerResponseInfo = {
  ServerVersion: string,
  ContainersRunning: number,
  Name: number,
  // All other docker info properties
  [key: string]: any
}

// When the Docker Linux Socket or API Url is not valid
export class ApiLocationError extends Error {
}

// When the connector is not able to connect to the Docker API
export class ConnectionError extends Error {
}

// When there is a docker request error
export class RequestError extends Error {
}

// When the response from docker is not valid
export class InvalidResponseError extends Error {
}

// .communicate with docker api via socket or end-point
export class DockerConnect {
  // .docker api endpoint host
  protected apiHost: string | undefined;

  // .docker api endpoint port
  protected apiPort: number | undefined;

  // If the apiUrl is using https we have use different request method
  protected isHttps = false;

  // .socket file
  protected socketPath: string | undefined;

  // Event queue callbacks
  protected eventsQueue: EventRecord[] = [];

  // The minimal supported version of Docker
  protected readonly minDockerVersion = 20;

  // Docker observer can only be started once. Here we will set if this happened
  private isObserverStarted = false;

  // .
  protected containersList: Container[] = [];

  // .http or socket file
  constructor(
    // Connection string (http url or linux socket path)
    apiLocation: string,
    // Waiting time after each docker observer request
    protected observeIntervalMs: number = 500,
    // Maximum waiting time for each request to docker
    protected requestTimeoutMs: number = 2000
  ) {
    // .basic validation
    if (!apiLocation.length) {
      throw new ApiLocationError('Docker API location can`t be empty');
    }

    // .is url
    if (/^http:\/\/|^https:\/\//.test(apiLocation)) {
      const urlParse = parse(apiLocation);

      // If the host is empty this means the provided URL is invalid
      if (!urlParse.hostname) {
        throw new ApiLocationError(`Invalid API Docker end-point [${apiLocation}]`);
      }

      this.apiHost = urlParse.hostname;
      this.isHttps = urlParse.protocol === 'https:';
      this.apiPort = Number(urlParse.port) || (this.isHttps ? 443 : 80);
    } else {
      // . If the provided api location is not URL then it must be socket file
      // . The 1st thing before we continue is to check is this file exists
      if (apiLocation && !existsSync(apiLocation)) {
        throw new ApiLocationError(`Socket file not found [${apiLocation}]`);
      }

      this.socketPath = apiLocation;
    }
  }

  // .connect
  async connect(): Promise<void> {
    const rs = await this.request<DockerResponseInfo>('/info');
    // Check the response
    if (typeof rs?.ServerVersion !== 'string') {
      throw new ConnectionError('Unknown docker version!');
    }

    // After connect check the minimal requirements
    const currentVersion = Number(rs?.ServerVersion.split(/\./g)?.[0]);
    if (currentVersion < this.minDockerVersion) {
      throw new ConnectionError(`The minimum supported version is [${this.minDockerVersion}] `
        + `yours is [${currentVersion}]`);
    }

    // Trigger the connection event
    this.emit(Event.Connect, rs);

    // Start the events observer
    this.runDockerObserver();
  }

  get containers(): Container[] {
    return this.containersList;
  }

  // .on something happen
  on(event: Event.Connect, listener: (data: DockerResponseInfo) => void): void;
  on(event: Event.Disconnect, listener: (data: RequestError) => void): void;
  on(event: Event.ContainerConnect, listener: (data: Container) => void): void;
  on(event: Event.ContainerDisconnect, listener: (data: Container) => void): void;
  on(event: Event, listener: EventListener): void {
    this.eventsQueue.push({ event, listener });
  }

  // .trigger event
  protected emit(event: Event.Connect, data: DockerResponseInfo): void;
  protected emit(event: Event.Disconnect, data: RequestError): void;
  protected emit(event: Event.ContainerConnect, data: Container): void;
  protected emit(event: Event.ContainerDisconnect, data: Container): void;
  protected emit(event: Event, data: unknown): void {
    this.eventsQueue.forEach(eventRecord => {
      if (eventRecord.event === event) {
        try {
          eventRecord.listener.call(this, data);
        } catch (e) {
          console.error(`There is a event listener [${event}] which trows an exception!`);
          throw e;
        }
      }
    });
  }

  // .call docker by http request via socket or api
  // .expect only JSON response
  async request<T>(path: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // .
      const options: RequestOptions = {
        socketPath: this.socketPath,
        host: this.apiHost,
        port: this.apiPort,
        path: path,
        rejectUnauthorized: false,
        timeout: this.requestTimeoutMs
      };

      // Make HTTP or HTTPS request
      const request = (this.isHttps ? https : http).request(options, (res) => {
        // When there is an error the rejection will be calls
        res.on('error', err => reject(new RequestError(err.message)));

        // Collect the response
        let response = '';
        res.on('data', data => response += data);

        // When request timeout reached
        res.on('timeout', () => {
          reject(new RequestError(`Request timeout of [${this.requestTimeoutMs}]ms reached`));

          // Close the connection
          request.destroy();
        });

        // Resolve the response
        res.on('end', () => {
          // Expected response is JSON
          try {
            resolve(JSON.parse(response) as T);
          } catch (e) {
            reject(new InvalidResponseError('Invalid JSON response'));
          }
        });
      });

      // Global request error check
      request.on('error', err => {
        // Reject with request error
        reject(new RequestError(err.message));
      });

      // Nothing else to set, run the request
      request.end();
    });
  }

  // .observe for docker changes
  // act as separate process
  runDockerObserver(): void {
    // Check is already started
    if (this.isObserverStarted) {
      throw new Error('Docker observer is already started');
    }

    // Set it as started
    this.isObserverStarted = true;

    // The observer should act as a separate promise that no one will subscribe to
    (async () => {
      while (this.isObserverStarted) {
        try {
          // Get docker containers list
          const containers = await this.request('/containers/json');

          // Validate the response data
          if (!Array.isArray(containers)) {
            throw new InvalidResponseError('Expected response is array with containers');
          }

          // Collecting only the data we will need
          const rs = containers.map(item => {
            return {
              id: item?.Id,
              group: item?.Labels?.['com.docker.compose.service'],
              ip: item?.NetworkSettings?.Networks?.['node-kvd_db-nodes']?.IPAddress,
              state: item?.State
            };
          });

          // Validate collected data
          rs.forEach((item, index) => {
            this.validateContainerData(item, index.toString());
          });

          // Compare for added & removed records
          const connected = rs.filter(r =>
            r.state === ContainerState.Running // Check only those which are running
            && !this.containersList.find(c => c.id === r.id) // Not presented in current list
          );

          const disconnected = this.containersList.filter(c =>
            !rs.find(r => // Disconnected are all non-healthy or missing in from the current list
              r.state === ContainerState.Running // Check only those which are running
              && r.id === c.id
            )
          );

          // Assign the changes
          this.containersList = [...this.containersList, ...connected];
          this.containersList = this.containersList.filter(item => !disconnected.includes(item));

          // Trigger events
          connected.forEach(container => {
            this.emit(Event.ContainerConnect, container);
          });

          // Remove missing containers
          disconnected.forEach(container => {
            this.emit(Event.ContainerDisconnect, container);
          });

          // Sleep for a while then make a new request
          await new Promise(r => setTimeout(r, this.observeIntervalMs));
        } catch (e) {
          if (e instanceof RequestError) {
            // Stop the observer
            // Hint: it can be after the disconnect event is handled manually
            this.isObserverStarted = false;

            // Emit disconnect event after the current request fails
            this.emit(Event.Disconnect, e);
          } else {
            // When the exception is not handled we have break the whole process
            // Keep in mind this Promise is not handled, so this exception will crash the app
            throw e;
          }
        }
      }
    })();
  }

  // . validate & throw, w/o return
  protected validateContainerData(item: { [key: string]: any }, hint: string): void {
    // Check parameters & values
    if (typeof item !== 'object' && item) {
      throw new InvalidResponseError(`Invalid container structure in container [${hint}]`);
    }

    if (typeof item?.id !== 'string' && item.id.length < 5) {
      throw new InvalidResponseError(`Invalid [id] param in container [${hint}]`);
    }

    if (typeof item?.group !== 'string' && item.group.length < 1) {
      throw new InvalidResponseError(`Invalid [group] param in container [${hint}]`);
    }

    if (typeof item?.ip !== 'string' && item.ip.length < 3) {
      throw new InvalidResponseError(`Invalid [ip] param in container [${hint}]`);
    }

    if (typeof item?.state !== 'string' && item.state.length < 1) {
      throw new InvalidResponseError(`Invalid [state] param in container [${hint}]`);
    }

    // Check state values
    // const states = Object.values(ContainerState);
    const states = [
      ContainerState.Created,
      ContainerState.Running,
      ContainerState.Restarting,
      ContainerState.Exited,
      ContainerState.Paused,
      ContainerState.Dead
    ];

    if (states.indexOf(item.state) === -1) {
      throw new InvalidResponseError(`Unknown state [${item.state}] in container [${hint}]`);
    }
  }
}
