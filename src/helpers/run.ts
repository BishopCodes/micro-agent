import { intro, note, outro, log } from '@clack/prompts';
import { generate } from './generate';
import { isFail, test } from './test';
import { writeFile } from 'fs/promises';
import { green, yellow } from 'kolorist';
import { commandName } from './constants';
import { visualGenerate } from './visual-generate';

type Options = {
  outputFile: string;
  promptFile: string;
  testCommand: string;
  testFile: string;
  lastRunError: string;
  priorCode?: string;
  threadId: string;
  visual: string;
};

export async function runOne(options: Options) {
  if (options.visual) {
    log.step('Running...');
    const result = await visualGenerate(options);
    if (isFail(result.testResult)) {
      console.log('failed test', result.code);
      await writeFile(options.outputFile, result.code);
      return result;
    } else {
      console.log('passed test', result.code);
      return result;
    }
  }

  log.step('Generating code...');

  // TODO: parse any imports in the prompt file and include them in the prompt as context
  const result = await generate(options);

  await writeFile(options.outputFile, result);
  log.step('Updated code');

  log.step('Running tests...');
  const testResult = await test(options);

  return {
    code: result,
    testResult,
  };
}

export type RunOptions = Options & {
  maxRuns?: number;
};

const useNewlinesInCommand = true;

function createCommandString(options: RunOptions) {
  const command = [`${commandName}`];
  if (options.outputFile) {
    command.push(options.outputFile);
  }
  const argPrefix = useNewlinesInCommand ? '\\\n  ' : '';
  if (options.promptFile) {
    command.push(argPrefix + `-p ${options.promptFile}`);
  }
  if (options.testCommand) {
    command.push(
      argPrefix + `-t "${options.testCommand.replace(/"/g, '\\"')}"`
    );
  }
  if (options.testFile) {
    command.push(argPrefix + `-f ${options.testFile}`);
  }
  if (options.maxRuns) {
    command.push(argPrefix + `-m ${options.maxRuns}`);
  }
  if (options.threadId) {
    command.push(argPrefix + `--thread ${options.threadId}`);
  }

  return command.join(' ');
}

export async function* run(options: RunOptions) {
  let passed = false;
  const maxRuns = options.maxRuns ?? 10;
  for (let i = 0; i < maxRuns; i++) {
    const result = await runOne(options);
    yield result;

    if (result.testResult.type === 'success') {
      outro(green('All tests passed!'));
      passed = true;
      break;
    }
    options.lastRunError = result.testResult.message;
  }
  if (!passed) {
    log.message(yellow(`Max runs of ${maxRuns} reached.`));
    note(
      `${createCommandString(options)}`,
      'You can resume with this command with:'
    );
    outro(yellow('Stopping.'));
  }
}

export async function runAll(options: RunOptions) {
  intro('Running Micro Agent 🤖');
  const results = [];
  let testResult;
  if (!options.visual) {
    log.step('Running tests...');
    testResult = await test(options);

    if (testResult.type === 'success') {
      outro(green('All tests passed!'));
      return;
    }
  }
  for await (const result of run({
    ...options,
    lastRunError: options.lastRunError || testResult?.message || '',
  })) {
    results.push(result);
  }
  return results;
}
