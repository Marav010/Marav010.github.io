// ══════════════════════════════════════════════════════════════
// FitStreak Nutrition Database  —  nutrition-db.js
// ข้อมูลจาก: INMU Thai FCD 2025, USDA FoodData Central
// ค้นหา fuzzy match ทั้งชื่อไทยและอังกฤษ
// ══════════════════════════════════════════════════════════════

let _DB = null;

async function loadNutritionDB() {
  if (_DB) return _DB;
  try {
    const base = (typeof DB_BASE_URL !== 'undefined') ? DB_BASE_URL : './data';
    const [thai, ing, intl] = await Promise.all([
      fetch(`${base}/thai_foods.json`).then(r => r.json()),
      fetch(`${base}/ingredients.json`).then(r => r.json()),
      fetch(`${base}/international_foods.json`).then(r => r.json()),
    ]);
    _DB = [...thai, ...ing, ...intl];
    console.log(`NutritionDB loaded: ${_DB.length} items`);
    return _DB;
  } catch(e) {
    console.warn('NutritionDB load failed:', e.message);
    _DB = [];
    return _DB;
  }
}

function normalize(str) {
  return (str || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\u0E00-\u0E7Fa-z0-9 ]/g, '')
    .trim();
}

function matchScore(item, query) {
  const q = normalize(query);
  if (!q) return 0;
  const th = normalize(item.name_th);
  const en = normalize(item.name_en);
  if (th === q || en === q) return 100;
  if (th.startsWith(q) || en.startsWith(q)) return 85;
  if (th.includes(q) || en.includes(q)) return 70;
  const words = q.split(' ').filter(w => w.length > 1);
  if (words.length > 1) {
    const matched = words.filter(w => th.includes(w) || en.includes(w)).length;
    if (matched === words.length) return 60;
    if (matched > 0) return 20 + matched * 10;
  }
  return 0;
}

async function searchLocalDB(query, limit = 5) {
  const db = await loadNutritionDB();
  if (!query || !db.length) return [];
  return db
    .map(item => ({ item, score: matchScore(item, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

function calcHealthScore(item) {
  let score = 60;
  if ((item.fiber || 0) > 3) score += 10;
  if ((item.protein || 0) > 15) score += 10;
  if ((item.sugar || 0) > 20) score -= 15;
  if ((item.sodium || 0) > 1000) score -= 10;
  if ((item.fat || 0) > 30) score -= 5;
  return Math.max(10, Math.min(100, score));
}

function dbItemToNutr(item) {
  return {
    foodName: item.name_th,
    name_en: item.name_en,
    calories: item.calories || 0,
    protein: item.protein || 0,
    fat: item.fat || 0,
    carbs: item.carbs || 0,
    fiber: item.fiber || 0,
    sugar: item.sugar || 0,
    sodium: item.sodium || 0,
    servingSize: item.serving || '100g',
    healthScore: calcHealthScore(item),
    note: `ข้อมูลจาก ${item.source}`,
    source: 'LOCAL_DB',
    dbId: item.id,
  };
}

// API หลัก — ให้ใช้แทน callOR เมื่อค้นหาอาหาร
async function lookupFood(query) {
  const local = await searchLocalDB(query, 1);
  if (local.length) return dbItemToNutr(local[0]);
  return null; // caller fallback ไป OFF หรือ AI
}

async function lookupBarcode(barcode) {
  // ส่งให้ lookupBarcodeOFF ที่นิยามใน index.html
  if (typeof lookupBarcodeOFF === 'function') {
    return await lookupBarcodeOFF(barcode);
  }
  return null;
}

// Expose ไปยัง global
if (typeof window !== 'undefined') {
  window.NutritionDB = { loadNutritionDB, searchLocalDB, lookupFood, lookupBarcode, dbItemToNutr };
}
