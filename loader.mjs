import { registerHooks, stripTypeScriptTypes } from 'node:module';

const tsRegex = /^file:.*(?<!\.d)\.m?ts$/;

// Intercept .ts / .mts files (skipping .d.ts files) and
// transpile to JS, returning ES module
registerHooks({
  load(url, context, nextLoad) {
    if (tsRegex.test(url)) {
      return {
        format: 'module',
        source: stripTypeScriptTypes(
          /** @type {import('node:module').ModuleSource} */ (
            // eslint-disable-next-line @typescript-eslint/no-base-to-string -- ModuleSource returns useful information from .toString()
            nextLoad(url).source
          ).toString(),
          {
            mode: 'transform',
            sourceUrl: url,
          },
        ),
      };
    }

    return nextLoad(url, context);
  },
});
