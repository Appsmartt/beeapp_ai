export const BACKGROUND_LOAD_ATTEMPTS = 3;

const BACKGROUND_RETRY_DELAY_MS = 500;

export async function retryBackgroundLoad<T>(
  operation: () => Promise<T>,
  shouldContinue: () => boolean = () => true,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= BACKGROUND_LOAD_ATTEMPTS;
    attempt += 1
  ) {
    if (!shouldContinue()) {
      throw lastError ?? new Error('Background load cancelled.');
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        attempt === BACKGROUND_LOAD_ATTEMPTS
        || !shouldContinue()
      ) {
        break;
      }

      await new Promise<void>((resolve) => {
        setTimeout(
          resolve,
          BACKGROUND_RETRY_DELAY_MS * attempt,
        );
      });
    }
  }

  throw lastError;
}
