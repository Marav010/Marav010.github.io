// ══════════════════════════════════════════════════════════════
// FitStreak Nutrition Database  —  nutrition-db.js
// ข้อมูลจาก: INMU Thai FCD 2025, USDA FoodData Central
// ค้นหา fuzzy match ทั้งชื่อไทยและอังกฤษ
// โหลดข้อมูลจาก JSON files และ merge กับ _LOCAL_DB ใน index.html
// ══════════════════════════════════════════════════════════════

(async function initNutritionDB() {
  // รอให้ _LOCAL_DB พร้อมก่อน (ถูกประกาศใน index.html)
  const baseDB = (typeof _LOCAL_DB !== 'undefined') ? _LOCAL_DB : [];

  // โหลด JSON files เพิ่มเติม
  let extData = [];
  try {
    const base = (typeof DB_BASE_URL !== 'undefined') ? DB_BASE_URL : './data';
    const [thai, ing, intl] = await Promise.all([
      fetch(`${base}/thai_foods.json`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${base}/ingredients.json`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${base}/international_foods.json`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    extData = [...thai, ...ing, ...intl];
  } catch(e) {
    console.warn('NutritionDB: JSON files load failed, using inline data only.', e.message);
  }

  // Merge: inline data + JSON files, dedup by id (JSON files ชนะถ้า id ซ้ำ)
  const idMap = new Map();
  baseDB.forEach(item => idMap.set(item.id, item));
  extData.forEach(item => idMap.set(item.id, item)); // override ด้วย JSON version
  const mergedDB = [...idMap.values()];

  console.log(`NutritionDB ready: ${mergedDB.length} items (${baseDB.length} inline + ${extData.length - (extData.length - (mergedDB.length - baseDB.length))} new from JSON)`);

  // ──────────────────────────────────────────────
  // Override searchLocalDB ใน index.html ให้ใช้ mergedDB
  // ──────────────────────────────────────────────
  function _norm(str) {
    return (str || '').toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\u0E00-\u0E7Fa-z0-9 ]/g, '')
      .trim();
  }

  function _score(item, q) {
    const th = _norm(item.name_th), en = _norm(item.name_en);
    if (th === q || en === q) return 100;
    if (th.startsWith(q) || en.startsWith(q)) return 85;
    if (th.includes(q) || en.includes(q)) return 70;
    const words = q.split(' ').filter(w => w.length > 1);
    if (words.length > 1) {
      const hit = words.filter(w => th.includes(w) || en.includes(w)).length;
      if (hit === words.length) return 60;
      if (hit > 0) return 20 + hit * 10;
    }
    return 0;
  }

  function _healthScore(item) {
    let s = 60;
    if ((item.fiber   || 0) > 3)    s += 10;
    if ((item.protein || 0) > 15)   s += 10;
    if ((item.sugar   || 0) > 20)   s -= 15;
    if ((item.sodium  || 0) > 1000) s -= 10;
    if ((item.fat     || 0) > 30)   s -= 5;
    return Math.max(10, Math.min(100, s));
  }

  function _toNutr(item) {
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
      healthScore: _healthScore(item),
      note: `ข้อมูลจาก ${item.source}`,
      source: 'LOCAL_DB',
      dbId: item.id,
    };
  }

  // Override ฟังก์ชันใน global scope
  window.searchLocalDB = function(query, limit = 5) {
    const q = _norm(query);
    if (!q) return [];
    return mergedDB
      .map(item => ({ item, score: _score(item, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => _toNutr(x.item));
  };

  window.lookupLocalFood = function(query) {
    const r = window.searchLocalDB(query, 1);
    return r.length ? r[0] : null;
  };

  // Expose NutritionDB API (เพื่อ external use)
  window.NutritionDB = {
    getDB: () => mergedDB,
    search: window.searchLocalDB,
    lookup: window.lookupLocalFood,
    toNutr: _toNutr,
  };
})();
