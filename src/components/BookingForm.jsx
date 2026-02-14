import { useState, useEffect, useMemo, useRef } from 'react'; // เพิ่ม useRef
import { supabase } from '../lib/supabase';
import {
  ChevronDown, ArrowLeft, Banknote, Cat, Plus, Trash2,
  CheckCircle2, AlertCircle, XCircle, Wallet, Check, User // เพิ่ม User
} from 'lucide-react';

export default function BookingForm({ onSaved, initialDate }) {
  const [loading, setLoading] = useState(false);

  // --- State สำหรับระบบแนะนำชื่อลูกค้า ---
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

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
    is_deposited: false,
    cats: [{ cat_name: '', room_type: 'สแตนดาร์ด' }]
  });

  // --- ฟังก์ชันค้นหาลูกค้าเก่า (Debounce) ---
  useEffect(() => {
    const searchCustomer = async () => {
      if (formData.customer_name.length < 1) {
        setCustomerSuggestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('customers')
        .select('customer_name')
        .ilike('customer_name', `%${formData.customer_name}%`)
        .limit(5);

      if (!error && data) setCustomerSuggestions(data);
    };

    const timer = setTimeout(searchCustomer, 300);
    return () => clearTimeout(timer);
  }, [formData.customer_name]);

  // ปิดเมนูแนะนำเมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- ฟังก์ชันเมื่อเลือกลูกค้าเก่า ---
  const selectCustomer = async (name) => {
    setFormData(prev => ({ ...prev, customer_name: name }));
    setShowSuggestions(false);

    // ดึงประวัติแมวล่าสุด
    const { data: lastBooking } = await supabase
      .from('bookings')
      .select('cat_names, room_type')
      .eq('customer_name', name)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastBooking && lastBooking.length > 0) {
      const catsArray = lastBooking[0].cat_names.split(',').map(cat => ({
        cat_name: cat.trim(),
        room_type: lastBooking[0].room_type || 'สแตนดาร์ด'
      }));
      setFormData(prev => ({ ...prev, cats: catsArray }));
    }
  };

  const bookingSummary = useMemo(() => {
    let depositValue = 0;
    formData.cats.forEach(cat => {
      depositValue += (ROOM_PRICES[cat.room_type] || 0);
    });

    if (!formData.start_date || !formData.end_date) {
      return { nights: 0, total: 0, depositValue };
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - start.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const validNights = nights > 0 ? nights : 0;

    let total = 0;
    formData.cats.forEach(cat => {
      total += (ROOM_PRICES[cat.room_type] || 0) * validNights;
    });

    return { nights: validNights, total, depositValue };
  }, [formData]);

  const showAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig({ ...alertConfig, isOpen: false });
    if (alertConfig.type === 'success') onSaved();
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bookingSummary.nights <= 0) {
      return showAlert('warning', 'วันที่ไม่ถูกต้อง', 'วันออกต้องหลังจากวันเข้าพักอย่างน้อย 1 คืน');
    }

    setLoading(true);
    const finalDeposit = formData.is_deposited ? bookingSummary.depositValue : 0;

    try {
      // 1. บันทึก/อัปเดตข้อมูลลูกค้า และดึง ID กลับมา (ใช้ .select() เพื่อเอา id)
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert({ customer_name: formData.customer_name }, { onConflict: 'customer_name' })
        .select('id')
        .single();

      if (customerError) throw customerError;

      // 2. เตรียมข้อมูลการจองโดยใส่ customer_id ที่ได้มา
      const bookingsToInsert = formData.cats.map(cat => ({
        customer_id: customerData.id, // ใส่ ID ที่เชื่อมโยงกัน
        customer_name: formData.customer_name,
        cat_names: cat.cat_name,
        room_type: cat.room_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'Confirmed',
        total_price: (ROOM_PRICES[cat.room_type] || 0) * bookingSummary.nights,
        deposit: finalDeposit / formData.cats.length
      }));

      const { error: bookingError } = await supabase.from('bookings').insert(bookingsToInsert);

      if (bookingError) throw bookingError;
      showAlert('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลการจองเรียบร้อยแล้ว 🎉');
    } catch (error) {
      showAlert('error', 'เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 animate-in slide-in-from-bottom-4 duration-500 font-sans px-4">
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-[#efebe9]">
        <div className="flex items-center gap-4 mb-10 border-b border-[#f5f2f0] pb-6">
          <div className="bg-[#FDF8F5] p-3.5 rounded-2xl text-[#885E43] border border-[#efebe9] shadow-sm">
            <Cat size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#372C2E]">จองที่พัก</h2>
            <p className="text-sm text-[#a1887f]">ลงทะเบียนเข้าพักและจัดการมัดจำ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ชื่อเจ้าของแมว + ระบบค้นหาอัตโนมัติ */}
          <div className="space-y-3 relative" ref={suggestionRef}>
            <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">ชื่อเจ้าของแมว</label>
            <div className="relative">
              <input
                placeholder="ระบุชื่อลูกค้า"
                required
                className="w-full p-4 bg-[#FDFBFA] rounded-2xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none transition-all font-bold text-[#372C2E]"
                value={formData.customer_name}
                onFocus={() => setShowSuggestions(true)}
                onChange={e => {
                  setFormData({ ...formData, customer_name: e.target.value });
                  setShowSuggestions(true);
                }}
              />
            </div>

            {/* Dropdown รายการแนะนำ */}
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#efebe9] overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-gray-50 text-[10px] font-black text-[#a1887f] uppercase px-4 bg-gray-50/50">ลูกค้าที่เคยใช้บริการ</div>
                {customerSuggestions.map((item, idx) => (
                  <button
                    key={idx} type="button"
                    onClick={() => selectCustomer(item.customer_name)}
                    className="w-full p-4 text-left hover:bg-[#FDF8F5] flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="bg-[#efebe9] p-1.5 rounded-lg text-[#885E43]"><User size={14} /></div>
                    <span className="font-bold text-[#372C2E]">{item.customer_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* รายละเอียดน้องแมว */}
          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <label className="text-xs font-black text-[#885E43] uppercase tracking-widest">รายละเอียดน้องแมว</label>
              <button type="button" onClick={addCatField} className="text-[10px] bg-[#885E43] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5d4037] active:scale-95 transition-all">
                <Plus size={14} /> เพิ่มแมว
              </button>
            </div>
            {formData.cats.map((cat, index) => (
              <div key={index} className="p-5 bg-[#FDFBFA] rounded-[1.5rem] border border-[#efebe9] relative animate-in zoom-in-95 duration-300">
                {formData.cats.length > 1 && (
                  <button type="button" onClick={() => removeCatField(index)} className="absolute -top-2 -right-2 bg-white text-red-400 p-2 rounded-full shadow-md border border-red-50 hover:text-red-600 transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="ชื่อน้องแมว" required className="p-3 bg-white rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold text-[#372C2E]"
                    value={cat.cat_name} onChange={e => updateCatData(index, 'cat_name', e.target.value)} />
                  <div className="relative">
                    <select className="w-full p-3 bg-white rounded-xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none text-sm font-bold text-[#372C2E] appearance-none cursor-pointer"
                      value={cat.room_type} onChange={e => updateCatData(index, 'room_type', e.target.value)}>
                      {Object.keys(ROOM_PRICES).map(type => (
                        <option key={type} value={type}>{type} (฿{ROOM_PRICES[type]})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#a1887f] pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* วันที่และสถานะมัดจำ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">ระยะเวลาเข้าพัก</label>
              <div className="space-y-2">
                <input type="date" value={formData.start_date} required className="w-full p-4 bg-[#FDFBFA] rounded-2xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none font-bold text-[#372C2E] text-sm"
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                <input type="date" value={formData.end_date} required className="w-full p-4 bg-[#FDFBFA] rounded-2xl border-2 border-[#efebe9] focus:border-[#885E43] outline-none font-bold text-[#372C2E] text-sm"
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black text-[#885E43] uppercase ml-1 tracking-widest">สถานะเงินมัดจำ</label>
              <div className="grid grid-cols-2 gap-2 bg-[#FDFBFA] p-1.5 rounded-[1.5rem] border-2 border-[#efebe9]">
                <button type="button" onClick={() => setFormData({ ...formData, is_deposited: false })}
                  className={`py-3 rounded-xl text-xs font-black transition-all ${!formData.is_deposited ? 'bg-white shadow-md text-[#372C2E]' : 'text-[#a1887f]'}`}>
                  ยังไม่มัดจำ
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, is_deposited: true })}
                  className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${formData.is_deposited ? 'bg-[#885E43] text-white shadow-lg' : 'text-[#a1887f]'}`}>
                  {formData.is_deposited && <Check size={14} />} มัดจำแล้ว
                </button>
              </div>
            </div>
          </div>

          {/* สรุปราคา */}
          <div className="bg-[#372C2E] rounded-[2.5rem] p-8 text-white shadow-2xl border border-[#5d4037] relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center opacity-60">
                <span className="text-xs font-bold uppercase tracking-widest">ยอดรวมทั้งหมด ({bookingSummary.nights} คืน)</span>
                <span className="font-bold">฿{bookingSummary.total.toLocaleString()}</span>
              </div>

              {formData.is_deposited && (
                <div className="flex justify-between items-center text-[#DE9E48] font-bold py-2 border-y border-white/5">
                  <span className="text-xs uppercase tracking-widest flex items-center gap-2">
                    <Wallet size={14} /> หักค่ามัดจำแล้ว
                  </span>
                  <span>- ฿{bookingSummary.depositValue.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[10px] font-black text-[#a1887f] uppercase tracking-[0.2em] mb-1">
                    {formData.is_deposited ? "ยอดคงเหลือที่ต้องจ่าย" : "ยอดที่ต้องชำระทั้งหมด"}
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    ฿{(formData.is_deposited
                      ? Math.max(0, bookingSummary.total - bookingSummary.depositValue)
                      : bookingSummary.total
                    ).toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 text-white rotate-12">
              <Banknote size={150} />
            </div>
          </div>

          <button disabled={loading} className="w-full bg-[#885E43] text-white font-black py-5 rounded-[1.5rem] hover:bg-[#5d4037] transition-all flex items-center justify-center gap-3 shadow-lg disabled:bg-gray-300 active:scale-[0.98] text-lg">
            {loading ? 'กำลังบันทึก...' : <><CheckCircle2 size={24} /> ยืนยันการจอง</>}
          </button>
        </form>
      </div>

      {/* Alert Modal */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center animate-in zoom-in-95">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${alertConfig.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
              {alertConfig.type === 'success' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
            </div>
            <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
            <p className="text-sm text-[#A1887F] font-medium mb-8 leading-relaxed px-4">{alertConfig.message}</p>
            <button onClick={closeAlert} className="w-full py-4 rounded-2xl font-black text-white bg-[#885E43]">ตกลง</button>
          </div>
        </div>
      )}
    </div>
  );
}
