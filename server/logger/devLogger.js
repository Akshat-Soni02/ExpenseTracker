import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf, colorize, errors } = format;

const devFormat = printf(({ level, message, label, timestamp, stack }) => {
    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}`;
});

const devLogger = createLogger({
    level: 'debug',
    format: combine(
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        errors({ stack: true }),
        devFormat
      ),
    transports: [
        new transports.Console(),
    ],
});

export default devLogger;