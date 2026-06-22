# 🌐 Claude Local Canvas (MCP Server)

[![Model Context Protocol](https://img.shields.io/badge/MCP-Supported-blue.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

Bring **Artifacts-style live previews and debugging** directly to your **Claude Desktop** application! 

`claude-local-canvas` is a Model Context Protocol (MCP) server that empowers Claude with a local sandbox environment, a static web server, and a headless browser. When you ask Claude to build a web application, it can write the code, serve it locally, open it in a real browser, capture screenshots to show you the UI, and automatically monitor console errors to fix bugs in real-time.

![Claude Local Canvas Architecture Diagram](https://raw.githubusercontent.com/modelcontextprotocol/spec/main/mcp.png) *(Placeholder: Replace with a gorgeous GIF showing Claude self-correcting and displaying screenshots in the chat!)*

---

## ✨ Features

*   📂 **Local File Sandbox**: Claude writes HTML, CSS, JS, and asset files safely inside a dedicated workspace folder.
*   ⚡ **Instant Local Server**: Serves your web project statically in the background on a dynamic, conflict-free port.
*   📸 **Inline Screenshots**: Captures screenshots of the rendered page and displays them directly inside the Claude Desktop chat.
*   🐞 **Automatic Console Debugging**: Captures runtime JavaScript console warnings, console errors, resource loading failures, and uncaught exceptions, streaming them back to Claude so it can self-repair its code.
*   🖱️ **Interactive Agent Tools**: Allows Claude to click buttons, input text, hover elements, and scroll through pages, updating the screenshot with each action.

---

## 🚀 Installation & Setup

Follow these steps to connect `claude-local-canvas` to your Claude Desktop.

### 1. Build the Server Locally
Ensure you have Node.js (v18+) installed. Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/claude-local-canvas.git
cd claude-local-canvas
npm install
npm run build
```

### 2. Configure Claude Desktop
Open your Claude Desktop configuration file. The file is located at:
*   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server to the `mcpServers` object:

```json
{
  "mcpServers": {
    "local-canvas": {
      "command": "node",
      "args": [
        "/absolute/path/to/claude-local-canvas/dist/index.js"
      ]
    }
  }
}
```
*(Make sure to replace `/absolute/path/to/` with the actual path where you built the server on your computer).*

### 3. Restart Claude Desktop
Fully quit (cmd+Q / Alt+F4) and relaunch the Claude Desktop app. You should now see a 🔌 icon showing that the tools are loaded.

---

## 🛠️ Available Tools

Once connected, Claude has access to the following capabilities:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `canvas_write_file` | `path`, `content` | Writes or overwrites a file in the local sandbox. |
| `canvas_read_file` | `path` | Reads the content of a file from the local sandbox. |
| `canvas_list_files` | (none) | Lists all files and subdirectories in the sandbox. |
| `canvas_start_server` | `port` (optional) | Starts the background web server on an available port. |
| `canvas_view_page` | `url` (optional), `width`, `height` | Loads the page in a headless browser and returns a base64 screenshot + console logs. |
| `canvas_interact` | `action`, `selector`, `value` | Simulates user inputs (`click`, `type`, `scroll`, `hover`) and returns the new screenshot. |
| `canvas_stop_server` | (none) | Stops the web server and closes the Puppeteer browser instance. |

---

## 💡 Example Prompts to Try

Try pasting these instructions to Claude after installation:

*   *"Create a beautiful Pomodoro Timer application with a sleek dark mode, digital clock, sound alerts, and a dynamic circular progress bar using Claude Local Canvas."*
*   *"Write an interactive dashboard with a sample line chart showing user signups. Add interactive buttons to filter data by 7 days, 30 days, or 1 year."*
*   *"Open the page, input '5' into the timer duration box, click 'Start', and then show me what it looks like after 2 seconds."*

---

## 🔒 Security Note
This MCP server only accesses files located in the designated `sandbox/` folder inside the server package, or a folder set by the `CANVAS_SANDBOX_DIR` environment variable. Path-traversal checks prevent files from escaping this folder.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/claude-local-canvas/issues).

Show your support by giving this project a ⭐ on GitHub!
