<p align="center">
  <img src="logo.png" width="650" alt="Canvas Local Canvas Logo">
</p>

<h1 align="center">🎨 Canvas Local Canvas</h1>

<p align="center">
  <strong>Bring Artifacts-style live previews and real-time debugging to Claude Desktop.</strong>
</p>

<p align="center">
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Supported-blue.svg" alt="Model Context Protocol"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/salihtutun/canvas-local-canvas/stargazers"><img src="https://img.shields.io/github/stars/salihtutun/canvas-local-canvas.svg" alt="GitHub Stars"></a>
  <a href="https://github.com/salihtutun/canvas-local-canvas/issues"><img src="https://img.shields.io/github/issues/salihtutun/canvas-local-canvas.svg" alt="GitHub Issues"></a>
</p>

---

`canvas-local-canvas` is a Model Context Protocol (MCP) server that empowers Claude Desktop with a local preview sandbox, a background static web server, and an automated headless browser (powered by Puppeteer). 

When you ask Claude to design or build web interfaces, it writes the code directly to a local workspace, boots up a dev server, launches Chromium, and **streams screenshots of the rendered page back inline to your chat**. Even better, it listens to runtime JavaScript errors and resource failures, feeding them back to Claude so it can **self-correct and debug** its work in real-time.

---

## ✨ Key Features

*   📂 **Local Sandbox Workspace**: Write, edit, and maintain HTML, CSS, JS, and asset structures inside an isolated sandbox directory.
*   ⚡ **Dynamic Local HTTP Server**: Instantly serve code locally using standard, fast-routing HTTP protocols. Automatic port conflict resolution ensures it runs seamlessly.
*   📸 **Inline Chat Screenshot Previews**: High-resolution PNG captures are returned directly into your Claude Desktop client, giving you instant visual feedback.
*   🐞 **Self-Correction & Console Watcher**: Streams console outputs, syntax warnings, network resource failures, and uncaught exceptions back to the context window so Claude repairs bugs automatically.
*   🖱️ **Interactive Agent Tools**: Simulates actual user interactions like `click`, `type`, `scroll`, and `hover` on target elements, returning updated screenshots after each state change.
*   🔒 **Safe Path Traversal Protection**: Hardened sandbox constraints prevent directory traversal attacks, keeping your host system secure.

---

## 🚀 Installation & Setup

Set up your local canvas in less than 3 minutes.

### 1. Build the Server
Ensure you have [Node.js](https://nodejs.org/) (v18+) installed. Clone and build the project:

```bash
git clone https://github.com/salihtutun/canvas-local-canvas.git
cd canvas-local-canvas
npm install
npm run build
```

### 2. Connect to Claude Desktop
Open your Claude Desktop configuration file:
*   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server entry to your configuration:

```json
{
  "mcpServers": {
    "canvas-local-canvas": {
      "command": "node",
      "args": [
        "/absolute/path/to/canvas-local-canvas/dist/index.js"
      ]
    }
  }
}
```
> 💡 *Note: Remember to replace `/absolute/path/to/` with the exact path where you built the server on your computer.*

### 3. Relaunch Claude Desktop
Fully restart the Claude Desktop application (Cmd+Q on macOS or close from tray). A 🔌 icon will appear in the input box, indicating the tools are ready.

---

## 🛠️ Available MCP Tools

Once installed, Claude will utilize the following tools dynamically when prompted:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `canvas_write_file` | `path` (str), `content` (str) | Writes or updates a code file inside the isolated sandbox workspace. |
| `canvas_read_file` | `path` (str) | Reads and returns the content of a file from the workspace. |
| `canvas_list_files` | (none) | Recursively lists all file trees and sizes inside the sandbox. |
| `canvas_start_server` | `port` (number, optional) | Starts the background web server on an available port. |
| `canvas_view_page` | `url` (optional), `width`, `height` | Loads the page in Chromium and returns base64 inline PNG + console outputs. |
| `canvas_interact` | `action` (enum), `selector`, `value` | Interacts with elements (`click`, `type`, `scroll`, `hover`) and gets the new UI state. |
| `canvas_stop_server` | (none) | Shuts down the background web server and closes active browser pages. |

---

## 💡 Example Prompts to Try

Start a chat with Claude Desktop and run:

*   **Create a beautiful game:**
    > *"Create an interactive, premium-designed Tic-Tac-Toe game with neon styling, score tracking, win animations, sound effects, and smooth transitions using the Canvas Local Canvas tools."*
*   **Generate and check responsive layout:**
    > *"Build a modern grid dashboard for financial metrics with a dark mode toggle. Open the viewport at 375px width (mobile) to verify that the mobile layout displays perfectly."*
*   **Test and debug user flows:**
    > *"Open the current page, type 'admin@canvas.local' in the email box, type 'password123' in the password box, click the submit button, and let me see what happens."*

---

## 🤝 Contributing
Contributions are highly encouraged! Feel free to open issues or submit pull requests.
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Show your support by giving this project a ⭐ on GitHub!
</p>
