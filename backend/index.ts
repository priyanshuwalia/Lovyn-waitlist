import { createApp } from "./src/app";
import { config } from "./src/config";
import { closeDatabaseConnections } from "./src/prisma";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Lovyn waitlist API listening on port ${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Shutting down.`);

  server.close(async error => {
    if (error) {
      console.error("HTTP server shutdown failed.", error);
      process.exit(1);
    }

    try {
      await closeDatabaseConnections();
      process.exit(0);
    } catch (databaseError) {
      console.error("Database shutdown failed.", databaseError);
      process.exit(1);
    }
  });
}
