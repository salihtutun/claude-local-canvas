import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export async function runSetup() {
  console.log('🎨 Starting Claude Local Canvas Setup...');
  try {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    
    let configDir = '';
    if (isMac) {
      configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
    } else if (isWindows) {
      configDir = path.join(process.env.APPDATA || '', 'Claude');
    } else {
      console.error('❌ Error: Claude Desktop is only officially supported on macOS and Windows.');
      process.exit(1);
    }
    
    const configPath = path.join(configDir, 'claude_desktop_config.json');
    console.log(`🔍 Locating Claude Desktop configuration file at:\n   ${configPath}`);
    
    // Ensure the config directory exists
    await fs.mkdir(configDir, { recursive: true });
    
    let config: any = { mcpServers: {} };
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(fileContent);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      console.log('📝 Configuration file does not exist. Creating a new one...');
    }
    
    // Determine the path of the built file
    const currentFilePath = fileURLToPath(import.meta.url);
    const isLocalClone = !currentFilePath.includes('node_modules') && !currentFilePath.includes('.npm');
    
    if (isLocalClone) {
      // Find the absolute path to dist/index.js relative to the current file
      const distDir = path.dirname(currentFilePath);
      const indexJsPath = path.resolve(distDir, 'index.js');
      
      console.log(`📂 Local development setup detected.`);
      console.log(`📍 Using build file path: ${indexJsPath}`);
      
      config.mcpServers['claude-local-canvas'] = {
        command: 'node',
        args: [indexJsPath]
      };
    } else {
      console.log(`📦 Global/npx installation setup detected.`);
      config.mcpServers['claude-local-canvas'] = {
        command: 'npx',
        args: ['-y', 'claude-local-canvas']
      };
    }
    
    // Write back to config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ Configuration updated successfully!');
    console.log('💡 Please fully restart Claude Desktop for the changes to take effect.');
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}
