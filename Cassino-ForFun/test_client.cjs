const { io } = require("socket.io-client");
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("crash:sync", (data) => {
  console.log("Received crash:sync:", JSON.stringify(data));
});

socket.on("crash:gameState", (data) => {
  console.log("Received crash:gameState:", JSON.stringify(data));
});

socket.on("crash:start", () => {
  console.log("Received crash:start");
});

socket.on("crash:result", (data) => {
  console.log("Received crash:result:", JSON.stringify(data));
});

socket.on("coinFlip:start", () => {
  console.log("Received coinFlip:start");
});

socket.on("coinFlip:result", (data) => {
  console.log("Received coinFlip:result:", JSON.stringify(data));
});

setTimeout(() => {
  console.log("Closing test client...");
  process.exit();
}, 40000);
