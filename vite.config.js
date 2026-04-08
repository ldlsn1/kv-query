import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync, rmdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function inlineAssetsPlugin() {
  return {
    name: 'inline-assets',
    enforce: 'post',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const htmlPath = path.join(outDir, 'index.html');
      let html = readFileSync(htmlPath, 'utf-8');

      let code, css;

      html = html.replace(
        /<script[^>]+src="\/(.+?)"><\/script>/,
        (_, src) => {
          const full = path.join(outDir, src);
          code = readFileSync(full, 'utf-8');
          unlinkSync(full);
          return '';
        }
      );

      html = html.replace(
        /<link[^>]+href="\/(.+?)"[^>]*>/,
        (_, href) => {
          const full = path.join(outDir, href);
          if (!existsSync(full)) return _;
          css = readFileSync(full, 'utf-8');
          unlinkSync(full);
          return '';
        }
      );

      if (code) {
        html = html.replace('</body>', `<script>${code}</script></body>`);
      }
      if (css) {
        html = html.replace('</head>', `<style>${css}</style></head>`);
      }
      html = html.replace(/\n{2,}/g, '\n');

      writeFileSync(htmlPath, html);

      const assetsDir = path.join(outDir, 'assets');
      if (existsSync(assetsDir) && readdirSync(assetsDir).length === 0) {
        rmdirSync(assetsDir);
      }
    }
  };
}

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [inlineAssetsPlugin()],
});
