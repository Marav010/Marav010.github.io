import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ArrowLeft, Banknote, Cat, Plus, Trash2, Info } from 'lucide-react';

export default function BookingForm({ onSaved, initialDate }) {
  const [loading, setLoading] = useState(false);
  const [roomUsage, setRoomUsage] = useState({}); // เก็บจำนวนห้องที่ถูกจองแล้ว

  // 1. กำหนดจำนวนห้องทั้งหมดที่โรงแรมมี
  const TOTAL_ROOMS = {
    'สแตนดาร์ด': 10,
    'ดีลักซ์': 5,
    'ซูพีเรีย': 5,
    'พรีเมี่ยม': 3,
    'วีไอพี': 2,
    'วีวีไอพี': 1
  };

  const ROOM_PRICES = {
    'สแตนดาร์ด': 300,
    'ดีลักซ์': 350,
    'ซูพีเรีย': 350,
    'พรีเมี่ยม': 400,
    'วีไอพี': 500,
    'วีวีไอพี': 600
  };

  const [formData, setFormData] = useState({
    customer_name: '',
    start_date: initialDate || '',
    end_date: '',
    cats: [{ cat_name: '', room_type: 'สแตนดาร์ด' }]
  });

  // 2. ฟังก์ชันดึงข้อมูลว่าในวันที่เลือก มีคนจองไปกี่ห้องแล้ว
  const fetchRoomUsage = async (start, end) => {
    if (!start || !end) return;
    
    const { data, error } = await supabase
      .from('bookings')
      .select('room_type')
      .lte('start_date', end) // วันเริ่มจองเดิม ต้องไม่เกินวันออกใหม่
      .gte('end_date', start); // วันออกเดิม ต้องไม่ก่อนวันเข้าใหม่

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    // นับจำนวนการจองแยกตามประเภทห้อง
    const usage = data.reduce((acc, curr) => {
      acc[curr.room_type] = (acc[curr.room_type] || 0) + 1;
      return acc;
    }, {});
    
    setRoomUsage(usage);
  };

  // ดึงข้อมูลใหม่ทุกครั้งที่วันที่เปลี่ยน
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      fetchRoomUsage(formData.start_date, formData.end_date);
    }
  }, [formData.start_date, formData.end_date]);

  const addCatField = () => {
    setFormData({
      ...formData,
      cats: [...formData.cats, { cat_name: '', room_type: 'สแตนดาร์ด' }]
    });
  };

  const removeCatField = (index) => {
    if (formData.cats.length <= 1) return;
    const newCats = formData.cats.filter((_, i) => i !== index);
    setFormData({ ...formData, cats: newCats });
  };

  const updateCatData = (index, field, value) => {
    const newCats = [...formData.cats];
    newCats[index][field] = value;
    setFormData({ ...formData, cats: newCats });
  };

  const bookingSummary = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return { nights: 0, total: 0 };
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = end - start;
    const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    if (nights <= 0) return { nights: 0, total: 0 };

    let total = 0;
    formData.cats.forEach(cat => {
      total += (ROOM_PRICES[cat.room_type] || 0) * nights;
    });
    return { nights, total };
  }, [formData, formData.cats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bookingSummary.nights <= 0) return alert("❌ กรุณาเลือกวันที่เข้าพักและวันออกให้ถูกต้อง");
    
    // ตรวจสอบอีกครั้งว่ามีห้องเต็มในนาทีสุดท้ายหรือไม่
    for (const cat of formData.cats) {
      const used = roomUsage[cat.room_type] || 0;
      if (used >= TOTAL_ROOMS[cat.room_type]) {
        return alert(`❌ ขออภัย ห้องประเภท ${cat.room_type} เต็มแล้วในช่วงวันที่นี้`);
      }
    }

    setLoading(true);
    const bookingsToInsert = formData.cats.map(cat => ({
      customer_name: formData.customer_name,
      cat_names: cat.cat_name,
      room_type: cat.room_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_price: (ROOM_PRICES[cat.room_type] || 0) * bookingSummary.nights
    }));

    const { error } = await supabase.from('bookings').insert(bookingsToInsert);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      alert("บันทึกการจองสำเร็จ! 🎉");
      onSaved();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 animate-in slide-in-from-bottom-4 duration-500 font-sans">
      <button onClick={onSaved} className="mb-6 flex items-center gap-2 text-[#a1887f] hover:text-[#885E43] font-bold px-2 transition-colors">
        <ArrowLeft size={18} /> กลับหน้าปฏิทิน
      </button>

      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-[#efebe9]">
        <div className="flex items-center gap-4 mb-10 border-b border-[#f5f2f0] pb-6">
          <div className="bg-[#FDF8F5] p-3.5 rounded-2xl text-[#885E43] border border-[#efebe9] shadow-sm">
            <Cat size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#372C2E]">จองที่พัก</h2>
            <p className="text-sm text-[#a1887f]">ลงทะเบียนเข้าพักสำหรับน้องแมว</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">ชื่อเจ้าของแมว</label>
            <input
              placeholder="ระบุชื่อ-นามสกุล" required
              className="w-full p-4 bg-[#FDFBFA] rounded-2xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none transition-all font-bold text-[#372C2E] shadow-sm"
              value={formData.customer_name}
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <label className="text-xs font-black text-[#885E43] uppercase tracking-widest">รายละเอียดน้องแมว</label>
              <button type="button" onClick={addCatField} className="text-xs bg-[#885E43] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5d4037] shadow-md">
                <Plus size={14} /> เพิ่มแมว
              </button>
            </div>

            {formData.cats.map((cat, index) => (
              <div key={index} className="p-5 bg-[#FDFBFA] rounded-[1.5rem] border border-[#efebe9] relative group">
                {formData.cats.length > 1 && (
                  <button type="button" onClick={() => removeCatField(index)} className="absolute -top-2 -right-2 bg-white text-red-400 p-2 rounded-full shadow-md border border-red-50">
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[#a1887f] uppercase ml-1">ชื่อน้องแมว</label>
                    <input
                      placeholder="ระบุชื่อแมว" required
                      className="w-full p-3 bg-white rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold text-[#372C2E]"
                      value={cat.cat_name}
                      onChange={e => updateCatData(index, 'cat_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[#a1887f] uppercase ml-1">ประเภทห้องพัก</label>
                    <div className="relative">
                      <select 
                        className="w-full p-3 bg-white rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold text-[#372C2E] appearance-none cursor-pointer"
                        value={cat.room_type}
                        onChange={e => updateCatData(index, 'room_type', e.target.value)}
                      >
                        {Object.keys(ROOM_PRICES).map(type => {
                          const used = roomUsage[type] || 0;
                          const total = TOTAL_ROOMS[type];
                          const available = total - used;
                          const isFull = available <= 0;
                          
                          return (
                            <option key={type} value={type} disabled={isFull}>
                              {type} {isFull ? '(เต็มแล้ว)' : `(ว่าง ${available}/${total})`} - ฿{ROOM_PRICES[type]}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#a1887f] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">วันที่เข้า</label>
              <input
                type="date" value={formData.start_date} required
                className="w-full p-3 bg-[#FDFBFA] rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none font-bold text-[#372C2E] text-xs md:text-sm"
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">วันที่ออก</label>
              <input
                type="date" value={formData.end_date} required
                className="w-full p-3 bg-[#FDFBFA] rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none font-bold text-[#372C2E] text-xs md:text-sm"
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {!formData.start_date || !formData.end_date ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-medium">
              <Info size={16} /> เลือกวันที่เพื่อตรวจสอบสถานะห้องว่าง
            </div>
          ) : null}

          <div className="bg-[#372C2E] rounded-[2rem] p-6 text-white flex justify-between items-center shadow-xl border border-[#5d4037]">
            <div>
              <p className="text-[#a1887f] text-[10px] font-bold uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
              <h3 className="text-2xl md:text-3xl font-black text-[#DE9E48]">฿{bookingSummary.total.toLocaleString()}</h3>
            </div>
            <div className="text-right border-l border-[#5d4037] pl-6">
              <p className="text-[#a1887f] text-[10px] font-bold uppercase tracking-widest mb-1">ระยะเวลา</p>
              <h3 className="text-lg md:text-xl font-bold">{bookingSummary.nights} คืน</h3>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#885E43] text-white font-black py-5 rounded-[1.5rem] hover:bg-[#5d4037] flex items-center justify-center gap-3 shadow-lg disabled:bg-gray-300 transition-all text-lg"
          >
            {loading ? 'กำลังบันทึก...' : <><Banknote size={24} /> ยืนยันการจอง</>}
          </button>
        </form>
      </div>
    </div>
  );
}
