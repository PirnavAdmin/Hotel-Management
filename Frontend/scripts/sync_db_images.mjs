import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'server-db.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const items = db['gourmet_pos_menu_items_v2'] || [];

const updates = {
  "watermelon juice": "/assets/beverages/watermelon-juice.jpg",
  "mutton biryani": "/assets/biryani/mutton-biryani.jpg",
  "hyderabadi mutton biryani": "/assets/biryani/mutton-biryani.jpg",
  "royal mutton dum biryani": "/assets/biryani/mutton-biryani.jpg",
  "chocolate milkshake": "/assets/beverages/chocolate-milkshake.jpg",
  "chocolate shake": "/assets/beverages/chocolate-milkshake.jpg",
  "paneer tikka": "/assets/starters/paneer-tikka.jpg",
  "tandoori paneer tikka": "/assets/starters/paneer-tikka.jpg",
  "gulab jamun with rabdi": "/assets/desserts/rabdi-gulab-jamun.jpg",
  "sweet punjabi lassi": "/assets/beverages/sweet-lassi.jpg",
  "sweet lassi": "/assets/beverages/sweet-lassi.jpg",
  "cheese garlic naan": "/assets/breads/cheese-garlic-naan.jpg",
  "crispy corn": "/assets/starters/crispy-corn.jpg",
  "crispy corn salt & pepper": "/assets/starters/crispy-corn.jpg",
  "apollo fish fry": "/assets/starters/apollo-fish.jpg",
  "tandoori chicken": "/assets/starters/tandoori-chicken.jpg",
  "murgh malai kebab": "/assets/starters/murgh-malai-kebab.jpg",
  "mutton seekh kebab": "/assets/starters/mutton-seekh-kebab.jpg",
  "kadai chicken": "/assets/curries/kadai-chicken.jpg",
  "tandoori roti": "/assets/breads/tandoori-roti.jpg",
  "spicy prawns biryani": "/assets/biryani/prawns-biryani.jpg"
};

let count = 0;
items.forEach(item => {
  const norm = (item.name || '').toLowerCase().trim();
  for (const [key, img] of Object.entries(updates)) {
    if (norm === key || norm.includes(key)) {
      if (item.image !== img) {
        console.log(`Updated "${item.name}" (id: ${item.id}):\n  ${item.image} -> ${img}`);
        item.image = img;
        count++;
      }
      break;
    }
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Done! Updated ${count} items in server-db.json.`);
