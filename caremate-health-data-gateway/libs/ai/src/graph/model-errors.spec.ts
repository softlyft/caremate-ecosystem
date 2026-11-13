import {
  AiModelTimeoutError,
  classifyModelError,
  withModelTimeout,
} from './model-errors';

describe('model-errors', () => {
  it('classifies timeout-like messages', () => {
    const err = classifyModelError(new Error('Request timed out'));
    expect(err).toBeInstanceOf(AiModelTimeoutError);
  });

  it('classifies other failures as provider errors', () => {
    const err = classifyModelError(new Error('429 rate limit from upstream'));
    expect(err.code).toBe('model_provider_error');
  });

  it('withModelTimeout rejects after deadline', async () => {
    await expect(
      withModelTimeout(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
        30,
      ),
    ).rejects.toBeInstanceOf(AiModelTimeoutError);
  });

  it('withModelTimeout resolves when work finishes first', async () => {
    const value = await withModelTimeout(async () => 'ok', 200);
    expect(value).toBe('ok');
  });
});
