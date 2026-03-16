import { defineConfig } from 'vitepress';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isUserSite = repoName.endsWith('.github.io');
const base = '/';

export default defineConfig({
  base,
  title: 'Readown',
  description: 'English past-papers reading practice',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png', sizes: '32x32' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon-16x16.png', sizes: '16x16' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#748277' }]
  ],
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
    nav: []
  }
});
