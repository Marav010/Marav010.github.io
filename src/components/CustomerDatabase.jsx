import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  User, Phone, Plus, Cat, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  Calendar, DoorOpen, Clock, History, X, AlertTriangle, Save, Moon
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', cameraId: '',
    eating_habit: '-', note: '-', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // --- ฟังก์ชันคำนวณจำนวนคืน ---
  const calculateNights = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('customer_name', deleteTarget);

      if (error) throw error;
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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
          lastStay: { start: b.start_date, end: b.end_date },
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

  const handleSave = async () => {
    if (!editingCustomer.name) return alert('กรุณาระบุชื่อลูกค้า');
    const payload = {
      customer_name: editingCustomer.name, phone: editingCustomer.phone,
      source: editingCustomer.source, source_id: editingCustomer.source_id,
      camera_id: editingCustomer.cameraId, eating_habit: editingCustomer.eating_habit,
      note: editingCustomer.note, customer_image: editingCustomer.image
    };

    try {
      if (modalMode === 'edit') {
        await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
      } else {
        await supabase.from('bookings').insert([{ 
          ...payload, 
          cat_names: 'ยังไม่มีข้อมูลแมว', 
          start_date: new Date().toISOString().split('T')[0], 
          end_date: new Date().toISOString().split('T')[0], 
          room_type: 'สแตนดาร์ด' 
        }]);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `customer-photos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setEditingCustomer(prev => ({ ...prev, image: publicUrl }));
    } catch (error) {
      alert('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !deleteTarget && !isModalOpen) return <div className="h-screen flex items-center justify-center text-[#885E43] font-bold"><Loader2 className="animate-spin mr-2" /> กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 py-4 pb-20 px-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">ประวัติการเข้าพักและรายละเอียดลูกค้า</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="ค้นหาชื่อลูกค้า/ชื่อแมว..." className="px-4 py-2.5 w-full md:w-64 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '', eating_habit: '-', note: '-', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg transition-all active:scale-95 text-sm shrink-0"><Plus size={18} /> เพิ่มลูกค้า</button>
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
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] shrink-0 shadow-inner">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] text-lg truncate">{customer.name}</h3>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-[#885E43] hover:bg-[#FDF8F5] rounded-lg transition-colors"><Edit3 size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(customer.name); }} className="p-2 text-[#885E43] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md"><Phone size={10} className="inline mr-1" />{customer.phone}</span>
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#DE9E48] px-2 py-0.5 rounded-md"><Cat size={10} className="inline mr-1" />{customer.catNamesDisplay || 'ไม่มีข้อมูลแมว'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="bg-[#FDFBFA] p-3 rounded-xl border border-[#efebe9]/50">
                <div className="flex items-center gap-2 text-[#885E43] font-bold text-[10px] mb-1 uppercase"><Utensils size={12} /> ข้อมูลการกิน</div>
                <p className="text-xs text-[#372C2E] line-clamp-2 leading-relaxed">{customer.eating_habit || '-'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#FDFBFA]">
              <div className="text-center flex-1"><p className="text-[8px] font-bold text-[#A1887F] uppercase">กล้อง</p><p className="text-sm font-black text-blue-600">{customer.cameraId}</p></div>
              <div className="text-center flex-1 border-x border-[#FDFBFA]"><p className="text-[8px] font-bold text-[#A1887F] uppercase">ยอดรวม</p><p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
              <div className="text-center flex-1"><p className="text-[8px] font-bold text-[#A1887F] uppercase">พักแล้ว</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md my-8 rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-[#885E43]/20 overflow-hidden relative cursor-pointer group" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-[#885E43] transition-colors"><Upload size={18}/><span className="text-[8px] font-bold mt-1 uppercase">รูปโปรไฟล์</span></div>}
                  {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              <div className="space-y-3">
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">ชื่อลูกค้า</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl font-bold focus:border-[#885E43] outline-none transition-all" disabled={modalMode === 'edit'} value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">เบอร์โทร</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43]" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                  <div><label className="text-[10px] font-bold text-blue-600 uppercase ml-1 font-black">ไอดีกล้อง</label><input className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-600 outline-none focus:border-blue-400" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">ช่องทาง</label><select className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm outline-none focus:border-[#885E43]" value={editingCustomer.source} onChange={e => setEditingCustomer({...editingCustomer, source: e.target.value})}><option value="Line">Line</option><option value="Facebook">Facebook</option></select></div>
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">ไอดี {editingCustomer.source}</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43]" value={editingCustomer.source_id} onChange={e => setEditingCustomer({...editingCustomer, source_id: e.target.value})} /></div>
                </div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">การกิน</label><textarea className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm outline-none focus:border-[#885E43] resize-none" rows="2" value={editingCustomer.eating_habit} onChange={e => setEditingCustomer({...editingCustomer, eating_habit: e.target.value})}></textarea></div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase ml-1">หมายเหตุ</label><textarea className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm outline-none focus:border-[#885E43] resize-none" rows="2" value={editingCustomer.note} onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})}></textarea></div>
                <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg hover:bg-[#5D4037] transition-all active:scale-95 shadow-[#885E43]/20"><Save size={18}/> บันทึกข้อมูลทั้งหมด</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-3xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#DE9E48]">
                  {historyModal.image ? <img src={historyModal.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#DE9E48]/20 flex items-center justify-center text-[#DE9E48]"><User size={24} /></div>}
                </div>
                <div><h3 className="font-bold text-xl leading-tight">{historyModal.name}</h3><p className="text-xs text-[#DE9E48] font-bold uppercase tracking-wider">ข้อมูลและรายละเอียดลูกค้า</p></div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-[#FDFBFA] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-[#efebe9] shadow-sm">
                  <div className="flex items-center gap-2 text-[#885E43] font-bold text-xs mb-2 uppercase tracking-wide"><Utensils size={14} /> ข้อมูลการกิน</div>
                  <p className="text-sm text-[#372C2E] font-medium leading-relaxed">{historyModal.eating_habit || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-[#efebe9] shadow-sm">
                  <div className="flex items-center gap-2 text-[#DE9E48] font-bold text-xs mb-2 uppercase tracking-wide"><FileText size={14} /> หมายเหตุถาวร</div>
                  <p className="text-sm text-[#372C2E] font-medium leading-relaxed">{historyModal.note || '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-black text-[#372C2E] text-lg px-1"><Clock size={20} className="text-[#885E43]" /> รายการเข้าพัก</div>
                {historyModal.history.map((h, i) => (
                  <div key={i} className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm hover:shadow-md transition-all">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                      <div className="flex flex-col"><span className="text-[9px] font-bold text-[#A1887F] mb-1 uppercase tracking-wider">วันที่เข้าพัก</span><div className="flex items-center gap-2 text-[11px] font-black text-[#372C2E]"><Calendar size={12} className="text-[#885E43]" /><span>{h.start_date} ถึง {h.end_date}</span></div></div>
                      {/* ส่วนที่เพิ่มจำนวนคืนในประวัติ */}
                      <div className="flex flex-col"><span className="text-[9px] font-bold text-[#A1887F] mb-1 uppercase tracking-wider">จำนวน</span><div className="text-indigo-600 font-bold text-[12px] flex items-center gap-1">{calculateNights(h.start_date, h.end_date)} คืน</div></div>
                      <div className="flex flex-col"><span className="text-[9px] font-bold text-[#A1887F] mb-1 uppercase tracking-wider">ห้อง</span><div className="text-blue-600 font-bold text-[12px]">{h.room_type}</div></div>
                      <div className="flex flex-col"><span className="text-[9px] font-bold text-[#A1887F] mb-1 uppercase tracking-wider">น้องแมว</span><div className="text-[#DE9E48] font-bold text-[12px] truncate">{h.cat_names}</div></div>
                      <div className="flex flex-col md:text-right"><span className="text-[9px] font-bold text-[#A1887F] mb-1 uppercase tracking-wider">ยอดรวม</span><div className="text-base font-black text-[#885E43]">฿{h.total_price?.toLocaleString()}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

     {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">ยืนยันการลบข้อมูล?</h3>
              <p className="text-sm text-[#A1887F] font-medium leading-relaxed mb-8 px-2">
                คุณกำลังจะลบข้อมูลของ <span className="text-red-600 font-bold underline underline-offset-4">"{deleteTarget}"</span> รวมถึงประวัติการเข้าพักทั้งหมด ข้อมูลนี้จะไม่สามารถกู้คืนได้
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-gray-100 text-[#A1887F] rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95">ยกเลิก</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-95">ลบทันที</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
