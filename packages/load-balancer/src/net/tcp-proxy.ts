import { Server, Socket } from 'node:net';

// . it may be used for round ribbon
type SocketOptions = () => { host: string, port: number }

export function tcpProxy(broadcastPort: number, socketOptionsFn: SocketOptions): Server {
  const proxyServer = new Server((socket) => {
    // Create a new connection to the TCP server
    const clientSocket = new Socket();

    // Connect to the endpoint
    clientSocket.connect({ ...socketOptionsFn() });

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
  });

  // Create broadcast
  proxyServer.listen(broadcastPort);

  return proxyServer;
}
