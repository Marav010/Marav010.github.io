import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Search, Edit3, X, Check, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryTable() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  // -------------------------

  const [editForm, setEditForm] = useState({
    customer_name: '',
    cat_names: '',
    room_type: '',
    note: ''
  });

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    setBookings(data || []);
  };

  useEffect(() => { 
    fetchBookings(); 
  }, []);

  const handleDelete = async (id) => {
    if (confirm('คุณต้องการลบข้อมูลการจองนี้ใช่หรือไม่?')) {
      await supabase.from('bookings').delete().eq('id', id);
      fetchBookings();
    }
  };

  const startEdit = (booking) => {
    setEditingId(booking.id);
    setEditForm({ 
      customer_name: booking.customer_name || "",
      cat_names: booking.cat_names || "",
      room_type: booking.room_type || "สแตนดาร์ด",
      note: booking.note || "" 
    });
  };

  const handleUpdate = async (id) => {
    const { error } = await supabase.from('bookings').update({
      customer_name: editForm.customer_name,
      cat_names: editForm.cat_names,
      room_type: editForm.room_type,
      note: editForm.note
    }).eq('id', id);

    if (error) {
      alert("ไม่สามารถบันทึกได้: " + error.message);
    } else {
      setEditingId(null);
      fetchBookings();
    }
  };

  // กรองข้อมูลตามคำค้นหา
  const filtered = bookings.filter(b => {
    const customer = (b.customer_name || "").toLowerCase();
    const cat = (b.cat_names || "").toLowerCase();
    const note = (b.note || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return customer.includes(search) || cat.includes(search) || note.includes(search);
  });

  // --- Logic การแบ่งหน้า ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  // -----------------------

  return (
    <div className="space-y-6 py-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <h2 className="text-2xl font-black text-[#372C2E] tracking-tight">จัดการประวัติการเข้าพัก</h2>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 text-[#A1887F]" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, น้องแมว หรือหมายเหตุ..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#efebe9] rounded-2xl shadow-sm outline-none focus:border-[#885E43] transition-all text-sm font-bold text-[#372C2E] placeholder-[#d7ccc8]"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset ไปหน้าแรกเมื่อค้นหา
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#efebe9] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDFBFA] text-[#A1887F] text-[10px] uppercase font-bold tracking-[0.15em] border-b border-[#efebe9]">
                <th className="px-6 py-5">ข้อมูลลูกค้าและน้องแมว</th>
                <th className="px-6 py-5">ประเภทห้อง</th>
                <th className="px-6 py-5">หมายเหตุ (เลื่อนดูได้)</th>
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
                       <select className="p-2 border-2 border-[#C39A7A] rounded-lg text-xs font-bold bg-white text-[#372C2E]" value={editForm.room_type} onChange={e => setEditForm({...editForm, room_type: e.target.value})}>
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
                      /* หมายเหตุแบบเลื่อนขึ้นลงได้ */
                      <div className="max-w-[200px] max-h-[60px] overflow-y-auto pr-2 text-xs text-[#A1887F] italic scrollbar-thin scrollbar-thumb-[#efebe9]">
                        {b.note ? (
                          <span className="flex items-start gap-1 leading-relaxed">
                            <FileText size={12} className="mt-0.5 flex-shrink-0 text-[#DE9E48]" />
                            {b.note}
                          </span>
                        ) : '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-[#5D4037]">{b.start_date}</div>
                    <div className="text-[10px] text-[#A1887F] font-bold uppercase tracking-tight">ถึง {b.end_date}</div>
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
                          <button onClick={() => handleDelete(b.id)} className="p-2 text-[#A1887F] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filtered.length === 0 ? (
          <div className="p-20 text-center bg-[#FDFBFA]">
            <div className="text-[#DBD0C5] text-5xl mb-4">🐾</div>
            <div className="text-[#A1887F] font-bold italic tracking-wide">ไม่พบข้อมูลการเข้าพักที่ต้องการ</div>
          </div>
        ) : (
          /* ส่วนของการเลือกหน้า (Pagination UI) */
          <div className="px-6 py-5 bg-[#FDFBFA] border-t border-[#efebe9] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[10px] font-bold text-[#A1887F] uppercase tracking-widest">
              แสดง {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtered.length)} จากทั้งหมด {filtered.length} รายการ
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-[#FDF8F5] disabled:opacity-30 text-[#885E43] transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                    currentPage === i + 1 
                    ? 'bg-[#885E43] text-white shadow-md shadow-[#885E43]/20' 
                    : 'text-[#A1887F] hover:bg-[#FDF8F5]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-[#FDF8F5] disabled:opacity-30 text-[#885E43] transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
