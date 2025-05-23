import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf, colorize } = format;

const prodFormat = printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

const prodLogger = createLogger({
    level: 'info',
    format: combine(timestamp(), prodFormat),
    transports: [
        new transports.Console(),
    ],
});

export default prodLogger;