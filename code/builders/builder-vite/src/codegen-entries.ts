import { loadPreviewOrConfigFile } from '@storybook/core-common';
import type { Options } from '@storybook/types';
import slash from 'slash';
import { listStories } from './list-stories';

const absoluteFilesToImport = async (
  files: string[],
  name: string,
  normalizePath: (id: string) => string
) =>
  files
    .map((el, i) => `import ${name ? `* as ${name}_${i} from ` : ''}'/@fs/${normalizePath(el)}'`)
    .join('\n');

export async function generateVirtualStoryEntryCode(options: Options) {
  const { normalizePath } = await import('vite');
  const storyEntries = await listStories(options);
  const resolveMap = storyEntries.reduce<Record<string, string>>(
    (prev, entry) => ({ ...prev, [entry]: entry.replace(slash(process.cwd()), '.') }),
    {}
  );
  const modules = storyEntries.map((entry, i) => `${JSON.stringify(entry)}: story_${i}`).join(',');

  return `
    ${await absoluteFilesToImport(storyEntries, 'story', normalizePath)}

    function loadable(key) {
      return {${modules}}[key];
    }
    
    Object.assign(loadable, {
      keys: () => (${JSON.stringify(Object.keys(resolveMap))}),
      resolve: (key) => (${JSON.stringify(resolveMap)}[key])
    });

    export function configStories(configure) {
      configure(loadable, { hot: import.meta.hot }, false);
    }
  `.trim();
}

export async function generatePreviewEntryCode({ configDir }: Options) {
  const previewFile = loadPreviewOrConfigFile({ configDir });
  if (!previewFile) return '';

  return `import * as preview from '${slash(previewFile)}';
  export default preview;`;
}
