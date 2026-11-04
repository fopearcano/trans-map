import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module: keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Allow opening the dev server via the loopback IP as well as "localhost".
  allowedDevOrigins: ["127.0.0.1"],
  // Do not (re)generate AGENTS.md / CLAUDE.md in the repository.
  agentRules: false,
};

export default nextConfig;
