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

type ExtendedLoggerOptions = {
	content?: string;
	webhookURL?: string;
	logLevel?: string;
} & LoggerOptions;

@WrapLogger
export default class Logger implements FastifyBaseLogger {
	private base: pino.Logger;
	private content?: string;
	private webhookURL?: string;
	public level: string;

	constructor(options: ExtendedLoggerOptions = {}) {
		this.base = pino(options);
		this.content = options.content;
		this.webhookURL = options.webhookURL;
		this.level = options.logLevel || process.env.LOG_LEVEL || 'info';
	}

	error(...args: any) {
		this.base.error.apply(this.base, args);
		if (this.webhookURL) {
			postErrorToDiscord(args[0], this.webhookURL, this.content).catch(
				(e) => {
					this.base.error('Error posting to Discord', e);
				}
			);
		}
	}

	info(...args: any) {
		this.base.info.apply(this.base, args);
	}

	warn(...args: any) {
		this.base.warn.apply(this.base, args);
	}

	debug(...args: any) {
		this.base.debug.apply(this.base, args);
	}

	trace(...args: any) {
		this.base.trace.apply(this.base, args);
	}

	fatal(...args: any) {
		this.base.fatal.apply(this.base, args);
	}

	child(...args: any) {
		return this.base.child.apply(this.base, args);
	}

	silent(...args: any) {
		return this.base.silent.apply(this.base, args);
	}
}
