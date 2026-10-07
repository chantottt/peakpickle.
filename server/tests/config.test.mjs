import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const run = promisify(execFile);
test('startup rejects missing or invalid local configuration without printing credentials', async () => {
  const cases = [
    [{ JWT_SECRET: 'short', MONGO_URI: '' }, /JWT_SECRET must contain at least 32/],
    [{ JWT_SECRET: 'test-only-secret-at-least-32-characters', MONGO_URI: '' }, /Set MONGO_URI/],
    [
      { JWT_SECRET: 'test-only-secret-at-least-32-characters', MONGO_URI: 'invalid-private-value' },
      /MONGO_URI must be/,
    ],
    [
      { JWT_SECRET: 'test-only-secret-at-least-32-characters', PORT: '5001', MONGO_URI: '' },
      /PORT must be 5000/,
    ],
    [
      {
        JWT_SECRET: 'test-only-secret-at-least-32-characters',
        CLIENT_ORIGIN: 'https://example.com',
        MONGO_URI: '',
      },
      /CLIENT_ORIGIN supports only/,
    ],
  ];
  for (const [input, expected] of cases) {
    await assert.rejects(
      run(process.execPath, ['dist/server.js'], {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: {
          ...process.env,
          PORT: '5000',
          CLIENT_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173',
          ...input,
        },
      }),
      (error) => {
        assert.match(error.stderr, expected);
        assert.ok(!error.stderr.includes('invalid-private-value'));
        return true;
      },
    );
  }
});
