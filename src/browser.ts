import puppeteer, { Browser, Page } from 'puppeteer';

let browser: Browser | null = null;
let page: Page | null = null;

interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
}

let consoleLogs: ConsoleLog[] = [];

/**
 * Launches the Puppeteer browser if not already running.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Closes the browser and resets instances.
 */
export async function closeBrowser(): Promise<void> {
  if (page) {
    page = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
  consoleLogs = [];
}

/**
 * Initializes a new page or returns the active one.
 */
export async function getPage(): Promise<Page> {
  const b = await getBrowser();
  if (!page) {
    page = await b.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    
    // Attach console and error listeners
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({
        timestamp: new Date().toISOString(),
        type,
        text
      });
    });

    page.on('pageerror', (err) => {
      consoleLogs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        text: `Uncaught Exception: ${err.message}`
      });
    });

    page.on('requestfailed', (req) => {
      const errText = req.failure()?.errorText || 'unknown';
      consoleLogs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        text: `Failed to load resource ${req.url()}: ${errText}`
      });
    });
  }
  return page;
}

/**
 * Navigates to the specified URL.
 */
export async function navigateTo(url: string): Promise<void> {
  const p = await getPage();
  consoleLogs = []; // Clear logs for new navigation
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
}

/**
 * Captures a screenshot of the current page as a base64 encoded PNG.
 */
export async function captureScreenshot(): Promise<string> {
  const p = await getPage();
  const screenshotBuffer = await p.screenshot({ type: 'png', fullPage: false });
  return screenshotBuffer.toString('base64');
}

/**
 * Configures the viewport dimensions.
 */
export async function setViewport(width: number, height: number): Promise<void> {
  const p = await getPage();
  await p.setViewport({ width, height });
}

/**
 * Performs a user interaction on the page.
 */
export async function interactWithPage(
  action: 'click' | 'type' | 'scroll' | 'hover',
  selector: string,
  value?: string
): Promise<void> {
  const p = await getPage();
  
  // Wait for the selector to appear
  await p.waitForSelector(selector, { timeout: 5000 });

  switch (action) {
    case 'click':
      await p.click(selector);
      break;
      
    case 'type':
      if (value === undefined) {
        throw new Error("Value is required for 'type' action.");
      }
      // Clear input first if possible
      await p.focus(selector);
      // Select all text and backspace
      await p.keyboard.down('Meta');
      await p.keyboard.press('KeyA');
      await p.keyboard.up('Meta');
      await p.keyboard.press('Backspace');
      
      await p.type(selector, value);
      break;
      
    case 'scroll':
      // Value can represent scroll direction/amount (e.g. 'down', 'up', or a number)
      if (value === 'up') {
        await p.evaluate(() => window.scrollBy(0, -window.innerHeight / 2));
      } else if (value === 'down' || !value) {
        await p.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
      } else {
        const scrollAmount = parseInt(value, 10);
        if (!isNaN(scrollAmount)) {
          await p.evaluate((y) => window.scrollBy(0, y), scrollAmount);
        }
      }
      break;
      
    case 'hover':
      await p.hover(selector);
      break;

    default:
      throw new Error(`Unsupported interaction action: ${action}`);
  }

  // Allow animations or state changes to settle
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Returns accumulated logs.
 */
export function getConsoleLogs(): ConsoleLog[] {
  return consoleLogs;
}

/**
 * Clears the accumulated log buffer.
 */
export function clearConsoleLogs(): void {
  consoleLogs = [];
}
