import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let shuttingDown = false;

const prefixOutput = (name, stream, chunk) => {
  const lines = chunk.toString().split(/\r?\n/);

  for (const line of lines) {
    if (line) {
      stream.write(`[${name}] ${line}\n`);
    }
  }
};

const stopChild = (child) => {
  if (!child || child.exitCode !== null || child.signalCode) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    stopChild(child);
  }

  process.exitCode = exitCode;
};

const start = ({ name, prefix, script }) => {
  const child = spawn(npmCommand, ["--prefix", prefix, "run", script], {
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);

  child.stdout.on("data", (chunk) => prefixOutput(name, process.stdout, chunk));
  child.stderr.on("data", (chunk) => prefixOutput(name, process.stderr, chunk));

  child.once("exit", (code, signal) => {
    children.delete(child);

    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.error(`[dev] ${name} exited with ${reason}.`);
      shutdown(code || 1);
    }
  });

  child.once("error", (error) => {
    console.error(`[dev] Could not start ${name}: ${error.message}`);
    shutdown(1);
  });

  return child;
};

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: npm run dev",
      "",
      "Starts the backend API and frontend Vite app together.",
      "Stop both processes with Ctrl+C.",
    ].join("\n"),
  );
  process.exit(0);
}

console.log("[dev] Starting backend and frontend. Press Ctrl+C to stop.");

start({ name: "backend", prefix: "backend", script: "dev" });
start({ name: "frontend", prefix: "frontend", script: "dev" });

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));
