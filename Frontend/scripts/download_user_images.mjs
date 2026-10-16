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

const imageTasks = [
  {
    name: "Spicy Prawns Biryani",
    url: "https://www.licious.in/blog/wp-content/uploads/2020/12/Chilli-Prawns.jpg",
    subPaths: [
      "biryani/prawns-biryani.jpg",
      "biryani/spicy-prawns-biryani.jpg"
    ]
  },
  {
    name: "Crispy Corn Salt & Pepper",
    url: "https://scontent-bru2-1.xx.fbcdn.net/v/t39.30808-6/471766867_122205553724203628_3421038463179262607_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1080&ctp=s600x600&_nc_cat=109&ccb=1-7&_nc_sid=cae128&_nc_ohc=qKgM-BJP0_IQ7kNvwH1kXwi&_nc_oc=AdrWF-Gsz3fsgkPFknmevY1E-PVMe-SzrccWQNswhJjZwmzC2eo1NPHSlzUrjCqGVv0&_nc_zt=23&_nc_ht=scontent-bru2-1.xx&_nc_gid=9dlo-5p5mm6XUcVO-m0ZaQ&_nc_ss=7b20f&oh=00_AQOZNLmACoN67UiUcFa6TCsZkJdHuUo5Cq5XNb8ATWB1EA&oe=6AD62732",
    subPaths: [
      "starters/crispy-corn.jpg",
      "crispy-corn.jpg"
    ]
  },
  {
    name: "Apollo Fish Fry",
    url: "https://myfoodstory.com/wp-content/uploads/2025/05/Apollo-Fish-3.jpg",
    subPaths: [
      "starters/apollo-fish.jpg",
      "starters/apollo-fish-fry.jpg"
    ]
  },
  {
    name: "Tandoori Chicken (Half / Full)",
    url: "https://ministryofcurry.com/wp-content/uploads/2016/07/final-4.jpg",
    subPaths: [
      "starters/tandoori-chicken.jpg"
    ]
  },
  {
    name: "Murgh Malai Kebab",
    url: "https://veenaazmanov.com/wp-content/uploads/2018/06/Chicken-Malai-Tikka-Murg-Malai-Kebabs5.jpg",
    subPaths: [
      "starters/murgh-malai-kebab.jpg",
      "starters/malai-kebab.jpg"
    ]
  },
  {
    name: "Mutton Seekh Kebab",
    url: "http://www.debon.co.in/cdn/shop/products/seekh_grande.jpg?v=1672122262",
    subPaths: [
      "starters/mutton-seekh-kebab.jpg",
      "starters/seekh-kebab.jpg"
    ]
  },
  {
    name: "Kadai Chicken Masala",
    url: "https://static.toiimg.com/thumb/msid-53523514,width-1070,height-580,resizemode-75/53523514,pt-32,y_pad-40/53523514.jpg",
    subPaths: [
      "curries/kadai-chicken.jpg",
      "curries/kadai-chicken-masala.jpg"
    ]
  },
  {
    name: "Cheese Garlic Naan",
    url: "https://georgeats.com/wp-content/uploads/2022/08/Cheesy-naan-3.jpg",
    subPaths: [
      "breads/cheese-garlic-naan.jpg",
      "breads/cheesy-naan.jpg"
    ]
  },
  {
    name: "Tandoori Roti (Butter)",
    url: "https://skydecklounge.in/wp-content/uploads/2022/01/Tandoori-Roti-Butter.jpg",
    subPaths: [
      "breads/tandoori-roti.jpg",
      "breads/tandoori-roti-butter.jpg"
    ]
  }
];

async function downloadAll() {
  console.log("Downloading verified user images for 9 items...");
  for (const task of imageTasks) {
    try {
      console.log(`Fetching: ${task.name} from ${task.url.slice(0, 60)}...`);
      const res = await fetch(task.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`  Downloaded ${buffer.length} bytes for ${task.name}`);

      for (const target of targets) {
        for (const subPath of task.subPaths) {
          const fullPath = path.join(target, subPath);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, buffer);
          console.log(`  Saved to: ${fullPath.replace(rootDir, '')}`);
        }
      }
    } catch (e) {
      console.error(`Failed to download for ${task.name}:`, e.message);
    }
  }
  console.log("All image downloads completed!");
}

downloadAll();
