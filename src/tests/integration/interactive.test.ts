import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

describe('interactive cli', () => {
  it('should start interactive mode with an intro', async () => {
    const result = await execaCommand('jiti ./src/cli.ts', {
      input: '\x03',
      shell: process.env.SHELL || true,
    });

    const output = result.stdout;

    expect(output).toContain('🦾 Micro Agent');
  });

  it('should ask for an OpenAI key if not set', async () => {
    // Rename the config file to simulate a fresh install
    await execaCommand('mv ~/.micro-agent ~/.micro-agent.bak', {
      shell: process.env.SHELL || true,
    });
    const result = await execaCommand('jiti ./src/cli.ts', {
      input: '\x03',
      shell: process.env.SHELL || true,
    });

    const output = result.stdout;

    expect(output).toContain('Welcome newcomer! What is your OpenAI key?');

    // Restore the config file
    await execaCommand('mv ~/.micro-agent.bak ~/.micro-agent', {
      shell: process.env.SHELL || true,
    });
  });

  it('should ask for a prompt', async () => {
    const result = await execaCommand('jiti ./src/cli.ts', {
      input: '\x03',
      shell: process.env.SHELL || true,
    });

    const output = result.stdout;

    expect(output).toContain('What would you like to do?');
  });

});
