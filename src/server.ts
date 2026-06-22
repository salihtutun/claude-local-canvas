import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import sirv from 'sirv';

// Sandbox directory configuration
const defaultSandboxDir = path.join(process.cwd(), 'sandbox');
export const SANDBOX_DIR = process.env.CANVAS_SANDBOX_DIR || defaultSandboxDir;

let activeServer: http.Server | null = null;
let activePort: number | null = null;

/**
 * Ensures the sandbox directory exists.
 */
export async function ensureSandboxDir(): Promise<string> {
  try {
    await fs.mkdir(SANDBOX_DIR, { recursive: true });
  } catch (err) {
    // Ignore if directory already exists
  }
  return SANDBOX_DIR;
}

/**
 * Resolves a path within the sandbox, throwing an error if it escapes the sandbox.
 */
export function resolveSafePath(relativePath: string): string {
  const resolved = path.resolve(SANDBOX_DIR, relativePath);
  const rel = path.relative(SANDBOX_DIR, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Access denied: path '${relativePath}' escapes the sandbox directory.`);
  }
  return resolved;
}

/**
 * Writes a file to the sandbox.
 */
export async function writeSandboxFile(relativePath: string, content: string): Promise<string> {
  await ensureSandboxDir();
  const safePath = resolveSafePath(relativePath);
  
  // Ensure the parent directory exists
  await fs.mkdir(path.dirname(safePath), { recursive: true });
  await fs.writeFile(safePath, content, 'utf-8');
  return safePath;
}

/**
 * Reads a file from the sandbox.
 */
export async function readSandboxFile(relativePath: string): Promise<string> {
  const safePath = resolveSafePath(relativePath);
  return await fs.readFile(safePath, 'utf-8');
}

interface FileItem {
  path: string;
  isDirectory: boolean;
  size?: number;
}

/**
 * Recursively lists all files and directories in the sandbox.
 */
export async function listSandboxFiles(dir: string = SANDBOX_DIR): Promise<FileItem[]> {
  await ensureSandboxDir();
  const items: FileItem[] = [];
  
  async function scan(currentDir: string) {
    const files = await fs.readdir(currentDir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      const relativePath = path.relative(SANDBOX_DIR, fullPath);
      
      if (file.isDirectory()) {
        items.push({ path: relativePath, isDirectory: true });
        await scan(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        items.push({ path: relativePath, isDirectory: false, size: stats.size });
      }
    }
  }
  
  await scan(SANDBOX_DIR);
  return items;
}

/**
 * Starts a static HTTP server serving the sandbox directory.
 */
export async function startSandboxServer(port: number = 3000): Promise<{ port: number; url: string }> {
  await ensureSandboxDir();
  
  if (activeServer) {
    return { port: activePort!, url: `http://localhost:${activePort}` };
  }

  const assets = sirv(SANDBOX_DIR, {
    dev: true,
    single: false,
    dotfiles: false,
    cors: true
  });

  const server = http.createServer((req, res) => {
    assets(req, res, () => {
      res.statusCode = 404;
      res.end('Not Found - Claude Local Canvas Sandbox');
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        console.error(`Port ${port} is in use, trying ${port + 1}...`);
        startSandboxServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      activeServer = server;
      activePort = port;
      const url = `http://localhost:${port}`;
      console.error(`Sandbox server running at ${url}`);
      resolve({ port, url });
    });
  });
}

/**
 * Stops the active static HTTP server if running.
 */
export async function stopSandboxServer(): Promise<void> {
  if (!activeServer) return;
  
  return new Promise((resolve) => {
    activeServer!.close(() => {
      activeServer = null;
      activePort = null;
      console.error('Sandbox server stopped');
      resolve();
    });
  });
}

/**
 * Gets the current server URL if active.
 */
export function getActiveServerUrl(): string | null {
  return activePort ? `http://localhost:${activePort}` : null;
}
