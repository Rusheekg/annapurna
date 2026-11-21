export const foods = ['Rice', 'Dal', 'Sabzi', 'Rotis', 'Biryani', 'Curd', 'Sweets'];
export const allergens = ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'sesame', 'fish', 'shellfish'];
export const storageLabels = { hot: 'Hot', room_temp: 'Room temperature', chilled: 'Chilled' };
export const maxPortions = 5000;
export const safetyNotice = 'Annapurna connects people. It does not certify that food is safe. Check the food before serving.';

const storageGuidance = {
  hot: 'Keep hot until handover.',
  room_temp: 'Cooked food at room temperature: serve within about 2 hours of cooking.',
  chilled: 'Keep chilled until handover.',
};

export function minutesUntil(time, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(time).getTime() - now) / 60000));
}

export function handlingGuidance(storage, cookedAt, active) {
  if (storage !== 'room_temp' || !active) return storageGuidance[storage];
  const remaining = minutesUntil(new Date(cookedAt).getTime() + 2 * 60 * 60 * 1000);
  return storageGuidance.room_temp + (remaining
    ? ` About ${remaining} min left in that window.`
    : ' That window has passed.');
}

export function validId(value) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647;
}
