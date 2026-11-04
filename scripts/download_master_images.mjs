import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targets = [
  path.join(rootDir, 'public', 'assets'),
  path.join(rootDir, 'src', 'assets')
];

const items = [
  {
    name: "Fresh Watermelon Juice",
    url: "https://shwetainthekitchen.com/wp-content/uploads/2021/09/Fresh-watermelon-juice-recipe.jpg",
    subPaths: [
      "beverages/watermelon-juice.jpg",
      "beverages/watermelon-juice.png"
    ]
  },
  {
    name: "Hyderabadi Mutton Biryani (Westin Kolkata)",
    url: "https://i.pinimg.com/736x/6c/f4/83/6cf48394168034cc994d08137f8fbd0b.jpg",
    subPaths: [
      "biryani/mutton-biryani.jpg",
      "biryani/hyderabadi-mutton-biryani.jpg"
    ]
  },
  {
    name: "Paneer Tikka (Spice Cravings)",
    url: "https://spicecravings.com/wp-content/uploads/2020/10/Paneer-Tikka-Featured-1.jpg",
    subPaths: [
      "starters/paneer-tikka.jpg"
    ]
  },
  {
    name: "Chocolate Milkshake (Bikanervala)",
    url: "https://cdn.uengage.io/uploads/28289/image-5AV1F9-1773981730.png",
    subPaths: [
      "beverages/chocolate-milkshake.jpg",
      "beverages/chocolate-milkshake.png",
      "beverages/chocolate-shake.jpg"
    ]
  },
  {
    name: "Rabdi Gulab Jamun Parfait (WhiskAffair)",
    url: "https://www.whiskaffair.com/wp-content/uploads/2022/09/Rabdi-Gulab-Jamun-Parfait-2-1.jpg",
    subPaths: [
      "desserts/rabdi-gulab-jamun.jpg",
      "desserts/gulab-jamun-rabdi.jpg"
    ]
  },
  {
    name: "Sweet Punjabi Lassi (Shweta in the Kitchen)",
    url: "https://shwetainthekitchen.com/wp-content/uploads/2021/05/Sweet-lassi.jpg",
    subPaths: [
      "beverages/sweet-lassi.jpg",
      "beverages/sweet-punjabi-lassi.jpg"
    ]
  },
  {
    name: "Cheese Garlic Naan (Your Food Lab)",
    url: "https://scontent-bru2-1.xx.fbcdn.net/v/t15.5256-10/118712015_955905804875336_9116851063024693737_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=a27664&_nc_ohc=PDPtQ3bAD3YQ7kNvwEWhGWm&_nc_oc=AdqJxJmjq0hTxDQ6f6tCLTGxJICOKAtwKFM5Ov29YWE1H7AR0wob1dm5wYGJbcQdr7Y&_nc_zt=23&_nc_ht=scontent-bru2-1.xx&_nc_gid=Oho-f_RZGyL_jOBS3dPfvQ&_nc_ss=7b20f&oh=00_AQOJxQC-3vReCOssYCf5b8NVsxMHpymGm__zP8gjq6nkeA&oe=6AD63C34",
    subPaths: [
      "breads/cheese-garlic-naan.jpg",
      "breads/cheesy-naan.jpg"
    ]
  }
];

async function downloadAll() {
  console.log("Downloading all master dish images...");
  for (const item of items) {
    try {
      console.log(`Downloading ${item.name} from ${item.url.slice(0, 60)}...`);
      const res = await fetch(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`Success: ${item.name} (${buffer.length} bytes)`);

      for (const target of targets) {
        for (const subPath of item.subPaths) {
          const dest = path.join(target, subPath);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, buffer);
          console.log(`  -> Saved: ${dest}`);
        }
      }
    } catch (e) {
      console.error(`Failed ${item.name}:`, e.message);
    }
  }
}

downloadAll();
