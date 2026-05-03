const { spawn } = require("child_process");
const path = require("path");

const uiRoot = path.resolve(__dirname, "..");
const nextBin = path.join(uiRoot, "node_modules", "next", "dist", "bin", "next");

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "127.0.0.1", "-p", "3000"],
  {
    cwd: uiRoot,
    env: process.env,
    stdio: "inherit",
  }
);

const forwardSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
forwardSignals.forEach((signal) => {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
});

child.on("error", (error) => {
  console.error("[start-next-local-dev] failed to spawn next dev:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
    return;
  }
  process.exit(typeof code === "number" ? code : 1);
});
