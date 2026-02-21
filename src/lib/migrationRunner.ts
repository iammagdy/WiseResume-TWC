/**
 * Generic migration pipeline runner with retry + checkpoint support.
 * Each step is idempotent and progress is persisted to localStorage
 * so incomplete migrations resume on next app launch.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelay = 1000 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export interface MigrationStep {
  name: string;
  /** Return 'skip-remaining' to mark pipeline done early (e.g. nothing to migrate). */
  action: () => Promise<void | 'skip-remaining'>;
}

export interface PipelineResult {
  completed: boolean;
  failedStep?: string;
}

function checkpointKey(id: string) {
  return `wr-migration-${id}-step`;
}

function doneKey(id: string) {
  return `wr-migration-${id}-done`;
}

export function isMigrationDone(id: string): boolean {
  try {
    return localStorage.getItem(doneKey(id)) === '1';
  } catch {
    return false;
  }
}

export async function runMigrationPipeline(
  id: string,
  steps: MigrationStep[],
  retryOptions?: RetryOptions,
): Promise<PipelineResult> {
  if (isMigrationDone(id)) return { completed: true };

  const lastCompleted = localStorage.getItem(checkpointKey(id));
  let pastCheckpoint = !lastCompleted;

  for (const step of steps) {
    // Skip already-completed steps
    if (!pastCheckpoint) {
      if (step.name === lastCompleted) {
        pastCheckpoint = true;
      }
      continue;
    }

    try {
      const result = await retryWithBackoff(step.action, retryOptions);
      localStorage.setItem(checkpointKey(id), step.name);

      if (result === 'skip-remaining') {
        localStorage.setItem(doneKey(id), '1');
        return { completed: true };
      }
    } catch (err) {
      console.warn(`Migration "${id}" failed at step "${step.name}":`, err);
      return { completed: false, failedStep: step.name };
    }
  }

  localStorage.setItem(doneKey(id), '1');
  return { completed: true };
}
