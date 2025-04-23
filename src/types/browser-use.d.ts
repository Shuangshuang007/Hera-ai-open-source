declare module 'browser-use' {
  export interface BrowserConfig {
    browserBinaryPath?: string;
    disableSecurity?: boolean;
    headless?: boolean;
    defaultViewport?: {
      width: number;
      height: number;
    };
    args?: string[];
  }

  export class Browser {
    constructor(config?: BrowserConfig);
    launch(): Promise<void>;
    close(): Promise<void>;
    goto(url: string): Promise<void>;
    waitForNavigation(): Promise<void>;
    evaluate<T>(fn: () => T): Promise<T>;
  }
} 