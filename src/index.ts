import 'dotenv/config';
import 'isomorphic-fetch';

import pino, { LoggerOptions } from 'pino';
import { FastifyBaseLogger } from 'fastify';

function stringifyArg(arg: any): string {
	if (typeof arg === 'object' && arg !== null) {
		return JSON.stringify(arg);
	}
	return String(arg);
}

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

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

@WrapLogger
export default class Logger implements FastifyBaseLogger {
	private base: pino.Logger;
	private content?: string;
	private webhookURL?: string;
	public level: Level = 'info';

	constructor(options: ExtendedLoggerOptions = {}) {
		this.content = options.content;
		this.webhookURL = options.webhookURL;
		this.level = (options.logLevel ||
			process.env.LOG_LEVEL ||
			'info') as Level;
		const isProduction = process.env.NODE_ENV === 'production';
		const pinoOptions: LoggerOptions = {
			...options,
			level: this.level,
			transport: !isProduction
				? {
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'SYS:standard',
							ignore: 'pid,hostname',
						},
				  }
				: undefined,
		};

		this.base = pino(pinoOptions);
	}

	private formatLogArgs(args: any[]): [any, string?] {
		if (args[0] instanceof Error) {
			const errObj = args[0];
			const formattedMessage = args.slice(1).map(stringifyArg).join(' ');
			return [{ err: errObj }, formattedMessage];
		} else {
			const formattedMessage = args.map(stringifyArg).join(' ');
			return [formattedMessage];
		}
	}

	error(...args: any) {
		const [errOrMsg, formattedMessage] = this.formatLogArgs(args);
		this.base.error(errOrMsg, formattedMessage);
		if (this.webhookURL && errOrMsg.err) {
			postErrorToDiscord(
				errOrMsg.err,
				this.webhookURL,
				this.content
			).catch((e) => {
				this.base.error('Error posting to Discord', e);
			});
		}
	}

	info(...args: any) {
		const [formattedMessage] = this.formatLogArgs(args);
		this.base.info(formattedMessage);
	}

	warn(...args: any) {
		const [formattedMessage] = this.formatLogArgs(args);
		this.base.warn(formattedMessage);
	}

	debug(...args: any) {
		const [formattedMessage] = this.formatLogArgs(args);
		this.base.debug(formattedMessage);
	}

	trace(...args: any) {
		const [formattedMessage] = this.formatLogArgs(args);
		this.base.trace(formattedMessage);
	}

	fatal(...args: any) {
		const [formattedMessage] = this.formatLogArgs(args);
		this.base.fatal(formattedMessage);
	}

	child(...args: any) {
		return this.base.child.apply(this.base, args);
	}

	silent(...args: any) {
		return this.base.silent.apply(this.base, args);
	}
}
