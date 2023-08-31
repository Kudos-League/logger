import 'dotenv/config';
import pino from 'pino';
import fetch from 'node-fetch';

export function wrap(logger: pino.Logger) {
  const { error, child } = logger;

  function errorRearranger(...args: any) {
    if (typeof args[0] === 'string' && args.length > 1) {
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg instanceof Error) {
          const [err] = args.splice(i, 1);
          args.unshift(err);
        }
      }
    }
    return error.apply(this, args);
  }

  function childModifier(...args: any) {
    const c = child.apply(this, args);
    c.error = errorRearranger;
    (c as any).child = childModifier;
    return c;
  }

  logger.error = errorRearranger.bind(logger);
  (logger as any).child = childModifier.bind(logger);

  return logger;
}

const logger = wrap(
  pino({
    level: process.env.LOG_LEVEL || 'debug',
    transport:
      process.env.ENV !== 'development'
        ? undefined
        : {
            target: 'pino-pretty',
          },
    hooks: {
      logMethod(inputArgs, method, level) {
        if (level === 50 && (inputArgs[0] as unknown) instanceof Error) {
          const err = inputArgs[0] as unknown as Error;
          let args: string[] = [];

          if (err.cause) {
            args = [
              `${err.stack}\nCaused by: ${err.cause[0]} ${err.cause[0].stack}`,
            ];
          } else {
            args = [err.stack || ''];
          }

          return method.apply(this, args as any);
        }

        // Handles additional arguments being passed in
        for (let i = 0; i < inputArgs.length; ++i) {
          if (Array.isArray(inputArgs[i])) {
            inputArgs[i] = inputArgs[i].join(' ');
          }

          if (i !== 0) {
            inputArgs[0] += ` ${inputArgs[i]}`;
          }
        }

        return method.apply(this, inputArgs);
      },
    },
  })
);

export async function postErrorToDiscord(
  error: Error,
  url: string,
  content?: string
) {
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
    logger.error('Error with Discord webhook', e);
  }
}

export default class Logger {
  content?: string;
  webhookURL?: string;

  constructor({
    content,
    webhookURL,
  }: { content?: string; webhookURL?: string } = {}) {
    this.content = content;
    this.webhookURL = webhookURL;
  }

  static debug(...args: any) {
    logger.debug(args);
  }

  static info(...args: any) {
    logger.info(args);
  }

  static warn(...args: any) {
    logger.warn(args);
  }

  static error(...args: any) {
    logger.error(args);
  }

  error(...args: any) {
    logger.error(args);
    if (this.webhookURL) {
      postErrorToDiscord(args[0], this.webhookURL, this.content);
    }
  }

  trace(...args: any) {
    logger.trace(args);
  }

  fatal(...args: any) {
    logger.fatal(args);
  }

  child(...args: any) {
    return logger.child(args);
  }
}
