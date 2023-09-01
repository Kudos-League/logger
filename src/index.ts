import 'dotenv/config';
import pino, { LoggerOptions } from 'pino';
import fetch from 'node-fetch';
import { FastifyBaseLogger } from 'fastify';

async function postErrorToDiscord(error: Error, url: string, content?: string) {
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        content: content || undefined,
        embeds: [
          {
            title: `An error occurred: ${error.message}`,
            description: error.stack,
            color: 0xff0000,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (e: any) {
    this.error('Error with Discord webhook', e);
  }
}

export function WrapLogger<T extends new (...args: any[]) => any>(
  constructor: T,
  _?: any
) {
  return class extends constructor {
    error(...args: any[]) {
      if (typeof args[0] === 'string' && args.length > 1) {
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg instanceof Error) {
            const [err] = args.splice(i, 1);
            args.unshift(err);
          }
        }
      }
      super.error(...args);
    }
  };
}

@WrapLogger
export default class Logger implements FastifyBaseLogger {
  private pinoLogger: pino.Logger;
  private content?: string;
  private webhookURL?: string;
  public level: string;

  constructor(
    opts?: LoggerOptions,
    { content, webhookURL }: { content?: string; webhookURL?: string } = {}
  ) {
    this.pinoLogger = pino(opts);
    this.content = content;
    this.webhookURL = webhookURL;
    this.level = process.env.LOG_LEVEL || 'info';
  }
  error(...args: any) {
    this.pinoLogger.error.apply(null, args);
    if (this.webhookURL) {
      postErrorToDiscord(args[0], this.webhookURL, this.content).catch((e) => {
        this.pinoLogger.error('Error posting to Discord', e);
      });
    }
  }

  info(...args: any) {
    this.pinoLogger.info.apply(null, args);
  }

  warn(...args: any) {
    this.pinoLogger.warn.apply(null, args);
  }

  debug(...args: any) {
    this.pinoLogger.debug.apply(null, args);
  }

  trace(...args: any) {
    this.pinoLogger.trace.apply(null, args);
  }

  fatal(...args: any) {
    this.pinoLogger.fatal.apply(null, args);
  }

  child(...args: any) {
    return this.pinoLogger.child.apply(null, args);
  }

  silent(...args: any) {
    return this.pinoLogger.silent.apply(null, args);
  }
}
