from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Database (honcho) retry decorator
def db_retry_decorator():
    return retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True
    )

# Third-party (OpenAI) retry decorator
def openai_retry_decorator():
    return retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((ConnectionError, TimeoutError, openai.error.RateLimitError)),
        reraise=True
    )

@db_retry_decorator()
def perform_db_operation(func, *args, **kwargs):
    return func(*args, **kwargs)

@openai_retry_decorator()
def perform_openai_operation(func, *args, **kwargs):
    return func(*args, **kwargs)
