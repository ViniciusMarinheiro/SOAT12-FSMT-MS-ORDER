import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LoggerService } from '@nestjs/common';
import { sanitizeSensitiveData } from '../utils/sanitize-sensitive-data.util';
// import * as newrelic from 'newrelic';

export class CustomLogger implements LoggerService {
  private static contextRules: Record<string, number> = {};

  private readonly DEFAULT_CONTEXT = '*';
  private readonly DEFAULT_LEVEL = 'info';
  private readonly LOG_LEVEL_MAP: Record<string, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  constructor(
    @InjectPinoLogger()
    private readonly logger: PinoLogger,
  ) {
    if (Object.keys(CustomLogger.contextRules).length === 0) {
      this.initializeContextRules();
    }
  }

  verbose(message: string, context?: string | any) {
    // const nrMetadata = this.getNewRelicMetadata();
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const sanitized = sanitizeSensitiveData(context);
      const logContext = sanitized.useCase || sanitized.context || '';
      if (this.shouldLog('trace', logContext)) {
        this.logger.trace(
          /* { ...sanitized, ...nrMetadata } */ sanitized,
          message,
        );
      }
    } else {
      if (this.shouldLog('trace', context ?? '')) {
        this.logger.trace(
          /* { context, ...nrMetadata } */ { context },
          message,
        );
      }
    }
  }

  debug(message: string, context?: string | any) {
    // const nrMetadata = this.getNewRelicMetadata();
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const sanitized = sanitizeSensitiveData(context);
      const logContext = sanitized.useCase || sanitized.context || '';
      if (this.shouldLog('debug', logContext)) {
        this.logger.debug(
          /* { ...sanitized, ...nrMetadata } */ sanitized,
          message,
        );
      }
    } else {
      if (this.shouldLog('debug', context ?? '')) {
        this.logger.debug(
          /* { context, ...nrMetadata } */ { context },
          message,
        );
      }
    }
  }

  log(message: string, context?: string | any) {
    // const nrMetadata = this.getNewRelicMetadata();
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const sanitized = sanitizeSensitiveData(context);
      const logContext = sanitized.useCase || sanitized.context || '';
      if (this.shouldLog('info', logContext)) {
        this.logger.info(
          /* { ...sanitized, ...nrMetadata } */ sanitized,
          message,
        );
      }
    } else {
      if (this.shouldLog('info', context ?? '')) {
        this.logger.info(/* { context, ...nrMetadata } */ { context }, message);
      }
    }
  }

  warn(message: string, context?: string | any) {
    // const nrMetadata = this.getNewRelicMetadata();
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const sanitized = sanitizeSensitiveData(context);
      const logContext = sanitized.useCase || sanitized.context || '';
      if (this.shouldLog('warn', logContext)) {
        this.logger.warn(
          /* { ...sanitized, ...nrMetadata } */ sanitized,
          message,
        );
      }
    } else {
      if (this.shouldLog('warn', context ?? '')) {
        this.logger.warn(/* { context, ...nrMetadata } */ { context }, message);
      }
    }
  }

  error(message: string, trace?: string, context?: string | any) {
    // const nrMetadata = this.getNewRelicMetadata();
    if (context && typeof context === 'object' && !Array.isArray(context)) {
      const sanitized = sanitizeSensitiveData(context);
      const logContext = sanitized.useCase || sanitized.context || '';
      if (this.shouldLog('error', logContext)) {
        this.logger.error(
          /* { ...sanitized, trace, ...nrMetadata } */ { ...sanitized, trace },
          message,
        );
      }
    } else {
      if (this.shouldLog('error', context ?? '')) {
        this.logger.error(
          /* { context, trace, ...nrMetadata } */ { context, trace },
          message,
        );
      }
    }
  }

  private initializeContextRules() {
    const rules = process.env.LOG_RULES ?? '';
    if (!rules) {
      CustomLogger.contextRules[this.DEFAULT_CONTEXT] =
        this.LOG_LEVEL_MAP[this.DEFAULT_LEVEL];
      return;
    }

    const ruleEntries = rules.split('/');
    for (const rule of ruleEntries) {
      let contextPart = this.DEFAULT_CONTEXT;
      let levelPart = this.DEFAULT_LEVEL;
      const parts = rule.split(';');

      for (const part of parts) {
        if (part.startsWith('context=')) {
          contextPart = part.split('=')[1] || this.DEFAULT_CONTEXT;
        } else if (part.startsWith('level=')) {
          levelPart = part.split('=')[1] || this.DEFAULT_LEVEL;
        }
      }

      const contexts = contextPart.split(',');
      const numericLevel =
        this.LOG_LEVEL_MAP[levelPart.trim()] ??
        this.LOG_LEVEL_MAP[this.DEFAULT_LEVEL];

      for (const context of contexts) {
        CustomLogger.contextRules[context.trim()] = numericLevel;
      }
    }
  }

  private shouldLog(methodLevel: string, context: string): boolean {
    return this.LOG_LEVEL_MAP[methodLevel] >= this.getLogLevel(context);
  }

  private getLogLevel(context?: string): number {
    context = context ?? '';
    const level =
      CustomLogger.contextRules[context] ??
      CustomLogger.contextRules[this.DEFAULT_CONTEXT] ??
      this.LOG_LEVEL_MAP[this.DEFAULT_LEVEL];
    return level;
  }

  // private getNewRelicMetadata(): Record<string, any> {
  //   try {
  //     return newrelic.getLinkingMetadata();
  //   } catch (error) {
  //     return {};
  //   }
  // }
}
