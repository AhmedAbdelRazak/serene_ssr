// socket.js (frontend)
import io from "socket.io-client";

let socket;

export const getSocket = () => {
	if (!socket) {
		socket = io(process.env.REACT_APP_API_URL_MAIN, {
			transports: ["websocket"],
			reconnectionAttempts: 5,
			timeout: 20000,
		});

		socket.on("connect", () => {
			console.log("Connected to WebSocket server");
		});

		socket.on("disconnect", (reason) => {
			console.log(`Disconnected from WebSocket server: ${reason}`);
		});

		socket.on("connect_error", (error) => {
			console.error(`Connection error: ${error.message}`);
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
