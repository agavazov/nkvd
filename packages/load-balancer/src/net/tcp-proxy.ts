import { Server, Socket } from 'node:net';

/**
 * A skeleton of the callback function that will call before each incoming TCP request
 * Usually must return `host` & `port`, but if no connections are available it may return `false`
 */
type SocketOptions = () => { host: string, port: number } | false

/**
 * TCP Proxy - Simple & powerful
 *
 * Creates a listening service and when a TCP request
 * comes in, calls `socketOptionsFn()` to get the target connection settings
 *
 * @param broadcastPort the port which will be open to listen for TCP requests
 * @param socketOptionsFn callback which will provide connections settings
 * @param errorHandler callback which will receive the service errors
 */
export function tcpProxy(
  broadcastPort: number,
  socketOptionsFn: SocketOptions,
  errorHandler: (source: string, e: Error) => void
): Server {
  const proxyServer = new Server((socket) => {
    // Get host & port to connect to
    const connectionData = socketOptionsFn();

    // If their nothing to connect the socket will be disconnected
    if (connectionData === false) {
      socket.end();

      return;
    }

    // Create a new connection to the TCP server
    const clientSocket = new Socket();

    // Connect to the endpoint
    clientSocket.connect({ ...connectionData });

    // Piping the data between a client and a TCP server
    socket.pipe(clientSocket).pipe(socket);

    // Make sure the socket is closed destroyed on close
    socket.on('close', () => {
      socket.destroy();
    });

    // Make sure the socket is closed destroyed on error
    socket.on('error', () => {
      socket.destroy();
    });

    // Show errors
    socket.on('error', e => errorHandler('socket', e));
    clientSocket.on('error', e => errorHandler('clientSocket', e));
  });

  // Create broadcast
  proxyServer.listen(broadcastPort);

  // Show errors
  proxyServer.on('error', e => errorHandler('proxyServer', e));

  return proxyServer;
}
