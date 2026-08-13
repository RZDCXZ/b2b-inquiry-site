import { spawnSync } from "node:child_process";

const expectedNode = "24.18.0";
const expectedPnpm = "11.21.0";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`${command} could not be started: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} failed with exit code ${result.status}.`,
    );
  }
}

if (process.versions.node !== expectedNode) {
  fail(`Node.js ${expectedNode} is required; found ${process.versions.node}.`);
}

const pnpmUserAgent = process.env.npm_config_user_agent ?? "";
if (!pnpmUserAgent.startsWith(`pnpm/${expectedPnpm} `)) {
  fail(`pnpm ${expectedPnpm} is required. Run this command through Corepack.`);
}

console.log("Preparing the reproducible Torquelis local demo...");
run("corepack", ["pnpm", "install", "--frozen-lockfile"]);
run("corepack", ["pnpm", "exec", "tsx", "scripts/prepare-local-state.ts"]);
run("corepack", ["pnpm", "exec", "tsx", "scripts/verify-local-target.ts"]);
run("docker", ["compose", "up", "-d", "--wait"]);
run("corepack", ["pnpm", "db:migrate"]);
run("corepack", ["pnpm", "db:seed"]);
console.log("Setup complete. Start the application with: corepack pnpm dev");
