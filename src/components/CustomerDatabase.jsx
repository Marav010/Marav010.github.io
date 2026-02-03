import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, Camera, Search, X, Plus, Cat, Save, 
  Facebook, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  ChevronLeft, ChevronRight, Calendar, CreditCard, DoorOpen, Clock
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', 
    eating_habit: '', note: '', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // --- ประมวลผลกลุ่มลูกค้าและประวัติการเข้าพัก ---
  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name, phone: b.phone || '-', source: b.source || 'Line',
          source_id: b.source_id || '', stayCount: 0, totalSpent: 0,
          cameraId: b.camera_id || '-', eating_habit: b.eating_habit || '-',
          note: b.note || '-', image: b.customer_image || '', 
          catNames: new Set(),
          history: [] // เก็บประวัติการเข้าพักแยกเป็นรายครั้ง
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      acc[name].history.push(b); // เพิ่มข้อมูลการจองครั้งนี้ลงในประวัติ
      
      if (b.cat_names) {
        b.cat_names.split(',').forEach(n => {
          const trimmedName = n.trim();
          if (trimmedName) acc[name].catNames.add(trimmedName);
        });
      }
      return acc;
    }, {});

    return Object.values(stats).map(item => ({ 
      ...item, 
      catNamesDisplay: Array.from(item.catNames).join(', '),
      catNamesSearch: Array.from(item.catNames).join(' ').toLowerCase()
    }));
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customerStats.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.phone.includes(term) || 
      c.catNamesSearch.includes(term)
    );
  }, [customerStats, searchTerm]);

  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 py-4 pb-20 px-2">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">กดที่การ์ดเพื่อดูประวัติการเข้าพักละเอียด</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="ค้นหาชื่อคน หรือ ชื่อแมว..." className="pl-4 pr-4 py-2.5 w-full md:w-80 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', eating_habit: '', note: '', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg text-sm shrink-0"><Plus size={18} /> เพิ่ม</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div 
            key={idx} 
            onClick={() => { setSelectedCustomer(customer); setIsDetailOpen(true); }}
            className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] flex-shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] truncate text-lg group-hover:text-[#885E43] transition-colors">{customer.name}</h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                </div>
                <div className="mt-2 text-[11px] text-[#DE9E48] font-bold flex items-center gap-1 italic"><Cat size={14} />{customer.catNamesDisplay || 'ยังไม่มีข้อมูลแมว'}</div>
              </div>
            </div>

            {/* พฤติกรรมการกิน & หมายเหตุ (แสดงหน้าการ์ดตามที่ต้องการ) */}
            <div className="mt-4 p-3 bg-[#FDFBFA] rounded-xl border border-[#efebe9]/50 space-y-2">
              <div className="flex items-start gap-2 text-[11px]">
                <Utensils size={14} className="text-[#DE9E48] mt-0.5 shrink-0" />
                <p className="text-[#372C2E]"><span className="font-bold text-[#885E43]">การกิน:</span> {customer.eating_habit || '-'}</p>
              </div>
              <div className="flex items-start gap-2 text-[11px]">
                <FileText size={14} className="text-[#DE9E48] mt-0.5 shrink-0" />
                <p className="text-[#372C2E]"><span className="font-bold text-[#885E43]">หมายเหตุ:</span> {customer.note || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#FDFBFA] text-center">
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider">เข้าพัก</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider">ยอดสะสม</p><p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider">ไอดีกล้อง</p><p className="text-sm font-black text-blue-600">{customer.cameraId}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 rounded-xl border bg-white disabled:opacity-30 text-[#885E43]"><ChevronLeft size={20}/></button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => handlePageChange(i + 1)} className={`w-10 h-10 rounded-xl font-bold ${currentPage === i + 1 ? 'bg-[#885E43] text-white shadow-lg' : 'bg-white border text-[#885E43]'}`}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 rounded-xl border bg-white disabled:opacity-30 text-[#885E43]"><ChevronRight size={20}/></button>
        </div>
      )}

      {/* --- MODAL: ประวัติการเข้าพักละเอียด (เมื่อกดที่การ์ด) --- */}
      {isDetailOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FDFBFA] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20">
                  {selectedCustomer.image ? <img src={selectedCustomer.image} className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-2"/>}
                </div>
                <div>
                  <h3 className="font-black text-xl leading-none">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#DE9E48] mt-1 font-bold">ประวัติการเข้าพักทั้งหมด</p>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* ส่วนบน: ข้อมูลการกินและหมายเหตุหลัก */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-[#efebe9]">
                  <div className="flex items-center gap-2 mb-2 text-[#885E43] font-bold"><Utensils size={18}/><span>ข้อมูลการกิน</span></div>
                  <p className="text-sm text-[#372C2E]">{selectedCustomer.eating_habit || 'ไม่มีข้อมูล'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#efebe9]">
                  <div className="flex items-center gap-2 mb-2 text-[#DE9E48] font-bold"><FileText size={18}/><span>หมายเหตุถาวร</span></div>
                  <p className="text-sm text-[#372C2E]">{selectedCustomer.note || 'ไม่มีข้อมูล'}</p>
                </div>
              </div>

              {/* รายการประวัติการจอง */}
              <div className="space-y-4">
                <h4 className="font-black text-[#372C2E] flex items-center gap-2"><Clock size={18}/> รายการเข้าพักรายครั้ง</h4>
                {selectedCustomer.history.map((item, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-[#efebe9] shadow-sm relative">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><p className="text-[10px] font-bold text-[#A1887F] uppercase">วันที่เข้าพัก</p><p className="text-xs font-bold text-[#372C2E] flex items-center gap-1 mt-1"><Calendar size={12}/> {item.start_date} - {item.end_date}</p></div>
                      <div><p className="text-[10px] font-bold text-[#A1887F] uppercase">ประเภทห้อง</p><p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1"><DoorOpen size={12}/> {item.room_type}</p></div>
                      <div><p className="text-[10px] font-bold text-[#A1887F] uppercase">น้องแมว</p><p className="text-xs font-bold text-[#DE9E48] flex items-center gap-1 mt-1"><Cat size={12}/> {item.cat_names}</p></div>
                      <div><p className="text-[10px] font-bold text-[#A1887F] uppercase">ค่าที่พัก</p><p className="text-sm font-black text-[#885E43] mt-1">฿{item.total_price?.toLocaleString()}</p></div>
                    </div>
                    {item.note && item.note !== selectedCustomer.note && (
                      <div className="mt-3 pt-3 border-t border-dashed border-gray-100 italic text-[11px] text-[#A1887F]">
                        *หมายเหตุครั้งนี้: {item.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: แก้ไขข้อมูล (เหมือนเดิมที่คุณใช้) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
            {/* ส่วนหัวและฟอร์มแก้ไข (คงเดิมจากโค้ดก่อนหน้า) */}
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center"><h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขข้อมูลพื้นฐาน' : 'เพิ่มลูกค้าใหม่'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20}/></button></div>
            <div className="p-6 space-y-4">
               {/* ... (Copy ส่วนฟอร์ม input จากโค้ดก่อนหน้ามาใส่ตรงนี้) ... */}
               <button onClick={async () => {
                 const payload = {
                   customer_name: editingCustomer.name, phone: editingCustomer.phone,
                   source: editingCustomer.source, source_id: editingCustomer.source_id,
                   camera_id: editingCustomer.cameraId, eating_habit: editingCustomer.eating_habit,
                   note: editingCustomer.note, customer_image: editingCustomer.image
                 };
                 if (modalMode === 'edit') await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
                 else await supabase.from('bookings').insert([{...payload, cat_names: 'ยังไม่มีข้อมูล', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], room_type: 'สแตนดาร์ด'}]);
                 setIsModalOpen(false); fetchData();
               }} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
