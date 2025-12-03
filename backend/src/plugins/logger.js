import winston from 'winston';

const wlogger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, stack, ...meta }) => {
                    let msg = `${level}: ${message}`;
                    if (stack) msg += `\n${stack}`;
                    if (Object.keys(meta).length) msg += `\n${JSON.stringify(meta, null, 2)}`;
                    return msg;
                })
            ),
        }),
    ],
});

export const logger = {
    level: wlogger.level,
    fatal: (msg, ...args) => wlogger.error(msg, ...args),
    info: (msg, ...args) => wlogger.info(msg, ...args),
    error: (msg, ...args) => wlogger.error(msg, ...args),
    warn: (msg, ...args) => wlogger.warn(msg, ...args),
    debug: (msg, ...args) => wlogger.debug(msg, ...args),
    trace: (msg, ...args) => wlogger.debug(msg, ...args),
    child: () => logger,
};
