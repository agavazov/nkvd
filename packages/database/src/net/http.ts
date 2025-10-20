import { IncomingMessage, Server, ServerResponse } from 'node:http';
import url from 'url';
import { NkvDatabase } from '../db/nkv-database';

/**
 * Structure of incoming params - For this project they
 * are query requests so nothing special to think about
 */
export type IncomingParams = NodeJS.Dict<string | string[]>

/**
 * How the callback function should look like,
 * which will take care of incoming HTTP requests.
 * It will receive the passed parameters (query)
 * and access to the main database adapter.
 */
export type RequestHandler = <DB extends NkvDatabase>(
  db: DB, data: IncomingParams
) => Promise<ResponseData> | ResponseData

/**
 * After receiving an HTTP request, we will only have access to the
 * requested path, the incoming parameters and the response object (node:http.ServerResponse)
 */
export type ServerRequest = {
  path: string,
  params: IncomingParams,
  res: ServerResponse
}

/**
 * After receiving an HTTP request, we will only have access to the
 * requested path, the incoming parameters and the response object (node:http.ServerResponse)
 */
export type AfterRequest = Omit<ServerRequest, 'responseData'> & {
  responseData: ResponseData
};

/**
 * The structure of the object that will be
 * passed to the events after `RequestHandler` is called.
 * @see Event
 */
export type ResponseData = void | string | number | { [key: string]: any } | boolean | any;

/**
 * Errors that will be serviced and returned to the client as they occur
 * If you throw an error which is not instance of ResponseError it may crash the server
 */
export class ResponseError extends Error {
  code = 500;
}

export class NotFoundError extends ResponseError {
  code = 404;
}

export class InvalidInputResponse extends ResponseError {
  code = 400;
}

/**
 * Callback function that will be used when an event is executed
 */
type EventListener = <T>(data: T | any) => void

/**
 * The structure of the event listeners.
 * Each record must have information about which event it
 * is listening for and the listener function which will be called
 * @link EventListener
 */
type EventRecord = {
  event: Event,
  listener: EventListener
}

/**
 * Events that may occur when using the HTTP server
 *
 * # Request lifecycle
 *  1. RequestStart
 *  2. RequestComplete
 *  3. RequestEnd
 *
 * # Events info
 *  - Connect: When the server is started.
 *  >>>> Data: Basic information about the server as port & host
 *
 *  - Disconnect: When due to some error the server is stopped
 *  >>>> Data: The error that caused this to happen
 *
 *  - RequestStart: When a new request arrives
 *  >>>> Data: Incoming parameters
 *
 *  - RequestComplete: After the handler is ready, but before the response is sent to the client
 *  >>>> Data: Handler outcome data; Handler error
 *
 *  - RequestEnd: After the execution of the request
 *  >>>> Data: - Handler outcome data; Handler error; Server error (like 404)
 */
export enum Event {
  Connect,
  Disconnect,
  RequestStart,
  RequestComplete,
  RequestEnd
}

/**
 * Creating a http server that will listen for requests and forward them to the registered handlers
 */
export class HttpServer<DB extends NkvDatabase> {
  // Event queue callbacks
  protected eventsQueue: EventRecord[] = [];

  // Dictionary of the http request handlers
  protected httpHandlers: { [requestPath: string]: RequestHandler } = {};

  // HTTP Server
  protected srv: Server;

  // Default HTTP headers which will be served in the client response
  protected readonly httpHeader = { 'Content-Type': 'text/json' };

  /**
   * Set the HTTP server basic settings
   *
   * @param dbAdapter instance of the database adapter
   * *  which will be provided to the request handlers
   *
   * @param port HTTP server listening port
   *
   * @param host HTTP server host
   * * leave it blank if you want it to be accessible from anywhere on the available network
   */
  constructor(protected dbAdapter: DB, protected port = 80, protected host = '0.0.0.0') {
    // Create Node HTTP server instance
    this.srv = new Server(this.requestListener.bind(this));

    // Listen for critical server errors and trigger Event.Disconnect
    this.srv.on('error', (e) => {
      this.emit(Event.Disconnect, e);
    });
  }

  // Start the HTTP listener and trigger Event.Connect
  connect(): void {
    this.srv.listen(this.port, this.host, () => {
      // Trigger the connection event
      this.emit(Event.Connect, {
        port: this.port,
        host: this.host
      });
    });
  }

  // Register handler for specific path
  handle(path: string, handler: RequestHandler): void {
    // Each path can have only one handler
    if (typeof this.httpHandlers[path] !== 'undefined') {
      throw new Error(`Request handler [${path}] is already registered`);
    }

    // Append the handler to the registry
    this.httpHandlers[path] = handler;
  }

  // Handle all requests from the web server
  protected async requestListener(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Extract the path & params provided from the request
    const urlParse = url.parse(String(req?.url), true);
    const path = urlParse?.pathname || '/';
    const params = urlParse?.query || {};

    // Prepare the client response
    let responseData = null;
    let responseCode = 200;

    // The 1st event from the request lifecycle
    this.emit(Event.RequestStart, { path, params, res });

    // If the handler throws an error
    try {
      // If there is no handler for the current path, throw 404
      if (typeof this.httpHandlers[path] !== 'function') {
        throw new NotFoundError(`No register handler for [${path}]`);
      }

      // Run the handler
      responseData = await this.httpHandlers[path].call(this, this.dbAdapter, params);
    } catch (e) {
      // When the error is response based
      if (e instanceof ResponseError) {
        responseCode = e.code;
        responseData = { error: e.message };
      } else {
        // When the error is not recognized - Crash the app :/
        throw e;
      }
    }

    // Fire before the response is sent to the client
    this.emit(Event.RequestComplete, { path, params, res, responseData });

    // Send the response
    res.writeHead(responseCode, this.httpHeader);
    res.end(JSON.stringify(responseData));

    // The last event from the request lifecycle
    this.emit(Event.RequestEnd, { path, params, res, responseData });
  }

  // Events subscriptions
  on(event: Event.Connect, listener: (data: { [key: string]: unknown }) => void): void;
  on(event: Event.Disconnect, listener: (data: Error) => void): void;
  on(event: Event.RequestStart, listener: (data: ServerRequest) => void): void;
  on(event: Event.RequestComplete, listener: (data: AfterRequest) => void): void;
  on(event: Event.RequestEnd, listener: (data: AfterRequest) => void): void;
  on(event: Event, listener: EventListener): void {
    this.eventsQueue.push({ event, listener });
  }

  // Events triggers
  protected emit(event: Event.Connect, data: { [key: string]: unknown }): void;
  protected emit(event: Event.Disconnect, data: Error): void;
  protected emit(event: Event.RequestStart, data: ServerRequest): void;
  protected emit(event: Event.RequestComplete, data: AfterRequest): void;
  protected emit(event: Event.RequestEnd, data: AfterRequest): void;
  protected emit(event: Event, data: unknown): void {
    this.eventsQueue.forEach(eventRecord => {
      if (eventRecord.event === event) {
        try {
          eventRecord.listener.call(this, data);
        } catch (e) {
          console.error(`There is an event listener [${event}] which throws an exception!`);
          throw e;
        }
      }
    });
  }
}
