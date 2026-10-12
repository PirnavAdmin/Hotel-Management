import { apiClient } from './apiConfig';

export async function apiGetMenuItems() {
  const res = await apiClient('/api/v1/menu-items');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) 
      ? res.data 
      : (res.data.menuItems || res.data.data || []);
    return list.map(m => ({
      id: m.menuItemId ? String(m.menuItemId) : String(m.id),
      name: m.dishName || m.name,
      category: m.category || 'biryani',
      price: parseFloat(m.price || 0),
      isVeg: m.dietaryType === 'VEG' || m.isVeg === true,
      spiceLevel: m.spiceLevel === 1 ? 'Mild' : m.spiceLevel === 2 ? 'Medium' : 'Spicy',
      description: m.shortDescription || m.description || '',
      prepTime: m.prepTimeMinutes ? `${m.prepTimeMinutes} mins` : '15 mins',
      prepTimeMinutes: m.prepTimeMinutes || 15,
      isChefSpecial: !!m.isChefsSpecial || !!m.isChefSpecial,
      isAvailable: m.isAvailable !== false,
      image: m.imageUrl || m.image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
    }));
  }
  return [];
}

export async function apiGetMenuCategories() {
  return await apiClient('/api/v1/menu-items/categories');
}

export async function apiCreateMenuItem(itemData) {
  return await apiClient('/api/v1/menu-items', {
    method: 'POST',
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category || 'Main Course',
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? 'VEG' : 'NON-VEG',
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || '',
      imageUrl: itemData.image || '',
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: true
    })
  });
}

export async function apiUpdateMenuItem(id, itemData) {
  const cleanId = String(id).replace('m-', '');
  return await apiClient(`/api/v1/menu-items/${cleanId}`, {
    method: 'PUT',
    body: JSON.stringify({
      dishName: itemData.name,
      category: itemData.category,
      price: parseFloat(itemData.price || 0),
      dietaryType: itemData.isVeg ? 'VEG' : 'NON-VEG',
      spiceLevel: itemData.spiceLevel || 1,
      prepTimeMinutes: parseInt(itemData.prepTime || 15, 10),
      shortDescription: itemData.description || '',
      imageUrl: itemData.image || '',
      isChefsSpecial: !!itemData.isChefSpecial,
      isAvailable: itemData.isAvailable !== false
    })
  });
}

export async function apiDeleteMenuItem(id) {
  const cleanId = String(id).replace('m-', '');
  return await apiClient(`/api/v1/menu-items/${cleanId}`, {
    method: 'DELETE'
  });
}
