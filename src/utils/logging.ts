type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'

const logColors = {
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  success: '\x1b[32m', // green
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m',
}

export default function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  const color = logColors[level]
  const levelUpper = level.toUpperCase().padEnd(7)

  console.log(
    `${logColors.debug}${timestamp}${logColors.reset} ${color}${levelUpper}${logColors.reset} ${message}`,
    ...args
  )
}

