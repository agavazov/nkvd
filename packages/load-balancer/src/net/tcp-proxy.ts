import { Server, Socket } from 'node:net';

// . it may be used for round ribbon
type SocketOptions = () => { host: string, port: number } | false

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

    // 2-way pipe between client and TCP server
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
