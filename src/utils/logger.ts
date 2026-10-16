/**
 * Sistema de logging estruturado
 * Facilita debug e monitoramento
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, any>
  timestamp: string
}

class Logger {
  private enabled = import.meta.env.DEV

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  private log(entry: LogEntry): void {
    if (!this.enabled) return

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
    const message = `${prefix} ${entry.message}`

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context || '')
        break
      case 'info':
        console.info(message, entry.context || '')
        break
      case 'warn':
        console.warn(message, entry.context || '')
        break
      case 'error':
        console.error(message, entry.context || '')
        break
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log({ level: 'debug', message, context, timestamp: new Date().toISOString() })
  }

  info(message: string, context?: Record<string, any>): void {
    this.log({ level: 'info', message, context, timestamp: new Date().toISOString() })
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log({ level: 'warn', message, context, timestamp: new Date().toISOString() })
  }

  error(message: string, context?: Record<string, any>): void {
    this.log({ level: 'error', message, context, timestamp: new Date().toISOString() })
  }
}

export const logger = new Logger()
