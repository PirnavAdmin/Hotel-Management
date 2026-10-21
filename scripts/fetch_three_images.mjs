import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function inspectUrls() {
  console.log('--- Inspecting URL 1: whiskaffair rabdi gulab jamun ---');
  try {
    const res = await fetch('https://www.whiskaffair.com/rabdi-gulab-jamun-parfait-recipe/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const og = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    console.log('URL 1 og:image:', og ? og[1] : 'not found');
    const imgs = [...html.matchAll(/src=["'](https:\/\/www\.whiskaffair\.com\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi)].map(m => m[1]);
    console.log('URL 1 images:', [...new Set(imgs)].slice(0, 5));
  } catch (e) {
    console.error('Error URL 1:', e.message);
  }

  console.log('\n--- Inspecting URL 2: shwetainthekitchen sweet lassi ---');
  try {
    const res = await fetch('https://shwetainthekitchen.com/sweet-lassi-sweet-punjabi-lassi-how-to-make-lassi/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const og = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    console.log('URL 2 og:image:', og ? og[1] : 'not found');
    const imgs = [...html.matchAll(/src=["'](https:\/\/shwetainthekitchen\.com\/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi)].map(m => m[1]);
    console.log('URL 2 images:', [...new Set(imgs)].slice(0, 5));
  } catch (e) {
    console.error('Error URL 2:', e.message);
  }
}

inspectUrls();
