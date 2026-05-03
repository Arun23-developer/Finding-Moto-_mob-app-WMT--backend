const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_COLORS = {
  ERROR: '\x1b[31m',  // Red
  WARN: '\x1b[33m',   // Yellow
  INFO: '\x1b[36m',   // Cyan
  DEBUG: '\x1b[37m'   // White
};

const RESET_COLOR = '\x1b[0m';

/**
 * Logger utility for consistent logging across the application
 */
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * Format log message
   */
  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message} ${metaString}`;
  }

  /**
   * Write to file
   */
  writeToFile(level, message, meta) {
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    const logMessage = this.formatLog(level, message, meta) + '\n';
    
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  /**
   * Console output with color
   */
  consoleOutput(level, message, meta) {
    const color = LOG_COLORS[level] || '';
    const logMessage = this.formatLog(level, message, meta);
    console.log(`${color}${logMessage}${RESET_COLOR}`);
  }

  /**
   * Error logging
   */
  error(message, meta = {}) {
    this.consoleOutput(LOG_LEVELS.ERROR, message, meta);
    this.writeToFile(LOG_LEVELS.ERROR, message, meta);
  }

  /**
   * Warning logging
   */
  warn(message, meta = {}) {
    if (this.logLevel === 'info' || this.logLevel === 'debug') {
      this.consoleOutput(LOG_LEVELS.WARN, message, meta);
      this.writeToFile(LOG_LEVELS.WARN, message, meta);
    }
  }

  /**
   * Info logging
   */
  info(message, meta = {}) {
    if (this.logLevel === 'info' || this.logLevel === 'debug') {
      this.consoleOutput(LOG_LEVELS.INFO, message, meta);
      this.writeToFile(LOG_LEVELS.INFO, message, meta);
    }
  }

  /**
   * Debug logging
   */
  debug(message, meta = {}) {
    if (this.logLevel === 'debug') {
      this.consoleOutput(LOG_LEVELS.DEBUG, message, meta);
      this.writeToFile(LOG_LEVELS.DEBUG, message, meta);
    }
  }
}

module.exports = new Logger();
