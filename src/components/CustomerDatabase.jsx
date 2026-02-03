import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, Camera, Search, X, Plus, Cat, Save, 
  Facebook, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  ChevronLeft, ChevronRight, Calendar, DoorOpen, CreditCard, Clock
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
  const [selectedCustomer, setSelectedCustomer] = useState(null); // สำหรับดูรายละเอียด
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

  // ประมวลผลข้อมูลและเก็บประวัติการจองแยกแต่ละคน
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
          history: [] // เก็บประวัติการจองทั้งหมด
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

  const handleSave = async () => {
    if (!editingCustomer.name) return alert('กรุณาระบุชื่อลูกค้า');
    const payload = {
      customer_name: editingCustomer.name, phone: editingCustomer.phone,
      source: editingCustomer.source, source_id: editingCustomer.source_id,
      camera_id: editingCustomer.cameraId, eating_habit: editingCustomer.eating_habit,
      note: editingCustomer.note, customer_image: editingCustomer.image
    };

    if (modalMode === 'edit') {
      await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
    } else {
      await supabase.from('bookings').insert([{ ...payload, cat_names: 'ยังไม่มีข้อมูลแมว', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], room_type: 'สแตนดาร์ด' }]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  return (
    <div className="space-y-6 py-4 pb-20">
      {/* Header & Search (เหมือนเดิม) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">คลิกที่การ์ดเพื่อดูประวัติการเข้าพัก</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="ชื่อลูกค้า หรือ ชื่อแมว..." className="pl-4 pr-4 py-2.5 w-full md:w-64 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', eating_habit: '', note: '', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shrink-0"><Plus size={18} /> เพิ่ม</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        {currentData.map((customer, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedCustomer(customer)} // คลิกแล้วเปิดดูรายละเอียด
            className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] flex-shrink-0 relative">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] text-lg truncate">{customer.name}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} 
                    className="p-2 text-[#885E43] hover:bg-[#FDF8F5] rounded-xl transition-colors"
                  >
                    <Edit3 size={18}/>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#DE9E48] px-2 py-0.5 rounded-md flex items-center gap-1"><Cat size={10}/>{customer.catNamesDisplay || 'ไม่มีข้อมูลแมว'}</span>
                </div>
              </div>
            </div>

            {/* ข้อมูลการกินและหมายเหตุ (โชว์หน้าการ์ด) */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="p-3 bg-[#FDFBFA] rounded-2xl border border-[#efebe9]/50">
                <div className="flex items-center gap-2 mb-1">
                  <Utensils size={14} className="text-[#DE9E48]" />
                  <span className="text-[11px] font-black text-[#885E43] uppercase">ข้อมูลการกิน</span>
                </div>
                <p className="text-xs text-[#372C2E] line-clamp-2">{customer.eating_habit || '-'}</p>
              </div>
              <div className="p-3 bg-[#FDFBFA] rounded-2xl border border-[#efebe9]/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-[#DE9E48]" />
                  <span className="text-[11px] font-black text-[#885E43] uppercase">หมายเหตุลูกค้า</span>
                </div>
                <p className="text-xs text-[#372C2E] line-clamp-2">{customer.note || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#FDFBFA] text-center">
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">ยอดสะสม</p><p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">เข้าพัก</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</p><p className="text-sm font-black text-blue-600">{customer.cameraId}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (เหมือนเดิม) */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 py-4">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage-1)} className="p-2 rounded-xl border bg-white disabled:opacity-30 text-[#885E43]"><ChevronLeft size={20} /></button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i+1)} className={`w-10 h-10 rounded-xl font-bold ${currentPage === i+1 ? 'bg-[#885E43] text-white shadow-lg' : 'bg-white border text-[#885E43]'}`}>{i+1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage+1)} className="p-2 rounded-xl border bg-white disabled:opacity-30 text-[#885E43]"><ChevronRight size={20} /></button>
        </div>
      )}

      {/* --- Modal 1: ดูประวัติการเข้าพักทั้งหมด (View Details) --- */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#FDFBFA] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#DE9E48]">
                  {selectedCustomer.image ? <img src={selectedCustomer.image} className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-2"/>}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
                  <p className="text-xs text-gray-400">ประวัติการจองทั้งหมด {selectedCustomer.stayCount} รายการ</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedCustomer.history.map((h, i) => (
                <div key={i} className="bg-white p-4 rounded-3xl border border-[#efebe9] shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 bg-[#FDF8F5] px-3 py-1 rounded-full">
                      <Calendar size={14} className="text-[#885E43]" />
                      <span className="text-xs font-bold text-[#885E43]">{h.start_date} - {h.end_date}</span>
                    </div>
                    <span className="text-sm font-black text-[#372C2E]">฿{h.total_price?.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600"><DoorOpen size={14} className="text-[#DE9E48]"/> ห้อง: <span className="font-bold text-[#372C2E]">{h.room_type}</span></div>
                      <div className="flex items-center gap-2 text-xs text-gray-600"><Cat size={14} className="text-[#DE9E48]"/> น้องแมว: <span className="font-bold text-[#372C2E]">{h.cat_names}</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600"><CreditCard size={14} className="text-[#DE9E48]"/> สถานะ: <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md font-bold">สำเร็จ</span></div>
                      <div className="flex items-center gap-2 text-xs text-gray-600"><Clock size={14} className="text-[#DE9E48]"/> ทำรายการเมื่อ: <span className="font-medium text-gray-400">{new Date(h.created_at).toLocaleDateString('th-TH')}</span></div>
                    </div>
                  </div>
                  {h.note && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-100 italic text-[11px] text-[#A1887F]">
                      * {h.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 2: แก้ไข/เพิ่ม (เหมือนเดิม) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center font-bold">
              {modalMode === 'edit' ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* ส่วน Upload รูป */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-[#885E43]/20 overflow-hidden relative cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={18}/><span className="text-[8px] font-bold mt-1">รูปโปรไฟล์</span></div>}
                  {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-gray-400">ชื่อลูกค้า</label><input className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl font-bold" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} disabled={modalMode === 'edit'} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400">เบอร์โทร</label><input className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                </div>
                <div><label className="text-[10px] font-bold text-blue-600">ไอดีกล้อง</label><input className="w-full p-2.5 bg-blue-50 border-blue-100 border rounded-xl font-bold" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">ข้อมูลการกิน</label><textarea rows="2" className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl text-sm" value={editingCustomer.eating_habit} onChange={e => setEditingCustomer({...editingCustomer, eating_habit: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">หมายเหตุ</label><textarea rows="2" className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl text-sm" value={editingCustomer.note} onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})} /></div>
                <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-2xl font-black shadow-lg hover:bg-[#5D4037] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><Save size={18}/> บันทึกข้อมูล</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
