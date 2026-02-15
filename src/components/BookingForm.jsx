import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ChevronDown, Banknote, Cat, Plus, Trash2,
  CheckCircle2, XCircle, Wallet, Check, User, ShoppingBag
} from 'lucide-react';

export default function BookingForm({ onSaved, initialDate }) {
  const [loading, setLoading] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const ROOM_PRICES = {
    'สแตนดาร์ด': 300, 'ดีลักซ์': 350, 'ซูพีเรีย': 350, 'พรีเมี่ยม': 400, 'วีไอพี': 500, 'วีวีไอพี': 600
  };

  const [formData, setFormData] = useState({
    customer_name: '',
    start_date: initialDate || '',
    end_date: '',
    is_deposited: false,
    cats: [{ cat_name: '', room_type: 'สแตนดาร์ด' }],
    // --- เพิ่มส่วน Add-ons (สินค้าเพิ่มเติม) ---
    extra_items: [] // { name: '', price: 0 }
  });

  useEffect(() => {
    const searchCustomer = async () => {
      if (formData.customer_name.length < 1) {
        setCustomerSuggestions([]); return;
      }
      const { data, error } = await supabase
        .from('customers').select('customer_name').ilike('customer_name', `%${formData.customer_name}%`).limit(5);
      if (!error && data) setCustomerSuggestions(data);
    };
    const timer = setTimeout(searchCustomer, 300);
    return () => clearTimeout(timer);
  }, [formData.customer_name]);

  const bookingSummary = useMemo(() => {
    let nights = 0;
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - start.getTime();
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    const validNights = nights > 0 ? nights : 0;

    let roomTotal = 0;
    let depositValue = 0;

    formData.cats.forEach(cat => {
      const pricePerNight = ROOM_PRICES[cat.room_type] || 0;
      roomTotal += pricePerNight * validNights;
      if (validNights === 1) depositValue += (pricePerNight / 2);
      else if (validNights > 1) depositValue += pricePerNight;
    });

    // คำนวณยอดสินค้าเพิ่มเติม
    const extraTotal = formData.extra_items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

    return { 
      nights: validNights, 
      roomTotal, 
      extraTotal, 
      total: roomTotal + extraTotal, 
      depositValue 
    };
  }, [formData]);

  const addExtraItem = () => {
    setFormData({ ...formData, extra_items: [...formData.extra_items, { name: '', price: '' }] });
  };

  const removeExtraItem = (index) => {
    const newItems = formData.extra_items.filter((_, i) => i !== index);
    setFormData({ ...formData, extra_items: newItems });
  };

  const updateExtraItem = (index, field, value) => {
    const newItems = [...formData.extra_items];
    newItems[index][field] = value;
    setFormData({ ...formData, extra_items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bookingSummary.nights <= 0) return setAlertConfig({ isOpen: true, type: 'warning', title: 'วันที่ไม่ถูกต้อง', message: 'กรุณาเลือกวันเข้าพักอย่างน้อย 1 คืน' });

    setLoading(true);
    try {
      const { data: customerData, error: custError } = await supabase
        .from('customers').upsert({ customer_name: formData.customer_name }, { onConflict: 'customer_name' }).select('id').single();
      if (custError) throw custError;

      // รวมรายการสินค้าเข้าไปในช่อง note หรือสร้างฟิลด์ใหม่ (ในที่นี้ขอรวมใส่ note เพื่อไม่ให้กระทบ Schema เดิมมาก)
      const extraDetails = formData.extra_items.map(i => `${i.name}(฿${i.price})`).join(', ');
      const finalNote = extraDetails ? `สินค้าเพิ่มเติม: ${extraDetails}` : '-';

      const bookingsToInsert = formData.cats.map(cat => {
        const roomPrice = ROOM_PRICES[cat.room_type] || 0;
        let catDeposit = formData.is_deposited ? (bookingSummary.nights === 1 ? roomPrice / 2 : roomPrice) : 0;
        
        return {
          customer_id: customerData.id,
          customer_name: formData.customer_name,
          cat_names: cat.cat_name,
          room_type: cat.room_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          booking_status: 'Confirmed',
          // เอาราคาสินค้าหารเฉลี่ยลงในแต่ละ booking หรือบวกเข้าที่ตัวแรกตัวเดียวก็ได้ 
          // (แนะนำ: บวกราคาสินค้าเพิ่มเข้าไปใน total_price)
          total_price: (roomPrice * bookingSummary.nights) + (bookingSummary.extraTotal / formData.cats.length),
          deposit: catDeposit,
          note: finalNote
        };
      });

      const { error: bookError } = await supabase.from('bookings').insert(bookingsToInsert);
      if (bookError) throw bookError;

      setAlertConfig({ isOpen: true, type: 'success', title: 'สำเร็จ!', message: 'บันทึกการจองและรายการสินค้าเรียบร้อย' });
    } catch (error) {
      setAlertConfig({ isOpen: true, type: 'error', title: 'ผิดพลาด', message: error.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 animate-in slide-in-from-bottom-4 duration-500 px-4">
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-[#efebe9]">
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <div className="bg-[#FDF8F5] p-3.5 rounded-2xl text-[#885E43] border border-[#efebe9] shadow-sm"><Cat size={32} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">จองที่พัก & บริการ</h2><p className="text-sm text-[#a1887f]">จัดการการพักและรายการขายสินค้า</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ชื่อเจ้าของแมว (เหมือนเดิม) */}
          <div className="space-y-3 relative" ref={suggestionRef}>
            <label className="text-xs font-black text-[#885E43] uppercase tracking-widest ml-1">ชื่อเจ้าของแมว</label>
            <input required className="w-full p-4 bg-[#FDFBFA] rounded-2xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none font-bold" value={formData.customer_name} onChange={e => {setFormData({...formData, customer_name: e.target.value}); setShowSuggestions(true);}} onFocus={() => setShowSuggestions(true)} />
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#efebe9] overflow-hidden">
                {customerSuggestions.map((item, idx) => (
                  <button key={idx} type="button" onClick={() => {setFormData({...formData, customer_name: item.customer_name}); setShowSuggestions(false);}} className="w-full p-4 text-left hover:bg-[#FDF8F5] font-bold border-b last:border-0 flex items-center gap-2"><User size={14}/> {item.customer_name}</button>
                ))}
              </div>
            )}
          </div>

          {/* รายละเอียดน้องแมว (เหมือนเดิม) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center"><label className="text-xs font-black text-[#885E43] uppercase tracking-widest">ข้อมูลที่พัก</label><button type="button" onClick={() => setFormData({...formData, cats: [...formData.cats, {cat_name: '', room_type: 'สแตนดาร์ด'}]})} className="text-[10px] bg-[#885E43] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1"><Plus size={14}/> เพิ่มแมว</button></div>
            {formData.cats.map((cat, index) => (
              <div key={index} className="p-4 bg-[#FDFBFA] rounded-2xl border border-[#efebe9] grid grid-cols-2 gap-3 relative">
                <input placeholder="ชื่อแมว" required className="p-3 rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold" value={cat.cat_name} onChange={e => {const c = [...formData.cats]; c[index].cat_name = e.target.value; setFormData({...formData, cats: c})}} />
                <select className="p-3 rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold" value={cat.room_type} onChange={e => {const c = [...formData.cats]; c[index].room_type = e.target.value; setFormData({...formData, cats: c})}}>{Object.keys(ROOM_PRICES).map(t => <option key={t} value={t}>{t}</option>)}</select>
                {formData.cats.length > 1 && <button type="button" onClick={() => setFormData({...formData, cats: formData.cats.filter((_,i) => i !== index)})} className="absolute -top-2 -right-2 bg-white text-red-400 p-1.5 rounded-full shadow-sm border"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>

          {/* --- ส่วนที่เพิ่มใหม่: รายการสินค้าเพิ่มเติม --- */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><ShoppingBag size={14}/> สินค้า / บริการอื่นๆ</label>
              <button type="button" onClick={addExtraItem} className="text-[10px] bg-blue-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 hover:bg-blue-600 transition-all shadow-sm"><Plus size={14}/> เพิ่มรายการ</button>
            </div>
            <div className="space-y-2">
              {formData.extra_items.map((item, index) => (
                <div key={index} className="flex gap-2 animate-in zoom-in-95 duration-200">
                  <input placeholder="รายการ (เช่น อาหารเปียก, ทราย)" className="flex-1 p-3 bg-blue-50/30 rounded-xl border-2 border-blue-100 focus:border-blue-400 outline-none text-sm font-bold" value={item.name} onChange={e => updateExtraItem(index, 'name', e.target.value)} />
                  <input type="number" placeholder="ราคา" className="w-24 p-3 bg-blue-50/30 rounded-xl border-2 border-blue-100 focus:border-blue-400 outline-none text-sm font-bold text-blue-600" value={item.price} onChange={e => updateExtraItem(index, 'price', e.target.value)} />
                  <button type="button" onClick={() => removeExtraItem(index)} className="p-3 text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              ))}
              {formData.extra_items.length === 0 && <p className="text-center text-[10px] text-gray-400 italic py-2">ยังไม่มีรายการสินค้าเพิ่มเติม</p>}
            </div>
          </div>

          {/* วันที่และมัดจำ (เหมือนเดิม) */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2"><label className="text-[10px] font-black text-[#885E43] uppercase">วันเข้า-ออก</label>
              <input type="date" className="w-full p-3 bg-[#FDFBFA] rounded-xl border-2 border-[#efebe9] text-sm font-bold" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              <input type="date" className="w-full p-3 bg-[#FDFBFA] rounded-xl border-2 border-[#efebe9] text-sm font-bold" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
            <div className="space-y-2"><label className="text-[10px] font-black text-[#885E43] uppercase">สถานะมัดจำ</label>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setFormData({...formData, is_deposited: !formData.is_deposited})} className={`p-4 rounded-2xl text-xs font-black border-2 transition-all flex items-center justify-center gap-2 ${formData.is_deposited ? 'bg-[#885E43] text-white border-[#885E43]' : 'bg-white text-[#a1887f] border-[#efebe9]'}`}>
                  {formData.is_deposited ? <Check size={16}/> : <Wallet size={16}/>} {formData.is_deposited ? 'มัดจำแล้ว' : 'ยังไม่มัดจำ'}
                </button>
              </div>
            </div>
          </div>

          {/* สรุปราคา (ปรับปรุงใหม่) */}
          <div className="bg-[#372C2E] rounded-[2rem] p-6 text-white shadow-xl space-y-3">
            <div className="flex justify-between text-xs opacity-70"><span>ค่าห้อง ({bookingSummary.nights} คืน)</span><span>฿{bookingSummary.roomTotal.toLocaleString()}</span></div>
            {bookingSummary.extraTotal > 0 && <div className="flex justify-between text-xs text-blue-300"><span>สินค้าเพิ่มเติม</span><span>+ ฿{bookingSummary.extraTotal.toLocaleString()}</span></div>}
            {formData.is_deposited && <div className="flex justify-between text-xs text-[#DE9E48]"><span>มัดจำแล้ว</span><span>- ฿{bookingSummary.depositValue.toLocaleString()}</span></div>}
            <div className="pt-3 border-t border-white/10 flex justify-between items-end">
              <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ยอดสุทธิที่ต้องชำระ</p><h3 className="text-3xl font-black">฿{(formData.is_deposited ? bookingSummary.total - bookingSummary.depositValue : bookingSummary.total).toLocaleString()}</h3></div>
              <Banknote className="opacity-20" size={40}/>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-[#885E43] text-white font-black py-4 rounded-2xl hover:bg-[#5d4037] flex items-center justify-center gap-2 shadow-lg disabled:bg-gray-300 text-lg">
            {loading ? 'กำลังบันทึก...' : <><CheckCircle2 size={22}/> ยืนยันการจอง</>}
          </button>
        </form>
      </div>

      {/* Alert Modal */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertConfig.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
              {alertConfig.type === 'success' ? <CheckCircle2 size={32}/> : <XCircle size={32}/>}
            </div>
            <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
            <p className="text-sm text-[#A1887F] mb-6">{alertConfig.message}</p>
            <button onClick={() => {setAlertConfig({...alertConfig, isOpen: false}); if(alertConfig.type==='success') onSaved();}} className="w-full py-3 rounded-xl font-black text-white bg-[#885E43]">ตกลง</button>
          </div>
        </div>
      )}
    </div>
  );
}


