import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  User, Phone, Plus, Cat, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  Calendar, Clock, X, AlertTriangle, Save, ChevronLeft, ChevronRight,
  MessageCircle, Facebook, ArrowUp, ArrowDown, CheckCircle2
} from 'lucide-react';

export default function CustomerDatabase() {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [sortOrder, setSortOrder] = useState('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- ระบบ Alert ---
  const [alertConfig, setAlertConfig] = useState({ 
    show: false, type: 'success', title: '', message: '' 
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({ show: true, type, title, message });
  };

  const [editingCustomer, setEditingCustomer] = useState({
    customer_name: '', phone: '', source: 'Line', source_id: '', camera_id: '',
    eating_habit: '-', note: '-', customer_image: ''
  });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('customer_name', { ascending: true });

      const { data: bookingsData, error: bookError } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false });

      if (custError) throw custError;
      if (bookError) throw bookError;

      setCustomers(customersData || []);
      setBookings(bookingsData || []);

    } catch (error) {
      console.error("Error fetching:", error);
      showAlert('error', 'เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatThaiDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    let y = date.getFullYear();
    if (y < 2500) y += 543;
    return `${d}/${m}/${y}`;
  };

  const calculateNights = (start, end) => {
    if (!start || !end) return 0;
    const diffTime = new Date(end) - new Date(start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // --- แก้ไข: ลำดับการลบข้อมูล ---
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customer_name', deleteTarget);
      
      if (error) throw error;
      
      // 1. แจ้งเตือนความสำเร็จก่อน
      showAlert('success', 'ลบสำเร็จ', 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว');
      // 2. ปิดหน้าต่างยืนยันการลบ
      setDeleteTarget(null);
      // 3. รีเฟรชข้อมูลทีหลัง
      fetchData();
    } catch (error) { 
      showAlert('error', 'เกิดข้อผิดพลาด', error.message); 
    }
  };

  const customerStats = useMemo(() => {
    return customers.map(c => {
      const history = bookings.filter(b => b.customer_name === c.customer_name);
      const catNames = new Set();
      history.forEach(h => {
        if (h.cat_names) h.cat_names.split(',').forEach(n => catNames.add(n.trim()));
      });

      const totalSpent = history.reduce((sum, h) => sum + (Number(h.total_price) || 0), 0);
      const lastStay = history.length > 0 ? history[0].start_date : null;

      return {
        ...c,
        phone: c.phone || '',
        camera_id: c.camera_id || '',
        source_id: c.source_id || '',
        eating_habit: c.eating_habit || '-',
        note: c.note || '-',
        customer_image: c.customer_image || '',
        totalSpent,
        stayCount: history.length,
        lastStayDate: lastStay,
        catNamesDisplay: Array.from(catNames).join(', '),
        catNamesSearch: Array.from(catNames).join(' ').toLowerCase(),
        history: history
      };
    });
  }, [customers, bookings]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let result = customerStats.filter(c =>
      (c.customer_name || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.catNamesSearch || '').includes(term)
    );

    result.sort((a, b) => {
      const dateA = new Date(a.lastStayDate || 0);
      const dateB = new Date(b.lastStayDate || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [customerStats, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

  // --- แก้ไข: ลำดับการบันทึกข้อมูล ---
  const handleSave = async () => {
    if (!editingCustomer.customer_name) {
      return showAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อลูกค้า');
    }

    const payload = {
      customer_name: editingCustomer.customer_name,
      phone: editingCustomer.phone || '',
      source: editingCustomer.source || 'Line',
      source_id: editingCustomer.source_id || '',
      camera_id: editingCustomer.camera_id || '',
      eating_habit: editingCustomer.eating_habit || '-',
      note: editingCustomer.note || '-',
      customer_image: editingCustomer.customer_image || ''
    };

    try {
      const { error } = await supabase
        .from('customers')
        .upsert(payload, { onConflict: 'customer_name' });

      if (error) throw error;

      // 1. แจ้งเตือนก่อน
      showAlert('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว 🎉');
      // 2. ปิด Modal
      setIsModalOpen(false);
      // 3. รีเฟรชข้อมูล
      fetchData();
    } catch (err) { 
      showAlert('error', 'เกิดข้อผิดพลาด', err.message); 
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `customer-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-images')
        .getPublicUrl(filePath);

      setEditingCustomer(prev => ({ ...prev, customer_image: publicUrl }));
    } catch (error) { 
      showAlert('error', 'อัปโหลดไม่สำเร็จ', error.message); 
    } finally { 
      setUploading(false); 
    }
  };

  if (loading && !deleteTarget && !isModalOpen && !historyModal && !alertConfig.show) {
    return <div className="h-screen flex items-center justify-center text-[#885E43] font-bold"><Loader2 className="animate-spin mr-2" /> กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="space-y-6 py-4 pb-20 px-2 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">ประวัติการเข้าพักและรายละเอียด</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={toggleSort} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#efebe9] rounded-xl font-bold text-[#885E43] hover:bg-[#FDF8F5] transition-all shadow-sm shrink-0">
            {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
            <span className="hidden sm:inline text-xs">{sortOrder === 'desc' ? 'เข้าพักล่าสุด' : 'เก่าไปใหม่'}</span>
          </button>
          <input type="text" placeholder="ค้นชื่อลูกค้า/ชื่อแมว..." className="px-4 py-2.5 w-full md:w-64 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ customer_name: '', phone: '', source: 'Line', source_id: '', camera_id: '', eating_habit: '-', note: '-', customer_image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg text-sm shrink-0"><Plus size={18} /> เพิ่มลูกค้า</button>
        </div>
      </div>

      {/* Grid Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div key={idx} onClick={() => setHistoryModal(customer)} className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col min-h-[250px]">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] shrink-0">
                {customer.customer_image ? <img src={customer.customer_image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[#372C2E] text-lg truncate pr-2">{customer.customer_name}</h3>
                    <div className="flex mt-1">
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${customer.source === 'Line' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {customer.source === 'Line' ? <MessageCircle size={10} fill="currentColor" className="opacity-40" /> : <Facebook size={10} fill="currentColor" className="opacity-40" />}
                        {customer.source_id || customer.source}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-[#885E43] hover:bg-[#FDF8F5] rounded-lg"><Edit3 size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(customer.customer_name); }} className="p-2 text-[#885E43] hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md flex items-center gap-1"><Phone size={10} /> {customer.phone || '-'}</span>
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#DE9E48] px-2 py-0.5 rounded-md flex items-center gap-1"><Cat size={10} /> {customer.catNamesDisplay || 'ไม่มีข้อมูลแมว'}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[#FDFBFA] rounded-xl border border-[#efebe9]/50 flex-1 space-y-2">
              <div className="flex items-start gap-2">
                <Utensils size={12} className="text-[#DE9E48] mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#372C2E] line-clamp-2 leading-relaxed"><span className="font-bold text-[#885E43]">การกิน:</span> {customer.eating_habit || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#FDFBFA] text-center">
              <div><p className="text-[8px] font-bold text-[#A1887F] uppercase tracking-widest">กล้อง</p><p className="text-sm font-black text-blue-600">{customer.camera_id || '-'}</p></div>
              <div><p className="text-[8px] font-bold text-[#A1887F] uppercase tracking-widest">ยอดรวม</p><p className="text-sm font-black text-[#885E43]">฿{(customer.totalSpent || 0).toLocaleString()}</p></div>
              <div><p className="text-[8px] font-bold text-[#A1887F] uppercase tracking-widest">เข้าพัก</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-8 py-4">
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 rounded-xl bg-white border border-[#efebe9] text-[#885E43] disabled:opacity-30"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-1.5">
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl font-bold text-sm ${currentPage === i + 1 ? 'bg-[#372C2E] text-[#DE9E48]' : 'bg-white border border-[#efebe9] text-[#A1887F]'}`}>{i + 1}</button>
              ))}
            </div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 rounded-xl bg-white border border-[#efebe9] text-[#885E43] disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md my-8 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-[#885E43]/20 overflow-hidden relative cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.customer_image ? <img src={editingCustomer.customer_image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={18} /></div>}
                  {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              <div className="space-y-3">
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ชื่อลูกค้า</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl font-bold" disabled={modalMode === 'edit'} value={editingCustomer.customer_name || ''} onChange={e => setEditingCustomer({ ...editingCustomer, customer_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">เบอร์โทร</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} /></div>
                  <div><label className="text-[10px] font-bold text-blue-600 uppercase">ไอดีกล้อง</label><input className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-600" value={editingCustomer.camera_id || ''} onChange={e => setEditingCustomer({ ...editingCustomer, camera_id: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ช่องทาง</label><select className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm" value={editingCustomer.source || 'Line'} onChange={e => setEditingCustomer({ ...editingCustomer, source: e.target.value })}><option value="Line">Line</option><option value="Facebook">Facebook</option></select></div>
                  <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ไอดี {editingCustomer.source}</label><input className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl" value={editingCustomer.source_id || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_id: e.target.value })} /></div>
                </div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">การกิน</label><textarea className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm" rows="2" value={editingCustomer.eating_habit || ''} onChange={e => setEditingCustomer({ ...editingCustomer, eating_habit: e.target.value })}></textarea></div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">หมายเหตุ</label><textarea className="w-full p-2.5 bg-[#FDFBFA] border border-[#efebe9] rounded-xl text-sm" rows="2" value={editingCustomer.note || ''} onChange={e => setEditingCustomer({ ...editingCustomer, note: e.target.value })}></textarea></div>
                <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg hover:bg-[#5D4037]"><Save size={18} /> บันทึกข้อมูลลูกค้า</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Alert Modal --- */}
      {alertConfig.show && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              alertConfig.type === 'success' ? 'bg-green-50 text-green-500' : 
              alertConfig.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
            }`}>
              {alertConfig.type === 'success' ? <CheckCircle2 size={40} /> : 
               alertConfig.type === 'warning' ? <AlertTriangle size={40} /> : <X size={40} />}
            </div>
            <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
            <p className="text-sm text-[#A1887F] mb-8">{alertConfig.message}</p>
            <button 
              onClick={() => setAlertConfig({ ...alertConfig, show: false })}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 ${
                alertConfig.type === 'success' ? 'bg-green-500 shadow-green-200' : 
                alertConfig.type === 'warning' ? 'bg-amber-500 shadow-amber-200' : 'bg-red-500 shadow-red-200'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
            <h3 className="text-xl font-black text-[#372C2E] mb-2">ยืนยันการลบ?</h3>
            <p className="text-sm text-[#A1887F] mb-8">คุณกำลังจะลบข้อมูลของ <span className="text-red-600 font-bold">"{deleteTarget}"</span> ข้อมูลนี้จะไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-gray-100 text-[#A1887F] rounded-2xl font-bold">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black">ลบทันที</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-3xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col overflow-hidden">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#DE9E48]">
                  {historyModal.customer_image ? <img src={historyModal.customer_image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-[#DE9E48]/20 flex items-center justify-center text-[#DE9E48]"><User size={24} /></div>}
                </div>
                <div><h3 className="font-bold text-xl">{historyModal.customer_name}</h3><p className="text-xs text-[#DE9E48] font-bold">ประวัติการเข้าพัก</p></div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-[#FDFBFA] space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-[#efebe9]">
                  <div className="flex items-center gap-2 text-[#885E43] font-bold text-[10px] mb-2 uppercase"><Utensils size={14} /> การกิน</div>
                  <p className="text-sm text-[#372C2E]">{historyModal.eating_habit || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-[#efebe9]">
                  <div className="flex items-center gap-2 text-[#DE9E48] font-bold text-[10px] mb-2 uppercase"><FileText size={14} /> หมายเหตุ</div>
                  <p className="text-sm text-[#372C2E]">{historyModal.note || '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                {historyModal.history.map((h, i) => (
                  <div key={i} className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[#A1887F] uppercase">วันที่เข้าพัก</span>
                        <div className="text-[11px] font-black text-[#372C2E] flex flex-col">
                          <span>{formatThaiDate(h.start_date)}</span>
                          <span className="text-[11px] font-black text-[#372C2E] flex flex-col">ถึง {formatThaiDate(h.end_date)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col text-indigo-600 font-bold">
                        <span className="text-[9px] font-bold text-[#A1887F] uppercase">คืน</span>
                        {calculateNights(h.start_date, h.end_date)} คืน
                      </div>
                      <div className="flex flex-col text-blue-600 font-bold">
                        <span className="text-[9px] font-bold text-[#A1887F] uppercase">ห้อง</span>
                        {h.room_type}
                      </div>
                      <div className="flex flex-col text-[#DE9E48] font-bold truncate">
                        <span className="text-[9px] font-bold text-[#A1887F] uppercase">แมว</span>
                        {h.cat_names}
                      </div>
                      <div className="flex flex-col md:text-right text-[#885E43]">
                        <span className="text-[9px] font-bold uppercase">ราคา</span>
                        <div className="text-base font-black">฿{(h.total_price || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
