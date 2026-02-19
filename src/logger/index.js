// Console-only logger (no file system dependencies)
import morgan from 'morgan';
import { LOG_LEVEL } from '../config.js';

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    raw: 5
};

const COLORS = {
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    info: '\x1b[32m',    // Green
    http: '\x1b[36m',    // Cyan
    debug: '\x1b[34m',   // Blue
    raw: '\x1b[35m',     // Magenta
    reset: '\x1b[0m'
};

const currentLogLevel = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.info;

function formatTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, message) {
    if (LOG_LEVELS[level] > currentLogLevel) return;
    
    const timestamp = formatTimestamp();
    const color = COLORS[level] || '';
    const reset = COLORS.reset;
    
    console.log(`${timestamp} [${color}${level}${reset}]: ${message}`);
}

// HTTP request logger using morgan
const morganStream = {
    write: (message) => log('http', message.trim())
};

const morganFormat = ':remote-addr :method :url :status :res[content-length] - :response-time ms';
const httpLogger = morgan(morganFormat, { stream: morganStream });

export const logHttpRequest = httpLogger;

export const logInfo = (message) => log('info', message);

export const logError = (message, error) => {
    if (error) {
        log('error', `${message}: ${error.message}`);
        if (error.stack) {
            log('error', error.stack);
        }
    } else {
        log('error', message);
    }
};

export const logWarn = (message) => log('warn', message);

export const logDebug = (message) => log('debug', message);

export const logRaw = (message) => log('raw', message);

export const logHttp = (message) => log('http', message);

export default { logHttpRequest, logInfo, logError, logWarn, logDebug, logRaw, logHttp };
