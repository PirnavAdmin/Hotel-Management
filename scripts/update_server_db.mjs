import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'server-db.json');

const mapping = {
  "spicy prawns biryani": "/assets/biryani/prawns-biryani.jpg",
  "crispy corn salt & pepper": "/assets/starters/crispy-corn.jpg",
  "crispy corn salt \u0026 pepper": "/assets/starters/crispy-corn.jpg",
  "crispy corn": "/assets/starters/crispy-corn.jpg",
  "apollo fish fry": "/assets/starters/apollo-fish.jpg",
  "apollo fish": "/assets/starters/apollo-fish.jpg",
  "tandoori chicken (half / full)": "/assets/starters/tandoori-chicken.jpg",
  "tandoori chicken": "/assets/starters/tandoori-chicken.jpg",
  "murgh malai kebab": "/assets/starters/murgh-malai-kebab.jpg",
  "mutton seekh kebab": "/assets/starters/mutton-seekh-kebab.jpg",
  "kadai chicken masala": "/assets/curries/kadai-chicken.jpg",
  "kadai chicken": "/assets/curries/kadai-chicken.jpg",
  "cheese garlic naan": "/assets/breads/cheese-garlic-naan.jpg",
  "tandoori roti (butter)": "/assets/breads/tandoori-roti.jpg",
  "tandoori roti": "/assets/breads/tandoori-roti.jpg"
};

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/&amp;/g, '&');
}

function updateItemImage(item) {
  if (!item || typeof item !== 'object') return false;
  const normName = normalizeName(item.name || item.dishName || item.dish_name);
  for (const [key, imagePath] of Object.entries(mapping)) {
    if (normName === key || normName.includes(key)) {
      if (item.image !== imagePath) {
        console.log(`Updating "${item.name}":\n  Old: ${item.image}\n  New: ${imagePath}`);
        item.image = imagePath;
        return true;
      }
    }
  }
  return false;
}

function traverseAndFix(obj) {
  let count = 0;
  if (!obj || typeof obj !== 'object') return count;

  if (Array.isArray(obj)) {
    for (const el of obj) {
      if (el && typeof el === 'object') {
        if (el.name && (el.price !== undefined || el.category !== undefined || el.image !== undefined)) {
          if (updateItemImage(el)) count++;
        }
        count += traverseAndFix(el);
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        if (val.name && (val.price !== undefined || val.category !== undefined || val.image !== undefined)) {
          if (updateItemImage(val)) count++;
        }
        count += traverseAndFix(val);
      }
    }
  }
  return count;
}

function run() {
  let content = fs.readFileSync(dbPath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const db = JSON.parse(content);
  
  console.log('Traversing server-db.json to update images...');
  const updatedCount = traverseAndFix(db);
  console.log(`Total item images updated in server-db.json: ${updatedCount}`);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Successfully wrote updated server-db.json!');
}

run();
