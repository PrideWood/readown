import { defineConfig } from 'vitepress';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isUserSite = repoName.endsWith('.github.io');
const base = '/';

export default defineConfig({
  base,
  title: 'Readown',
  description: 'English past-papers reading practice',
  lastUpdated: true,
  cleanUrls: true,
  markdown: {
    config(md) {
      const defaultFence =
        md.renderer.rules.fence ??
        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const info = (token.info || '').trim().split(/\s+/)[0];
        if (info === 'section') return '';
        return defaultFence(tokens, idx, options, env, self);
      };
    }
  },
  themeConfig: {
    aside: false,
    outline: false,
    nav: [{ text: 'Notebook', link: '/notebook' }]
  }
});
