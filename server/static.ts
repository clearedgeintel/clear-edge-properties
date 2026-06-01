import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Production-safe helpers with NO dependency on `vite`. `vite` is a
// devDependency and is stripped from the production image (`npm ci --omit=dev`),
// so anything imported at server startup must not pull it in. The dev-only
// `setupVite` lives in ./vite and is loaded via dynamic import only in dev.

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
