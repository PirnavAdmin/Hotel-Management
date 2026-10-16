import fs from 'fs';

['486', '488', '490', '492'].forEach(step => {
  const file = `C:/Users/ADMIN/.gemini/antigravity-ide/brain/f92d97a9-23ad-4f23-a6c5-25a8a699fba8/.system_generated/steps/${step}/content.md`;
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  const og = text.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
  const imgs = [...text.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]);
  const clean = [...new Set(imgs)].filter(u => !u.includes('plugin') && !u.includes('rsrc') && !u.includes('logo') && !u.includes('gravatar') && !u.includes('adthrive') && !u.includes('wp-includes'));
  console.log(`Step ${step} og:image:`, og ? og[1] : 'none');
  console.log(`Step ${step} clean sample:`, clean.slice(0, 5));
});
