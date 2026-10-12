import { apiClient } from './apiConfig';

export async function apiGetMenuItems() {
  return await apiClient('/api/v1/menu-items');
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
