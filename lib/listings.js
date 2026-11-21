export const foods = ['Rice', 'Dal', 'Sabzi', 'Rotis', 'Biryani', 'Curd', 'Sweets'];
export const allergens = ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'sesame', 'fish', 'shellfish'];
export const storageLabels = { hot: 'Hot', room_temp: 'Room temperature', chilled: 'Chilled' };

export function validId(value) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647;
}
