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

const folders = [
  'biryani',
  'starters',
  'curries',
  'breads',
  'south-indian',
  'chinese',
  'fast-food',
  'desserts',
  'beverages'
];

const downloads = [
  // Root files as shown in user screenshot
  {
    subPath: 'chicken-dum-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'crispy-corn.jpg',
    url: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'veg-dum-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80'
  },

  // fast-food (user requested list)
  {
    subPath: 'fast-food/pizza.jpg',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'fast-food/burger.jpg',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'fast-food/french-fries.jpg',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'fast-food/pasta.jpg',
    url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80'
  },

  // desserts (user requested list + specials)
  {
    subPath: 'desserts/ice-cream.jpg',
    url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'desserts/cake.jpg',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'desserts/pancakes.jpg',
    url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'desserts/gulab-jamun.jpg',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'desserts/shahi-tukda.jpg',
    url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80'
  },

  // beverages (user requested coffee + refreshing drinks)
  {
    subPath: 'beverages/coffee.jpg',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'beverages/fresh-lime-soda.jpg',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'beverages/masala-chai.jpg',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'beverages/mango-lassi.jpg',
    url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'beverages/buttermilk.jpg',
    url: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600&auto=format&fit=crop&q=80'
  },

  // starters (user requested salad + tandoori/crispy starters)
  {
    subPath: 'starters/salad.jpg',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'starters/crispy-corn.jpg',
    url: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'starters/chicken-65.jpg',
    url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'starters/paneer-tikka.jpg',
    url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'starters/tandoori-chicken.jpg',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80'
  },

  // biryani
  {
    subPath: 'biryani/chicken-dum-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/mutton-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/veg-dum-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/paneer-tikka-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/chicken-65-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/prawns-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'biryani/egg-biryani.jpg',
    url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80'
  },

  // curries
  {
    subPath: 'curries/butter-chicken.jpg',
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'curries/paneer-butter-masala.jpg',
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'curries/dal-makhani.jpg',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'curries/mutton-rogan-josh.jpg',
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80'
  },

  // breads
  {
    subPath: 'breads/butter-naan.jpg',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'breads/garlic-naan.jpg',
    url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'breads/tandoori-roti.jpg',
    url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80'
  },

  // south-indian
  {
    subPath: 'south-indian/masala-dosa.jpg',
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'south-indian/idli-vada.jpg',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80'
  },

  // chinese
  {
    subPath: 'chinese/veg-manchurian.jpg',
    url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'chinese/chilli-chicken.jpg',
    url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80'
  },
  {
    subPath: 'chinese/fried-rice.jpg',
    url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80'
  }
];

async function main() {
  console.log('Ensuring directories...');
  for (const target of targets) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    for (const folder of folders) {
      const folderPath = path.join(target, folder);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    }
  }

  console.log(`Starting download of ${downloads.length} image files...`);
  for (const item of downloads) {
    try {
      console.log(`Downloading: ${item.subPath}`);
      const res = await fetch(item.url);
      if (!res.ok) {
        console.error(`Failed ${item.subPath}: HTTP ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      for (const target of targets) {
        const dest = path.join(target, item.subPath);
        fs.writeFileSync(dest, buffer);
      }
      console.log(`Saved: ${item.subPath} (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${item.subPath}:`, err.message);
    }
  }
  console.log('All downloads completed successfully!');
}

main();
