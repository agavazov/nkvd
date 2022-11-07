import { IncomingMessage, Server, ServerResponse } from 'node:http';
import url from 'url';
import { NkvDatabase } from '../db/nkv-database';

// .
export type IncomeParams = NodeJS.Dict<string | string[]>

// .
export type RequestHandler = <DB extends NkvDatabase>(
  db: DB, data: IncomeParams
) => Promise<ResponseData> | ResponseData

// . how the server structurize the request (this is used on @link{Event.RequestStart})
export type ServerRequest = {
  path: string,
  params: IncomeParams,
  res: ServerResponse
}

// .
export type AfterRequest = Omit<ServerRequest, 'responseData'> & {
  responseData: ResponseData
};

// .
export type ResponseData = void | string | number | { [key: string]: any } | boolean | any;

// .
export class ResponseError extends Error {
  code = 500;
}

// .
export class NotFoundError extends ResponseError {
  code = 404;
}

// .
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
 *  >>>> Data: Income parameters
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


// . json get server
export class HttpServer<DB extends NkvDatabase> {
  // Event queue callbacks
  protected eventsQueue: EventRecord[] = [];

  // Dictionary of the http request handlers
  protected httpHandlers: { [requestPath: string]: RequestHandler } = {};

  // . net server instance
  protected srv: Server;

  // . default response http header
  protected readonly httpHeader = { 'Content-Type': 'text/json' };

  constructor(protected dbAdapter: DB, protected port = 80, protected host = '0.0.0.0') {
    // .
    this.srv = new Server(this.requestListener.bind(this));

    // .
    this.srv.on('error', (e) => {
      this.emit(Event.Disconnect, e);
    });
  }

  connect(): void {
    this.srv.listen(this.port, this.host, () => {
      // Trigger the connection event
      this.emit(Event.Connect, {
        port: this.port,
        host: this.host
      });
    });
  }

  // . register handler
  handle(path: string, handler: RequestHandler): void {
    // . each path can have only one handler
    if (typeof this.httpHandlers[path] !== 'undefined') {
      throw new Error(`Request handler [${path}] is already registered`);
    }

    // . add the handler to the registry
    this.httpHandlers[path] = handler;
  }

  // . Handle all requests from the web server
  protected async requestListener(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // .
    const urlParse = url.parse(String(req?.url), true);
    const path = urlParse?.pathname || '/';
    const params = urlParse?.query || {};

    // . prepare the client response
    let responseData = null;
    let responseCode = 200;

    // .
    this.emit(Event.RequestStart, { path, params, res });

    // .
    try {
      // . check 404
      if (typeof this.httpHandlers[path] !== 'function') {
        throw new NotFoundError(`No register handler for [${path}]`);
      }

      // . run the handler
      responseData = await this.httpHandlers[path].call(this, this.dbAdapter, params);
    } catch (e) {
      // . when the error is response based
      if (e instanceof ResponseError) {
        responseCode = e.code;
        responseData = { error: e.message };
      } else {
        // . when the error is not regonised
        throw e;
      }
    }

    // .
    this.emit(Event.RequestComplete, { path, params, res, responseData });

    // send the response
    res.writeHead(responseCode, this.httpHeader);
    res.end(JSON.stringify(responseData));

    // .
    this.emit(Event.RequestEnd, { path, params, res, responseData });
  }

  // .on something happen
  on(event: Event.Connect, listener: (data: { [key: string]: unknown }) => void): void;
  on(event: Event.Disconnect, listener: (data: Error) => void): void;
  on(event: Event.RequestStart, listener: (data: ServerRequest) => void): void;
  on(event: Event.RequestComplete, listener: (data: AfterRequest) => void): void;
  on(event: Event.RequestEnd, listener: (data: AfterRequest) => void): void;
  on(event: Event, listener: EventListener): void {
    this.eventsQueue.push({ event, listener });
  }

  // .trigger event
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
          console.error(`There is a event listener [${event}] which trows an exception!`);
          throw e;
        }
      }
    });
  }
}
