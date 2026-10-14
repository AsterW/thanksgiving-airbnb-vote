// Each trip's restaurant shortlist lives in KV under food:<trip>:v1.
import { DEFAULT_TRIP, TRIPS } from '../config/trips.js';

export const foodKey = trip => 'food:' + (TRIPS[trip] ? trip : DEFAULT_TRIP) + ':v1';

export async function getFood(env, trip) {
  const raw = await env.VOTES_KV.get(foodKey(trip));
  const food = raw ? JSON.parse(raw) : {};
  if (!Array.isArray(food.places)) food.places = [];
  return food;
}
export async function saveFood(env, trip, food) {
  food.updatedAt = Date.now();
  await env.VOTES_KV.put(foodKey(trip), JSON.stringify(food));
}
