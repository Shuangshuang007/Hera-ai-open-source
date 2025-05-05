const { Server } = require('ws');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_PATH = path.resolve(__dirname, 'linkedin-session.json');
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 1个月
const TIMEOUT = 60000; // 60秒超时

const wss = new Server({ port: 3003 });

console.log('Starting WebSocket server...');

wss.on('connection', async (ws) => {
  console.log('New WebSocket connection established');
  let browser, context, page;
  let sessionValid = false;
  
  try {
    // 检查session是否存在且未过期
    if (fs.existsSync(SESSION_PATH)) {
      console.log('Found existing session file');
      const stat = fs.statSync(SESSION_PATH);
      const now = Date.now();
      if (now - stat.mtimeMs < SESSION_MAX_AGE) {
        sessionValid = true;
        console.log('Session is valid');
      } else {
        console.log('Session expired, removing file');
        fs.unlinkSync(SESSION_PATH);
      }
    }

    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: true,
      timeout: TIMEOUT
    });
    console.log('Browser launched successfully');

    if (sessionValid) {
      console.log('Loading saved session...');
      context = await browser.newContext({ 
        storageState: SESSION_PATH,
        timeout: TIMEOUT
      });
    } else {
      console.log('Creating new browser context...');
      context = await browser.newContext({ timeout: TIMEOUT });
    }

    page = await context.newPage();
    await page.setDefaultTimeout(TIMEOUT);

    console.log('Navigating to LinkedIn Australia...');
    await page.goto('https://www.linkedin.com/jobs/search?location=Australia', {
      waitUntil: 'networkidle'
    });
    console.log('Navigation completed');
    
    if (!sessionValid) {
      console.log('Waiting for user login...');
      ws.send(Buffer.from('LOGIN_REQUIRED'));
      await page.waitForSelector('nav[aria-label="Primary"] img, .jobs-search__results-list', { 
        timeout: 0,
        state: 'visible'
      });
      console.log('User logged in, saving session...');
      await context.storageState({ 
        path: SESSION_PATH,
        timeout: TIMEOUT
      });
      console.log('Session saved successfully');
    }

    let running = true;
    ws.on('close', async () => {
      console.log('WebSocket connection closed');
      running = false;
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    });

    console.log('Starting screenshot stream...');
    while (running) {
      try {
        const screenshot = await page.screenshot({ 
          type: 'jpeg', 
          quality: 60,
          timeout: TIMEOUT,
          fullPage: true
        });
        console.log('Screenshot taken, size:', screenshot.length, 'bytes');
        ws.send(screenshot);
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error('Error taking screenshot:', error);
        break;
      }
    }
  } catch (error) {
    console.error('Error in WebSocket connection:', error);
    ws.send(Buffer.from('ERROR:' + error.message));
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed after error');
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

console.log('WebSocket screenshot server running on ws://localhost:3003'); 