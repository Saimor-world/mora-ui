const { startServer } = require("../node_modules/next/dist/server/lib/start-server");

async function main() {
  await startServer({
    dir: process.cwd(),
    port: 3000,
    isDev: true,
    hostname: "127.0.0.1",
    allowRetry: false,
    minimalMode: false,
    keepAliveTimeout: undefined,
  });

  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
