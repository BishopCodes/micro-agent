import { ExecaError, execaCommand } from 'execa';
import { gray } from 'kolorist';

type Fail = {
  type: 'fail';
  message: string;
};

type Success = {
  type: 'success';
};

type Result = Fail | Success;

const fail = (message: string) => {
  return {
    type: 'fail',
    message,
  } as const;
};

const success = () => {
  return {
    type: 'success',
  } as const;
};

export const isFail = (result: unknown): result is Fail => {
  return (result as any)?.type === 'fail';
};

function formatMessage(message: string): string {
  return message.replaceAll('\n', '\n' + gray('│   '));
}

export async function test(testScript: string): Promise<Result> {
  try {
    const result = execaCommand(testScript, {
      shell: process.env.SHELL || true,
    });
    result.stderr.on('data', (data) => {
      process.stderr.write(formatMessage(data.toString()));
    });
    result.stdout.on('data', (data) => {
      process.stdout.write(formatMessage(data.toString()));
    });

    const final = await result;

    if (final.stderr) {
      return fail(final.stderr);
    }
    return success();
  } catch (error: any) {
    if (error instanceof ExecaError) {
      return fail(error.stderr || error.message);
    }
    return fail(error.message);
  }
}
