import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, Camera, Search, X, Plus, Cat, Save, 
  Facebook, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  ChevronLeft, ChevronRight, Calendar, DoorOpen, CreditCard, Clock, ChevronRightCircle
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
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal แก้ไข
  const [modalMode, setModalMode] = useState('add');
  const [historyModal, setHistoryModal] = useState(null); // Modal ดูประวัติ (เก็บ Object ลูกค้า)
  
  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', 
    eating_habit: '', note: '', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // รวมข้อมูลลูกค้าและประวัติเข้าพัก
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
          history: [] 
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      acc[name].history.push(b);
      
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

  if (loading) return <div className="h-screen flex items-center justify-center text-[#885E43] font-bold"><Loader2 className="animate-spin mr-2"/> กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 py-4 pb-20 px-2">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">แตะการ์ดเพื่อดูประวัติการเข้าพัก</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="ค้นหาชื่อลูกค้า/ชื่อแมว..." className="px-4 py-2.5 w-full md:w-64 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18}/> เพิ่ม</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div 
            key={idx} 
            onClick={() => setHistoryModal(customer)}
            className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
          >
            {/* ข้อมูลหลักหน้าการ์ด */}
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] text-lg truncate">{customer.name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-[#885E43] hover:bg-[#FDF8F5] rounded-lg"><Edit3 size={18}/></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md"><Phone size={10} className="inline mr-1"/>{customer.phone}</span>
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#DE9E48] px-2 py-0.5 rounded-md"><Cat size={10} className="inline mr-1"/>{customer.catNamesDisplay || 'ไม่มีข้อมูลแมว'}</span>
                </div>
              </div>
            </div>

            {/* ข้อมูลการกิน & หมายเหตุ (โชว์ที่หน้าการ์ด) */}
            <div className="mt-4 space-y-2">
              <div className="bg-[#FDFBFA] p-3 rounded-xl border border-[#efebe9]/50">
                <div className="flex items-center gap-2 text-[#885E43] font-bold text-[10px] mb-1 uppercase"><Utensils size={12}/> ข้อมูลการกิน</div>
                <p className="text-xs text-[#372C2E] line-clamp-2">{customer.eating_habit || '-'}</p>
              </div>
              <div className="bg-[#FDFBFA] p-3 rounded-xl border border-[#efebe9]/50">
                <div className="flex items-center gap-2 text-[#885E43] font-bold text-[10px] mb-1 uppercase"><FileText size={12}/> หมายเหตุ</div>
                <p className="text-xs text-[#372C2E] line-clamp-2">{customer.note || '-'}</p>
              </div>
            </div>

            {/* แถบสถิติด้านล่าง */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#FDFBFA]">
               <div className="text-center flex-1"><p className="text-[8px] font-bold text-[#A1887F] uppercase">ยอดรวม</p><p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div className="text-center flex-1 border-x border-[#FDFBFA]"><p className="text-[8px] font-bold text-[#A1887F] uppercase">พักแล้ว</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
               <div className="text-center flex-1"><p className="text-[8px] font-bold text-[#A1887F] uppercase">กล้อง</p><p className="text-sm font-black text-blue-600">{customer.cameraId}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Modal ดูประวัติการเข้าพัก --- */}
      {historyModal && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#DE9E48]/20 flex items-center justify-center border border-[#DE9E48]/30">
                  <History size={24} className="text-[#DE9E48]"/>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{historyModal.name}</h3>
                  <p className="text-xs text-gray-400">ประวัติเข้าพัก {historyModal.stayCount} ครั้ง</p>
                </div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-[#FDFBFA] space-y-4">
              {historyModal.history.map((h, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-[#efebe9] shadow-sm">
                  <div className="flex justify-between items-start border-b border-[#FDFBFA] pb-3 mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#A1887F] uppercase">ระยะเวลาพัก</span>
                      <span className="text-sm font-black text-[#885E43] flex items-center gap-2"><Calendar size={14}/> {h.start_date} → {h.end_date}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#A1887F] uppercase">ค่าบริการ</span>
                      <div className="text-lg font-black text-[#372C2E]">฿{h.total_price?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#FDF8F5] p-3 rounded-2xl">
                      <div className="text-[9px] font-bold text-[#885E43] uppercase flex items-center gap-1 mb-1"><DoorOpen size={10}/> รายละเอียดห้อง</div>
                      <div className="text-xs font-bold text-[#372C2E]">{h.room_type}</div>
                    </div>
                    <div className="bg-[#FDF8F5] p-3 rounded-2xl">
                      <div className="text-[9px] font-bold text-[#885E43] uppercase flex items-center gap-1 mb-1"><Cat size={10}/> รายชื่อน้องแมว</div>
                      <div className="text-xs font-bold text-[#372C2E]">{h.cat_names}</div>
                    </div>
                  </div>
                  {h.note && (
                    <div className="mt-3 text-[11px] text-[#A1887F] flex gap-2 italic">
                      <FileText size={12} className="shrink-0"/> Note: {h.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Modal เพิ่ม/แก้ไขลูกค้า (เหมือนเดิม) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center">
              <span className="font-bold">{modalMode === 'edit' ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}</span>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-[#885E43]/20 overflow-hidden relative cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={18}/></div>}
                  {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              <div className="space-y-3">
                <input placeholder="ชื่อลูกค้า" className="w-full p-3 bg-[#FDFBFA] border rounded-xl font-bold" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} disabled={modalMode === 'edit'} />
                <input placeholder="เบอร์โทร" className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                <input placeholder="ไอดีกล้อง" className="w-full p-3 bg-blue-50 border-blue-100 border rounded-xl font-bold text-blue-600" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} />
                <textarea placeholder="ข้อมูลการกิน" rows="2" className="w-full p-3 bg-[#FDFBFA] border rounded-xl text-sm" value={editingCustomer.eating_habit} onChange={e => setEditingCustomer({...editingCustomer, eating_habit: e.target.value})} />
                <textarea placeholder="หมายเหตุ" rows="2" className="w-full p-3 bg-[#FDFBFA] border rounded-xl text-sm" value={editingCustomer.note} onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})} />
                <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-2xl font-black shadow-lg hover:bg-[#5D4037]">บันทึกข้อมูล</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
