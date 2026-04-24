# FitStreak Nutrition Database

ฐานข้อมูลโภชนาการสำหรับ FitStreak แยกเป็นโปรเจกต์อิสระ

## โครงสร้างไฟล์

```
fitstreak-nutrition/
├── data/
│   ├── thai_foods.json          # อาหารไทย 30 รายการ (INMU Thai FCD 2025)
│   ├── ingredients.json         # วัตถุดิบ 50 รายการ (USDA FoodData Central)
│   └── international_foods.json # อาหารนานาชาติ 20 รายการ
└── src/
    └── nutrition-db.js          # Library ค้นหาและ fuzzy match
```

## แหล่งข้อมูล (Sources)

| ฐานข้อมูล | ประเภทอาหาร | ความแม่นยำ |
|---|---|---|
| **INMU Thai FCD 2025** | อาหารไทย, วัตถุดิบไทย | ⭐⭐⭐⭐⭐ วิเคราะห์ Lab จริง |
| **USDA FoodData Central** | วัตถุดิบ, อาหารสากล | ⭐⭐⭐⭐⭐ มาตรฐานสากล |
| **Open Food Facts** (API) | สินค้าบรรจุภัณฑ์ | ⭐⭐⭐⭐ community-verified |
| **AI Fallback** | อาหารที่ไม่มีในฐานข้อมูล | ⭐⭐⭐ ประมาณการ |

## วิธีเพิ่มในโปรเจกต์หลัก (index.html)

```html
<!-- วางก่อน </body> -->
<script>
  // บอก path ของ data folder
  const DB_BASE_URL = './fitstreak-nutrition/data';
</script>
<script src="./fitstreak-nutrition/src/nutrition-db.js"></script>
```

แล้วแก้ฟังก์ชัน askNutrition / analyzeTextFood ให้ค้น local DB ก่อน:

```js
async function askNutrition() {
  const q = document.getElementById('nutrInput').value.trim();
  
  // 1. ค้น local DB ก่อน (เร็วสุด ถูกที่สุด)
  let result = await NutritionDB.lookupFood(q);
  
  // 2. ค้น Open Food Facts
  if (!result) result = await searchOpenFoodFacts(q);
  
  // 3. AI fallback
  if (!result) result = await callORforFood(q);
  
  displayNutrResult(result);
}
```

## วิธีเพิ่มรายการใหม่

เปิดไฟล์ JSON ที่ตรงกับประเภทอาหาร แล้วเพิ่ม object ตามรูปแบบ:

```json
{
  "id": "TH031",
  "name_th": "ชื่อภาษาไทย",
  "name_en": "English Name",
  "category": "thai_dish",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0,
  "fiber": 0,
  "sugar": 0,
  "sodium": 0,
  "serving": "1 จาน (200g)",
  "source": "INMU Thai FCD 2025"
}
```

### Category ที่ใช้ได้
- `grain` — ข้าว แป้ง ธัญพืช
- `thai_dish` — อาหารจานไทย
- `street_food` — อาหารข้างทาง
- `breakfast` — อาหารเช้า
- `dessert` — ของหวาน
- `beverage` — เครื่องดื่ม
- `meat` — เนื้อสัตว์
- `seafood` — อาหารทะเล
- `vegetable` — ผัก
- `fruit` — ผลไม้
- `grain` — ธัญพืช
- `nut` — ถั่วและเมล็ด
- `dairy` — นมและผลิตภัณฑ์
- `oil` — น้ำมัน
- `condiment` — เครื่องปรุง
- `herb_spice` — สมุนไพรและเครื่องเทศ
- `western` / `japanese` / `korean` / `chinese` / `indian` / `middle_eastern`

## แหล่งข้อมูลเพิ่มเติม (ดาวน์โหลดเพิ่มได้)

- **INMU Thai FCD**: https://inmu.mahidol.ac.th/thaifcd/
- **USDA FoodData Central**: https://fdc.nal.usda.gov/download-datasets/
- **Open Food Facts**: https://world.openfoodfacts.org/data

