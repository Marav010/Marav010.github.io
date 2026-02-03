import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Search, Edit3, X, Check, FileText, 
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Calendar 
} from 'lucide-react';

export default function HistoryTable() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // --- เดือน/ปี Filter States ---
  const [selectedMonth, setSelectedMonth] = useState("all"); // เริ่มต้นที่แสดงทั้งหมด
  const [selectedYear, setSelectedYear] = useState("all");  // เริ่มต้นที่แสดงทั้งหมด

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  const [editForm, setEditForm] = useState({
    customer_name: '',
    cat_names: '',
    room_type: '',
    note: '',
    start_date: '',
    end_date: ''
  });

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    setBookings(data || []);
  };

  useEffect(() => { 
    fetchBookings(); 
  }, []);

  const showAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('bookings').delete().eq('id', deleteTarget.id);
    if (error) showAlert('error', 'ลบข้อมูลไม่สำเร็จ', error.message);
    else {
      setDeleteTarget(null);
      fetchBookings();
    }
  };

  const startEdit = (booking) => {
    setEditingId(booking.id);
    setEditForm({ 
      customer_name: booking.customer_name || "",
      cat_names: booking.cat_names || "",
      room_type: booking.room_type || "สแตนดาร์ด",
      note: booking.note || "",
      start_date: booking.start_date || "",
      end_date: booking.end_date || ""
    });
  };

  const calculateTotalPrice = (start, end, roomType) => {
    if (!start || !end) return 0;
    
    // 1. คำนวณจำนวนคืน
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate - startDate;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalNights = nights > 0 ? nights : 0;

    // 2. กำหนดราคาต่อคืน (ปรับเปลี่ยนราคาได้ที่นี่)
    const roomPrices = {
      'สแตนดาร์ด': 350,
      'ดีลักซ์': 450,
      'ซูพีเรีย': 550,
      'พรีเมี่ยม': 700,
      'วีไอพี': 1000,
      'วีวีไอพี': 1500
    };

    const pricePerNight = roomPrices[roomType] || 350;
    return totalNights * pricePerNight;
  };

  const handleUpdate = async (id) => {
    // คำนวณราคาใหม่ก่อนส่งไป Save
    const newTotalPrice = calculateTotalPrice(
      editForm.start_date, 
      editForm.end_date, 
      editForm.room_type
    );

    const { error } = await supabase.from('bookings').update({
      customer_name: editForm.customer_name,
      cat_names: editForm.cat_names,
      room_type: editForm.room_type,
      note: editForm.note,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      total_price: newTotalPrice // อัปเดตราคาที่คำนวณใหม่ลง DB
    }).eq('id', id);

    if (error) {
      showAlert('error', 'บันทึกไม่สำเร็จ', error.message);
    } else {
      setEditingId(null);
      fetchBookings();
      showAlert('success', 'บันทึกเรียบร้อย', `แก้ไขข้อมูลและปรับปรุงราคาเป็น ฿${newTotalPrice.toLocaleString()} แล้ว ✨`);
    }
    };

  // กรองข้อมูลตามคำค้นหา + เดือน + ปี
  const filtered = bookings.filter(b => {
    const bDate = new Date(b.start_date);
    const matchMonth = selectedMonth === "all" ? true : (bDate.getMonth() + 1) === parseInt(selectedMonth);
    const matchYear = selectedYear === "all" ? true : bDate.getFullYear() === parseInt(selectedYear);
    
    const search = searchTerm.toLowerCase();
    const matchSearch = (b.customer_name || "").toLowerCase().includes(search) || 
                        (b.cat_names || "").toLowerCase().includes(search) || 
                        (b.note || "").toLowerCase().includes(search);
    
    return matchMonth && matchYear && matchSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="space-y-6 py-4 animate-in fade-in duration-500">
      {/* Header & Search/Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <h2 className="text-2xl font-black text-[#372C2E] tracking-tight text-center md:text-left">จัดการประวัติการเข้าพัก</h2>
        
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {/* Month Filter */}
          <div className="relative">
            <select 
              value={selectedMonth} 
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="pl-3 pr-8 py-2.5 bg-white border-2 border-[#efebe9] rounded-xl text-xs font-bold text-[#885E43] outline-none focus:border-[#885E43] appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">ทุกเดือน</option>
              {["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-2.5 top-3 text-[#A1887F] pointer-events-none" />
          </div>

          {/* Year Filter */}
          <select 
            value={selectedYear} 
            onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
            className="pl-3 pr-3 py-2.5 bg-white border-2 border-[#efebe9] rounded-xl text-xs font-bold text-[#885E43] outline-none focus:border-[#885E43] shadow-sm cursor-pointer"
          >
            <option value="all">ทุกปี</option>
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-3 text-[#A1887F]" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ, น้องแมว..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#efebe9] rounded-xl shadow-sm outline-none focus:border-[#885E43] text-sm font-bold text-[#372C2E]"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2rem] border border-[#efebe9] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDFBFA] text-[#A1887F] text-[10px] uppercase font-bold tracking-[0.15em] border-b border-[#efebe9]">
                <th className="px-6 py-5">ข้อมูลลูกค้าและน้องแมว</th>
                <th className="px-6 py-5">ประเภทห้อง</th>
                <th className="px-6 py-5">หมายเหตุ</th>
                <th className="px-6 py-5">ช่วงเวลาเข้าพัก</th>
                <th className="px-6 py-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDFBFA]">
              {currentItems.map(b => (
                <tr key={b.id} className="hover:bg-[#FDF8F5] transition-colors group">
                  <td className="px-6 py-4">
                    {editingId === b.id ? (
                      <div className="space-y-2 max-w-[180px]">
                        <input className="w-full p-2 bg-white border-2 border-[#C39A7A] rounded-lg text-sm font-bold text-[#372C2E]" value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} />
                        <input className="w-full p-2 bg-white border-2 border-[#DE9E48] rounded-lg text-sm text-[#885E43] font-bold" value={editForm.cat_names} onChange={e => setEditForm({...editForm, cat_names: e.target.value})} />
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-[#372C2E] text-md">{b.customer_name || 'ไม่ระบุชื่อ'}</div>
                        <div className="text-xs text-[#885E43] font-black mt-1 flex items-center gap-1">🐾 {b.cat_names || 'ไม่ระบุชื่อแมว'}</div>
                      </>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingId === b.id ? (
                      <select className="p-2 w-full border-2 border-[#C39A7A] rounded-lg text-xs font-bold bg-white text-[#372C2E]" value={editForm.room_type} onChange={e => setEditForm({...editForm, room_type: e.target.value})}>
                        {['สแตนดาร์ด', 'ดีลักซ์', 'ซูพีเรีย', 'พรีเมี่ยม', 'วีไอพี', 'วีวีไอพี'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-3 py-1 bg-[#FDF8F5] border border-[#efebe9] rounded-full text-[10px] font-black text-[#885E43] uppercase tracking-wider">{b.room_type}</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingId === b.id ? (
                      <textarea className="w-full p-2 bg-white border-2 border-[#C39A7A] rounded-lg text-xs outline-none min-h-[80px] font-medium text-[#372C2E]" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} />
                    ) : (
                      <div className="max-w-[200px] max-h-[60px] overflow-y-auto pr-2 text-xs text-[#A1887F] italic leading-relaxed">
                        {b.note ? <span className="flex items-start gap-1"><FileText size={12} className="mt-0.5 flex-shrink-0 text-[#DE9E48]" />{b.note}</span> : '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingId === b.id ? (
                      <div className="space-y-2">
                        <input type="date" className="w-full p-1.5 border-2 border-[#C39A7A] rounded-lg text-[10px] font-bold text-[#372C2E]" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                        <input type="date" className="w-full p-1.5 border-2 border-[#C39A7A] rounded-lg text-[10px] font-bold text-[#372C2E]" value={editForm.end_date} onChange={e => setEditForm({...editForm, end_date: e.target.value})} />
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-black text-[#5D4037]">{b.start_date}</div>
                        <div className="text-[10px] text-[#A1887F] font-bold uppercase tracking-tight">ถึง {b.end_date}</div>
                      </>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {editingId === b.id ? (
                        <>
                          <button onClick={() => handleUpdate(b.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all shadow-sm bg-white border border-green-100"><Check size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-[#A1887F] hover:bg-gray-100 rounded-xl transition-all"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(b)} className="p-2 text-[#A1887F] hover:text-[#885E43] hover:bg-[#FDF8F5] rounded-xl transition-all"><Edit3 size={18} /></button>
                          <button onClick={() => setDeleteTarget(b)} className="p-2 text-[#A1887F] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination & Empty State */}
        {filtered.length === 0 ? (
          <div className="p-20 text-center bg-[#FDFBFA]">
            <div className="text-[#DBD0C5] text-5xl mb-4">🐾</div>
            <div className="text-[#A1887F] font-bold italic tracking-wide">ไม่พบประวัติการเข้าพักที่เลือก</div>
          </div>
        ) : (
          <div className="px-6 py-5 bg-[#FDFBFA] border-t border-[#efebe9] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[10px] font-bold text-[#A1887F] uppercase tracking-widest">
              แสดง {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} จาก {filtered.length} รายการ
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => paginate(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-[#FDF8F5] disabled:opacity-30 text-[#885E43] transition-all"><ChevronLeft size={18} /></button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => paginate(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-[#885E43] text-white shadow-md shadow-[#885E43]/20' : 'text-[#A1887F] hover:bg-[#FDF8F5]'}`}>{i + 1}</button>
              ))}
              <button onClick={() => paginate(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-[#FDF8F5] disabled:opacity-30 text-[#885E43] transition-all"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {/* --- Modals (Delete & Alert) --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">ยืนยันการลบข้อมูล?</h3>
              <p className="text-sm text-[#A1887F] font-medium leading-relaxed mb-8 px-2">
                คุณกำลังจะลบการจองของ <span className="text-red-600 font-bold underline underline-offset-4">"{deleteTarget.customer_name}"</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-gray-100 text-[#A1887F] rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95">ยกเลิก</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-95">ลบทันที</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertConfig.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                {alertConfig.type === 'success' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
              </div>
              <h3 className="text-lg font-black text-[#372C2E] mb-1">{alertConfig.title}</h3>
              <p className="text-sm text-[#A1887F] mb-6">{alertConfig.message}</p>
              <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="w-full py-3 bg-[#885E43] text-white rounded-xl font-bold">ตกลง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
