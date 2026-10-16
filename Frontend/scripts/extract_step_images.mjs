import fs from 'fs';

['354', '356'].forEach(step => {
  const file = `C:/Users/ADMIN/.gemini/antigravity-ide/brain/f92d97a9-23ad-4f23-a6c5-25a8a699fba8/.system_generated/steps/${step}/content.md`;
  const text = fs.readFileSync(file, 'utf8');
  const urls = [...text.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]);
  console.log(`Step ${step} matches count:`, urls.length);
  const clean = [...new Set(urls)].filter(u => !u.includes('plugin') && !u.includes('rsrc') && !u.includes('logo') && !u.includes('gravatar') && !u.includes('adthrive'));
  console.log(`Step ${step} samples:`, clean.slice(0, 10));
});
