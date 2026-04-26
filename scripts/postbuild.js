import { readFileSync, writeFileSync, existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { minify } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';

let html = readFileSync('dist/index.html', 'utf8');

// 内联JS
const scriptMatch = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
if (scriptMatch) {
  const jsPath = join('dist', scriptMatch[1].replace(/^\//, ''));
  if (existsSync(jsPath)) {
    const js = readFileSync(jsPath, 'utf8');
    const out = await minifyJs(js, { compress: true, mangle: true });
    html = html.replace(scriptMatch[0], () => `<script>${out.code || js}</script>`);
    try { unlinkSync(jsPath); } catch {}
  }
}

// 内联CSS
const cssMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
if (cssMatch) {
  const cssPath = join('dist', cssMatch[1].replace(/^\//, ''));
  if (existsSync(cssPath)) {
    let css = readFileSync(cssPath, 'utf8');
    html = html.replace(cssMatch[0], () => `<style>${css}</style>`);
    try { unlinkSync(cssPath); } catch {}
  }
}

// 清理 assets 目录（如果存在）
const assetsDir = join(process.cwd(), 'dist', 'assets');
if (existsSync(assetsDir)) {
  try { rmSync(assetsDir, { recursive: true, force: true }); } catch {}
}

// 压缩HTML
const minified = await minify(html, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true
});
writeFileSync('dist/index.html', minified);
console.log('Done');
