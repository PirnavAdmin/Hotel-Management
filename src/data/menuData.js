export const MENU_CATEGORIES = [
  { id: 'all', name: 'All Items', icon: 'Utensils' },
  { id: 'biryani', name: 'Biryanis & Rice Special', icon: 'Flame' },
  { id: 'starters', name: 'Starters & Appetizers', icon: 'Sparkles' },
  { id: 'mains', name: 'Main Course & Curries', icon: 'Soup' },
  { id: 'tandoor-kebabs', name: 'Tandoori & Kebabs', icon: 'Flame' },
  { id: 'breads', name: 'Naan & Roti', icon: 'Sandwich' },
  { id: 'beverages', name: 'Beverages & Lassi', icon: 'Coffee' },
  { id: 'desserts', name: 'Desserts & Sweets', icon: 'IceCream' }
];

export const MENU_ITEMS = [
  // --- BIRIYANI SPECIALS ---
  {
    id: 'bir-1',
    name: 'Hyderabadi Chicken Dum Biryani',
    category: 'biryani',
    price: 320,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '15 min',
    description: 'Authentic kacchi dum biryani cooked with marinated tender chicken, long-grain basmati rice, aromatic saffron, and fried onions. Served with mirchi ka salan and raita.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-2',
    name: 'Royal Mutton Dum Biryani',
    category: 'biryani',
    price: 440,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '18 min',
    description: 'Succulent baby goat mutton slow-cooked in handi with shahi garam masalas, kewra water, and pure ghee basmati rice. Served with spicy salan.',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-3',
    name: 'Special Boneless Chicken Biryani',
    category: 'biryani',
    price: 350,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '15 min',
    description: 'Juicy boneless chicken cubes spiced with crushed pepper and green chilies, layered over fragrant spiced saffron rice.',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-4',
    name: 'Chicken 65 Biryani',
    category: 'biryani',
    price: 360,
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: 3,
    prepTime: '14 min',
    description: 'Crispy spicy Chicken 65 tossed with curry leaves and green chilies, layered on dum biryani rice with boiled egg.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-5',
    name: 'Hyderabadi Veg Dum Biryani',
    category: 'biryani',
    price: 240,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 1,
    prepTime: '12 min',
    description: 'Seasonal farm-fresh vegetables, baby potatoes, and French beans slow-cooked with whole spices and basmati rice in dum style. Served with boondi raita.',
    image: 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-6',
    name: 'Paneer Tikka Dum Biryani',
    category: 'biryani',
    price: 290,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '14 min',
    description: 'Char-grilled cottage cheese cubes coated in Kashmiri tandoori spices, layered over aromatic saffron dum rice with mint and brown onions.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-7',
    name: 'Spicy Prawns Biryani',
    category: 'biryani',
    price: 460,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '15 min',
    description: 'Fresh coastal tiger prawns sautéed in spiced coconut-onion gravy, layered with royal basmati rice and fried cashews.',
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'bir-8',
    name: 'Egg Dum Biryani (Double Egg)',
    category: 'biryani',
    price: 220,
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: 1,
    prepTime: '10 min',
    description: 'Pan-fried golden boiled eggs coated with spices, nestled in rich aromatic dum biryani rice. Served with cooling raita.',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80'
  },

  // --- STARTERS & APPETIZERS ---
  {
    id: 'st-1',
    name: 'Crispy Chicken 65',
    category: 'starters',
    price: 260,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 3,
    prepTime: '10 min',
    description: 'Deep-fried chicken pieces tossed in yogurt, spicy red chili sauce, garlic, and fresh curry leaves.',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'st-2',
    name: 'Paneer 65 Crispy',
    category: 'starters',
    price: 220,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 2,
    prepTime: '10 min',
    description: 'Golden fried paneer cubes tempered with mustard seeds, curd, green chilies, and South Indian curry spices.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'st-3',
    name: 'Chilli Chicken Dry',
    category: 'starters',
    price: 280,
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: 2,
    prepTime: '12 min',
    description: 'Indo-Chinese style crispy chicken wok-tossed with spring onions, crunchy bell peppers, and spicy soya glaze.',
    image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'st-4',
    name: 'Crispy Corn Salt & Pepper',
    category: 'starters',
    price: 190,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 1,
    prepTime: '8 min',
    description: 'Sweet golden corn kernels tossed with cracked black pepper, fresh lemon juice, scallions, and herbs.',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'st-5',
    name: 'Apollo Fish Fry',
    category: 'starters',
    price: 340,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '12 min',
    description: 'Boneless fish fillets fried crisp and tossed in Hyderabadi spicy yogurt tadka with green chillies.',
    image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=500&auto=format&fit=crop&q=80'
  },

  // --- TANDOOR & KEBABS ---
  {
    id: 'tk-1',
    name: 'Tandoori Chicken (Half / Full)',
    category: 'tandoor-kebabs',
    price: 290,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '18 min',
    description: 'Chicken bone-in marinated with hung curd, ginger garlic paste, and Kashmiri degi mirch, roasted in clay tandoor.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'tk-2',
    name: 'Murgh Malai Kebab',
    category: 'tandoor-kebabs',
    price: 320,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 0,
    prepTime: '15 min',
    description: 'Melt-in-mouth chicken breast cubes marinated in heavy clotted cream, cheese, cardamom, and white pepper.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'tk-3',
    name: 'Tandoori Paneer Tikka',
    category: 'tandoor-kebabs',
    price: 260,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 1,
    prepTime: '14 min',
    description: 'Fresh malai paneer cubes skewered with capsicum and diced onions, char-grilled to perfection.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'tk-4',
    name: 'Mutton Seekh Kebab',
    category: 'tandoor-kebabs',
    price: 390,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '16 min',
    description: 'Minced lamb blended with mint, fresh coriander, ginger, and royal spices, roasted golden on charcoal skewers.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80'
  },

  // --- MAIN COURSE & CURRIES ---
  {
    id: 'mc-1',
    name: 'Classic Butter Chicken',
    category: 'mains',
    price: 340,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 1,
    prepTime: '15 min',
    description: 'Char-smoked shredded chicken simmered in rich velvety tomato, butter, and cashew nut gravy finished with kasuri methi.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'mc-2',
    name: 'Kadai Chicken Masala',
    category: 'mains',
    price: 320,
    isVeg: false,
    isChefSpecial: false,
    spiceLevel: 2,
    prepTime: '15 min',
    description: 'Tender chicken tossed with chunky capsicum, tomatoes, and freshly ground coriander-cumin spices in an iron wok.',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'mc-3',
    name: 'Shahi Paneer Butter Masala',
    category: 'mains',
    price: 270,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 1,
    prepTime: '12 min',
    description: 'Cottage cheese cooked in a silky, mildly sweet spiced tomato-butter gravy topped with fresh cream.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'mc-4',
    name: 'Dal Makhani Bukhara',
    category: 'mains',
    price: 230,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '10 min',
    description: 'Black lentils slow-cooked overnight over charcoal with butter, tomato purée, and cream for ultimate richness.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'mc-5',
    name: 'Mutton Rogan Josh',
    category: 'mains',
    price: 430,
    isVeg: false,
    isChefSpecial: true,
    spiceLevel: 2,
    prepTime: '18 min',
    description: 'Kashmiri delicacy of tender mutton cooked in aromatic gravy flavored with रतनजोत (ratan jot) and Kashmiri chilies.',
    image: 'https://images.unsplash.com/photo-1545247181-516773ca838b?w=500&auto=format&fit=crop&q=80'
  },

  // --- BREADS & NAAN ---
  {
    id: 'br-1',
    name: 'Butter Garlic Naan',
    category: 'breads',
    price: 65,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 0,
    prepTime: '5 min',
    description: 'Fluffy refined flour bread topped with minced garlic and cilantro, baked in tandoor and brushed with melted amul butter.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'br-2',
    name: 'Cheese Garlic Naan',
    category: 'breads',
    price: 95,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '6 min',
    description: 'Tandoori naan stuffed with melted mozzarella cheese and topped with crushed garlic.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'br-3',
    name: 'Tandoori Roti (Butter)',
    category: 'breads',
    price: 35,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '4 min',
    description: 'Whole wheat flatbread baked crisp in the clay oven and buttered.',
    image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=500&auto=format&fit=crop&q=80'
  },

  // --- BEVERAGES & LASSI ---
  {
    id: 'dr-1',
    name: 'Royal Mango Lassi',
    category: 'beverages',
    price: 130,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 0,
    prepTime: '4 min',
    description: 'Thick creamy yogurt churned with sweet Alphonso mango pulp, saffron, and crushed pistachios.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'dr-2',
    name: 'Sweet Punjabi Lassi',
    category: 'beverages',
    price: 110,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '4 min',
    description: 'Traditional Punjabi churned curd beverage topped with fresh malai and kewra essence.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'dr-3',
    name: 'Fresh Masala Lemonade',
    category: 'beverages',
    price: 80,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '3 min',
    description: 'Chilled soda or water infused with fresh lemon juice, roasted cumin, black salt, and mint leaves.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'dr-4',
    name: 'Spiced Buttermilk (Chaas)',
    category: 'beverages',
    price: 70,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 1,
    prepTime: '3 min',
    description: 'Refreshing curd drink spiced with crushed ginger, green chili, roasted cumin, and fresh cilantro.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80'
  },

  // --- DESSERTS ---
  {
    id: 'ds-1',
    name: 'Gulab Jamun with Rabdi (2 Pcs)',
    category: 'desserts',
    price: 150,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 0,
    prepTime: '4 min',
    description: 'Hot khoya dumplings soaked in rose-cardamom sugar syrup, served over chilled thick saffron rabdi.',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'ds-2',
    name: 'Royal Shahi Tukda',
    category: 'desserts',
    price: 160,
    isVeg: true,
    isChefSpecial: true,
    spiceLevel: 0,
    prepTime: '5 min',
    description: 'Hyderabadi dessert of ghee-fried crisp bread soaked in saffron syrup, coated with thickened condensed milk and nuts.',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'ds-3',
    name: 'Matka Kulfi Falooda',
    category: 'desserts',
    price: 140,
    isVeg: true,
    isChefSpecial: false,
    spiceLevel: 0,
    prepTime: '3 min',
    description: 'Creamy malai kulfi served with rose falooda sev, sabja basil seeds, and pure rose syrup.',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop&q=80'
  }
];
