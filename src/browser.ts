import puppeteer, { Browser, Page } from 'puppeteer';

let browser: Browser | null = null;
let page: Page | null = null;

interface ConsoleLog {
  timestamp: string;
  type: string;
  text: string;
}

let consoleLogs: ConsoleLog[] = [];
const lastBadgeSelectorMap: Map<string, string> = new Map();

/**
 * Launches the Puppeteer browser if not already running.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    const disableSandbox = process.env.DISABLE_CHROME_SANDBOX === 'true';
    const args = disableSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
    browser = await puppeteer.launch({
      headless: true,
      args
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

export async function captureScreenshot(): Promise<string> {
  const p = await getPage();
  const screenshotBuffer = await p.screenshot({ type: 'png', fullPage: false });
  return screenshotBuffer.toString('base64');
}

/**
 * Captures an annotated screenshot with numbered badges on all visible interactive elements.
 */
export async function captureAnnotatedScreenshot(): Promise<{ screenshot: string; elements: Array<{ index: number; selector: string; description: string }> }> {
  const p = await getPage();
  
  // Inject script to find interactive elements, annotate them, and return elements metadata
  const elements = await p.evaluate(() => {
    // Helper to check if element is visible
    function isVisible(el: HTMLElement): boolean {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
      return true;
    }

    // Helper to generate a CSS selector for an element
    function getSelector(el: HTMLElement): string {
      if (el.id) return `#${el.id}`;
      let selector = el.tagName.toLowerCase();
      
      // Use clean class name list
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(/\s+/).filter(c => c && !c.startsWith('clc-') && !c.includes(':'));
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      // Handle inputs specifically
      if (el.tagName === 'INPUT' && el.getAttribute('name')) {
        return `input[name="${el.getAttribute('name')}"]`;
      }
      
      // Parent context for uniqueness
      const parent = el.parentElement;
      if (parent && parent.tagName !== 'BODY') {
        if (parent.id) {
          selector = `#${parent.id} > ${selector}`;
        } else {
          const siblings = Array.from(parent.children);
          const idx = siblings.indexOf(el) + 1;
          selector = `${parent.tagName.toLowerCase()} > ${selector}:nth-child(${idx})`;
        }
      }
      return selector;
    }

    // Helper to get element text description
    function getDescription(el: HTMLElement): string {
      const text = (el.innerText || el.textContent || '').trim().substring(0, 30);
      const placeholder = el.getAttribute('placeholder');
      const name = el.getAttribute('name');
      const ariaLabel = el.getAttribute('aria-label');
      
      let desc = '';
      if (ariaLabel) desc += `[aria-label="${ariaLabel}"]`;
      if (text) desc += ` "${text}"`;
      else if (placeholder) desc += ` placeholder="${placeholder}"`;
      else if (name) desc += ` name="${name}"`;
      
      return desc.trim() || `<${el.tagName.toLowerCase()}>`;
    }

    // Grab interactive candidate elements
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'a, button, input, select, textarea, [onclick], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"]'
    ));

    // Include items with pointer cursor
    Array.from(document.querySelectorAll<HTMLElement>('*')).forEach(el => {
      if (window.getComputedStyle(el).cursor === 'pointer' && !candidates.includes(el)) {
        candidates.push(el);
      }
    });

    const visibleList = candidates.filter(isVisible);

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'clc-badge-container';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2147483647';
    document.body.appendChild(overlay);

    const items: Array<{ index: number; selector: string; description: string }> = [];

    visibleList.forEach((el, i) => {
      const index = i + 1;
      const rect = el.getBoundingClientRect();
      
      const badge = document.createElement('div');
      badge.className = 'clc-interactive-badge';
      badge.innerText = `${index}`;
      badge.style.position = 'absolute';
      badge.style.top = `${rect.top + window.scrollY - 8}px`;
      badge.style.left = `${rect.left + window.scrollX - 8}px`;
      badge.style.backgroundColor = '#ff3b30';
      badge.style.color = '#ffffff';
      badge.style.border = '2px solid #ffffff';
      badge.style.borderRadius = '12px';
      badge.style.padding = '2px 6px';
      badge.style.fontSize = '11px';
      badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      badge.style.fontWeight = 'bold';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
      badge.style.zIndex = '2147483647';
      badge.style.pointerEvents = 'none';

      overlay.appendChild(badge);

      items.push({
        index,
        selector: getSelector(el),
        description: getDescription(el)
      });
    });

    return items;
  });

  // Capture screenshot with annotations visible
  const screenshotBuffer = await p.screenshot({ type: 'png', fullPage: false });
  const screenshot = screenshotBuffer.toString('base64');

  // Clean up overlays
  await p.evaluate(() => {
    const overlay = document.getElementById('clc-badge-container');
    if (overlay) overlay.remove();
  });

  // Update mapping
  lastBadgeSelectorMap.clear();
  elements.forEach(item => {
    lastBadgeSelectorMap.set(String(item.index), item.selector);
  });

  return { screenshot, elements };
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
  
  // Resolve numerical selectors
  let resolvedSelector = selector;
  if (/^\d+$/.test(selector)) {
    const mapped = lastBadgeSelectorMap.get(selector);
    if (mapped) {
      resolvedSelector = mapped;
    } else {
      throw new Error(`Selector '${selector}' is a number but does not match any detected interactive element badge. Make sure you view the page with 'annotate: true' first.`);
    }
  }

  // Wait for the selector to appear
  await p.waitForSelector(resolvedSelector, { timeout: 5000 });

  switch (action) {
    case 'click':
      await p.click(resolvedSelector);
      break;
      
    case 'type':
      if (value === undefined) {
        throw new Error("Value is required for 'type' action.");
      }
      // Clear input first if possible
      await p.focus(resolvedSelector);
      // Select all text and backspace
      await p.keyboard.down('Meta');
      await p.keyboard.press('KeyA');
      await p.keyboard.up('Meta');
      await p.keyboard.press('Backspace');
      
      await p.type(resolvedSelector, value);
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
      await p.hover(resolvedSelector);
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
