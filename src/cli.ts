import { cli } from 'cleye';
import { red } from 'kolorist';
import { version } from '../package.json';
import config from './commands/config';
import update from './commands/update';
import { commandName } from './helpers/constants';
import { handleCliError } from './helpers/error';
import { RunOptions, runAll } from './helpers/run';
import { interactiveMode } from './helpers/interactive-mode';
import { fileExists } from './helpers/file-exists';
import { outro } from '@clack/prompts';

cli(
  {
    name: commandName,
    version: version,
    parameters: ['[file path]'],
    flags: {
      prompt: {
        type: String,
        description: 'Prompt to run',
        alias: 'p',
      },
      test: {
        type: String,
        description: 'The test script to run',
        alias: 't',
      },
      testFile: {
        type: String,
        description: 'The test file to run',
        alias: 'f',
      },
      maxRuns: {
        type: Number,
        description: 'The maximum number of runs to attempt',
        alias: 'm',
      },
      thread: {
        type: String,
        description: 'Thread ID to resume',
      },
      visual: {
        type: String,
        description:
          'Visually diff a local screenshot with the result of this URL',
        alias: 'v',
      },
    },
    commands: [config, update],
  },
  async (argv) => {
    const filePath = argv._.filePath;
    const fileExtension = filePath?.split('.').pop();
    const testFileExtension = ['jsx', 'tsx'].includes(fileExtension as any)
      ? fileExtension?.replace('x', '')
      : fileExtension;

    let testFilePath =
      argv.flags.testFile ||
      filePath?.replace(
        // TODO: check .spec.ts too
        new RegExp('\\.' + fileExtension + '$'),
        `.test.${testFileExtension}`
      );
    const promptFilePath =
      argv.flags.prompt ||
      filePath?.replace(new RegExp('\\.' + fileExtension + '$'), '.prompt.md');

    if (!testFilePath || !(await fileExists(testFilePath))) {
      testFilePath = '';
    }

    const runOptions: RunOptions = {
      outputFile: filePath!,
      promptFile: promptFilePath || '',
      testCommand: argv.flags.test || '',
      testFile: testFilePath,
      lastRunError: '',
      maxRuns: argv.flags.maxRuns,
      threadId: argv.flags.thread || '',
      visual: argv.flags.visual || '',
    };
    try {
      if (!argv._.filePath || !argv.flags.test) {
        await interactiveMode(runOptions);
        return;
      }

      await runAll(runOptions);
    } catch (error: any) {
      console.error(`\n${red('✖')} ${error.message || error}`);
      handleCliError(error);
      process.exit(1);
    }
  }
);

process.on('SIGINT', () => {
  outro(red('Stopping.'));
  process.exit();
});
