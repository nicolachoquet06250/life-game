import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'remove-leading-dot-slash',
      transformIndexHtml(html) {
        return html.replace(/(href|src)="\.\//g, '$1="');
      },
    },
  ],
});
