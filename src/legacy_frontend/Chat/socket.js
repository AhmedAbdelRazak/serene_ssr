// socket.js (frontend)
import io from "socket.io-client";
import { API_ORIGIN } from "../../lib/config";

let socket;
let lastConnectErrorMessage = "";

function getSocketUrl() {
  const normalizedApiOrigin = `${API_ORIGIN || ""}`.replace(/\/+$/, "");
  if (!normalizedApiOrigin) return undefined;
  return normalizedApiOrigin;
}

export const getSocket = () => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      lastConnectErrorMessage = "";
      console.log("Connected to WebSocket server");
    });

    socket.on("disconnect", (reason) => {
      console.log(`Disconnected from WebSocket server: ${reason}`);
    });

    socket.on("connect_error", (error) => {
      const message = `${error?.message || "Unknown socket connection issue"}`;
      if (message === lastConnectErrorMessage) {
        return;
      }

      lastConnectErrorMessage = message;
      console.warn(
        `Socket connection issue: ${message}. Retrying with transport fallback.`,
      );
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Backward-compatible facade:
// - Existing files using `import socket from ".../socket"` can call socket.on/off/emit
// - Newer files can keep using `getSocket()`
const socketFacade = {
  on: (...args) => getSocket().on(...args),
  once: (...args) => getSocket().once(...args),
  emit: (...args) => getSocket().emit(...args),
  off: (...args) => {
    if (!socket) return;
    return socket.off(...args);
  },
  connect: () => getSocket().connect(),
  disconnect: () => disconnectSocket(),
};

export default socketFacade;
