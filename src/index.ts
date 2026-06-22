#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import {
  writeSandboxFile,
  readSandboxFile,
  listSandboxFiles,
  startSandboxServer,
  stopSandboxServer,
  getActiveServerUrl,
  SANDBOX_DIR
} from './server.js';

import {
  navigateTo,
  captureScreenshot,
  setViewport,
  interactWithPage,
  getConsoleLogs,
  closeBrowser,
  getPage
} from './browser.js';

// Setup MCP server instance
const server = new Server(
  {
    name: 'canvas-local-canvas',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'canvas_write_file',
        description: 'Write or update a file in the canvas local preview directory. Automatically creates folder subdirectories if they do not exist.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The relative path of the file within the sandbox (e.g., "index.html", "css/styles.css", "js/app.js").'
            },
            content: {
              type: 'string',
              description: 'The content of the file to write.'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'canvas_read_file',
        description: 'Read the contents of a file in the canvas local preview directory.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The relative path of the file within the sandbox.'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'canvas_list_files',
        description: 'Recursively list all files and folders in the canvas local preview directory.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'canvas_start_server',
        description: 'Starts the local static HTTP server for previewing the project files.',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Optional port number. Defaults to 3000. If port is in use, will find the next available port.'
            }
          }
        }
      },
      {
        name: 'canvas_view_page',
        description: 'Navigates the headless browser to the preview URL (or custom local/remote URL). Returns an inline base64 PNG screenshot of the browser window and captures any JS console logs or errors.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Optional URL to view. If omitted, defaults to the running local server\'s URL. Starts server if not already running.'
            },
            width: {
              type: 'number',
              description: 'Optional viewport width in pixels. Defaults to 1024.'
            },
            height: {
              type: 'number',
              description: 'Optional viewport height in pixels. Defaults to 768.'
            }
          }
        }
      },
      {
        name: 'canvas_interact',
        description: 'Performs a user action (click, type, scroll, hover) on the current browser page, then returns the updated screenshot and console logs.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['click', 'type', 'scroll', 'hover'],
              description: 'The interaction action to perform.'
            },
            selector: {
              type: 'string',
              description: 'CSS selector of the target element (e.g., "button#submit", "input[name=\'email\']", ".toggle-btn").'
            },
            value: {
              type: 'string',
              description: 'Required for "type" action (the text to type). For "scroll" action, optional scroll direction ("up"/"down") or vertical scroll pixel distance.'
            }
          },
          required: ['action', 'selector']
        }
      },
      {
        name: 'canvas_stop_server',
        description: 'Stops the local HTTP server and closes any active Puppeteer browser instances.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool execution calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'canvas_write_file': {
        const filePath = String(args?.path);
        const content = String(args?.content);
        const resolvedPath = await writeSandboxFile(filePath, content);
        return {
          content: [{
            type: 'text',
            text: `Successfully wrote file: ${filePath} (saved to sandbox: ${resolvedPath})`
          }]
        };
      }

      case 'canvas_read_file': {
        const filePath = String(args?.path);
        const content = await readSandboxFile(filePath);
        return {
          content: [{
            type: 'text',
            text: content
          }]
        };
      }

      case 'canvas_list_files': {
        const files = await listSandboxFiles();
        if (files.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `The sandbox directory is empty. Root folder: ${SANDBOX_DIR}`
            }]
          };
        }
        const fileListStr = files
          .map(f => `${f.isDirectory ? '[DIR] ' : '      '}${f.path}${f.size !== undefined ? ` (${f.size} bytes)` : ''}`)
          .join('\n');
        return {
          content: [{
            type: 'text',
            text: `Sandbox Directory: ${SANDBOX_DIR}\n\nFiles:\n${fileListStr}`
          }]
        };
      }

      case 'canvas_start_server': {
        const portArg = args?.port !== undefined ? Number(args.port) : 3000;
        const info = await startSandboxServer(portArg);
        return {
          content: [{
            type: 'text',
            text: `Sandbox server started successfully at ${info.url} (port: ${info.port}). Static files are served from: ${SANDBOX_DIR}`
          }]
        };
      }

      case 'canvas_view_page': {
        // Resolve URL to navigate to
        let url = args?.url ? String(args.url) : null;
        if (!url) {
          // If no URL, try finding running server, or start it
          let serverUrl = getActiveServerUrl();
          if (!serverUrl) {
            const serverInfo = await startSandboxServer(3000);
            serverUrl = serverInfo.url;
          }
          url = serverUrl;
        }

        // Apply viewport if provided
        const width = args?.width !== undefined ? Number(args.width) : 1024;
        const height = args?.height !== undefined ? Number(args.height) : 768;
        await setViewport(width, height);

        // Navigate browser to the page
        await navigateTo(url);
        
        // Grab browser information
        const browserPage = await getPage();
        const title = await browserPage.title();
        const activeUrl = browserPage.url();

        // Capture screenshot and console logs
        const screenshot = await captureScreenshot();
        const logs = getConsoleLogs();
        
        let logsSummary = 'No console logs captured.';
        if (logs.length > 0) {
          logsSummary = logs.map(l => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
        }

        return {
          content: [
            {
              type: 'text',
              text: `Page loaded: "${title}"\nURL: ${activeUrl}\n\n--- Console Logs ---\n${logsSummary}\n--------------------`
            },
            {
              type: 'image',
              data: screenshot,
              mimeType: 'image/png'
            }
          ]
        };
      }

      case 'canvas_interact': {
        const action = args?.action as 'click' | 'type' | 'scroll' | 'hover';
        const selector = String(args?.selector);
        const value = args?.value !== undefined ? String(args.value) : undefined;

        // Perform the interaction
        await interactWithPage(action, selector, value);

        // Grab browser information
        const browserPage = await getPage();
        const title = await browserPage.title();
        const activeUrl = browserPage.url();

        // Capture new screenshot and console logs
        const screenshot = await captureScreenshot();
        const logs = getConsoleLogs();

        let logsSummary = 'No new console logs captured.';
        if (logs.length > 0) {
          logsSummary = logs.map(l => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
        }

        return {
          content: [
            {
              type: 'text',
              text: `Performed interaction: ${action} on '${selector}'\nActive Page: "${title}" (${activeUrl})\n\n--- Console Logs ---\n${logsSummary}\n--------------------`
            },
            {
              type: 'image',
              data: screenshot,
              mimeType: 'image/png'
            }
          ]
        };
      }

      case 'canvas_stop_server': {
        await stopSandboxServer();
        await closeBrowser();
        return {
          content: [{
            type: 'text',
            text: 'Preview server stopped and browser closed.'
          }]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error executing ${name}: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start the server transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Claude Local Canvas MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
