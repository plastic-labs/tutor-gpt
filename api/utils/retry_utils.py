import sentry_sdk
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import logging

logger = logging.getLogger(__name__)

class RateLimitError(Exception):
    """Custom exception for rate limit errors"""
    pass

def is_rate_limit_error(exception):
    if isinstance(exception, Exception):
        error_message = str(exception).lower()
        return 'rate limit' in error_message or 'too many requests' in error_message
    return False

def log_retry(retry_state):
    """Log retry attempts and capture exceptions in Sentry"""
    exception = retry_state.outcome.exception()
    if exception:
        if is_rate_limit_error(exception):
            logger.warning(f"Rate limit hit in {retry_state.fn.__name__}: attempt {retry_state.attempt_number}")
            sentry_sdk.capture_message(
                f"OpenAI Rate Limit Hit",
                level="warning",
                extras={
                    "function": retry_state.fn.__name__,
                    "attempt": retry_state.attempt_number,
                    "exception": str(exception)
                }
            )
        else:
            sentry_sdk.capture_exception(exception)

    logger.warning(f"Retrying {retry_state.fn.__name__}: attempt {retry_state.attempt_number} due to {exception}")
    sentry_sdk.add_breadcrumb(
        category="retry",
        message=f"Retrying {retry_state.fn.__name__}",
        level="warning",
        data={
            "attempt": retry_state.attempt_number,
            "exception": str(exception)
        }
    )

# honcho retry decorator
def db_retry_decorator():
    return retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        before_sleep=log_retry,
        reraise=True
    )

# Third-party (OpenAI) retry decorator
def rate_limit_retry_decorator():
    return retry(
        stop=stop_after_attempt(5),  # More attempts for rate limits
        wait=wait_exponential(multiplier=2, min=4, max=40),  # Longer waits
        retry=is_rate_limit_error,
        before_sleep=log_retry,
        reraise=True
    )

def openai_retry_decorator():
    return retry(
        stop=stop_after_attempt(3),  # Fewer attempts for other errors
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=lambda e: not is_rate_limit_error(e),  # Retry if it's NOT a rate limit error
        before_sleep=log_retry,
        reraise=True
    )

@db_retry_decorator()
def perform_db_operation(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise

@openai_retry_decorator()
@rate_limit_retry_decorator()
def perform_openai_operation(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as e:
        if is_rate_limit_error(e):
            raise RateLimitError(str(e)) from e
        sentry_sdk.capture_exception(e)
        raise
