import retry from 'retry';
import { captureException, captureMessage } from '@sentry/nextjs';

interface RetryOptions {
  retries: number;
  factor: number;
  minTimeout: number;
  maxTimeout: number;
}

const dbOptions: RetryOptions = {
  retries: 3,
  factor: 1.5,
  minTimeout: 1000,
  maxTimeout: 10000,
};

const openAIOptions: RetryOptions = {
  retries: 5,
  factor: 2,
  minTimeout: 4000,
  maxTimeout: 60000,
};

function isRateLimitError(error: any): boolean {
  return error?.response?.data?.error === 'rate_limit_exceeded';
}

function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  isOpenAI: boolean
): Promise<T> {
  return new Promise((resolve, reject) => {
    const retryOperation = retry.operation(options);

    retryOperation.attempt(async (currentAttempt) => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error: any) {
        if (isOpenAI && isRateLimitError(error)) {
          captureMessage('OpenAI Rate Limit Hit', {
            level: 'warning',
            extra: {
              attempt: currentAttempt,
              error: error.message,
            },
          });
        } else {
          captureException(error);
        }

        if (retryOperation.retry(error)) {
          return;
        }

        reject(retryOperation.mainError());
      }
    });
  });
}

export function retryDBOperation<T>(operation: () => Promise<T>): Promise<T> {
  return retryOperation(operation, dbOptions, false);
}

export function retryOpenAIOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryOperation(operation, openAIOptions, true);
}
