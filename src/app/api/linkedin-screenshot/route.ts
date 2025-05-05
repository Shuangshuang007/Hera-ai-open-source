import { NextApiRequest } from 'next';
import { Server } from 'ws';
import { chromium } from 'playwright';

// 只在开发环境下启用
export const config = {
  api: {
    bodyParser: false,
  },
};

let wss: Server | null = null;

export default async function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.wss) {
    wss = new Server({ noServer: true });
    res.socket.server.wss = wss;
    res.socket.server.on('upgrade', (request: any, socket: any, head: any) => {
      wss?.handleUpgrade(request, socket, head, (ws) => {
        wss?.emit('connection', ws, request);
      });
    });
  }

  if (req.method === 'GET') {
    res.status(200).json({ status: 'WebSocket server ready' });
  }

  if (wss) {
    wss.on('connection', async (ws: any) => {
      // 启动Playwright有头浏览器
      const browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();
      await page.goto('https://www.linkedin.com/jobs/search');
      let running = true;
      ws.on('close', async () => {
        running = false;
        await browser.close();
      });
      // 定时截图并推送
      while (running) {
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
        ws.send(screenshot);
        await new Promise(r => setTimeout(r, 500));
      }
    });
  }
} 