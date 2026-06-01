// DEV-ONLY module. It imports `vite` (a devDependency) at the top level, so it
// must never be statically imported from the server entrypoint — load it via
// dynamic import behind a development check. Production serving lives in
// ./static (no vite dependency).
import { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export async function setupVite(app: Express, server: Server) {
  // All vite-related imports are dynamic so esbuild has no top-level `vite`
  // reference to hoist into the production bundle — they only resolve here, in
  // the development branch.
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { nanoid } = await import("nanoid");
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    // Let vite resolve vite.config.ts from disk (dev only). Importing the config
    // here would pull `vite`/plugins into the production server bundle.
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
