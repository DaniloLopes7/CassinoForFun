import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { auth: { token: getToken() } });
  } else {
    // atualiza token no proximo connect
    socket.auth = { token: getToken() };
  }
  return socket;
}

export function reconnectSocket() {
  if (socket) {
    socket.auth = { token: getToken() };
    socket.disconnect();
    socket.connect();
  }
}
