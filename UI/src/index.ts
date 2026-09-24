import { serve } from "bun";
import index from "./index.html";

const server = serve({
  port: readPort(3000),
  routes: {
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

function readPort(defaultPort: number) {
  const value = process.env.PORT;
  if (!value) {
    return defaultPort;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}
