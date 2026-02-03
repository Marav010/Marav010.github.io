import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, History, Camera, 
  Search, X, Plus, Cat, Save, Facebook, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  ChevronLeft, ChevronRight
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

  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('customer-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('customer-images').getPublicUrl(filePath);
      setEditingCustomer({ ...editingCustomer, image: publicUrl });
    } catch (error) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingCustomer.name) return alert('กรุณาระบุชื่อลูกค้า');
    const payload = {
      customer_name: editingCustomer.name,
      phone: editingCustomer.phone,
      source: editingCustomer.source,
      source_id: editingCustomer.source_id,
      camera_id: editingCustomer.cameraId,
      eating_habit: editingCustomer.eating_habit,
      note: editingCustomer.note,
      customer_image: editingCustomer.image
    };

    if (modalMode === 'edit') {
      await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
    } else {
      await supabase.from('bookings').insert([{ 
        ...payload, 
        cat_names: 'รอกรอกชื่อแมว',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        room_type: 'สแตนดาร์ด'
      }]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name, phone: b.phone || '-', source: b.source || 'Line',
          source_id: b.source_id || '', stayCount: 0, totalSpent: 0,
          cameraId: b.camera_id || '-', eating_habit: b.eating_habit || '-',
          note: b.note || '-', image: b.customer_image || '', catNames: new Set()
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
      return acc;
    }, {});
    return Object.values(stats).map(item => ({ ...item, catNames: Array.from(item.catNames).join(', ') }));
  }, [bookings]);

  // --- ปรับปรุงการค้นหาให้รวมชื่อน้องแมว ---
  const filtered = customerStats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) || 
    c.catNames.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 py-4 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">ค้นหาชื่อเจ้าของ หรือ ชื่อแมวได้เลย</p></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-3 text-[#A1887F]" size={18} />
            <input type="text" placeholder="ชื่อลูกค้า / ชื่อแมว / เบอร์โทร..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#DE9E48] font-bold text-sm shadow-sm" 
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', eating_habit: '', note: '', image: '' }); setIsModalOpen(true); }} 
            className="bg-[#885E43] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg text-sm transition-all"><Plus size={18} /> เพิ่ม</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentData.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-6 border border-[#efebe9] shadow-sm hover:shadow-xl transition-all relative flex flex-col border-b-4 border-b-[#DE9E48]">
            <div className="flex gap-5">
              {/* Profile Image */}
              <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-[#FDF8F5] border-2 border-[#FDF8F5] shadow-inner flex-shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={40}/></div>}
              </div>

              {/* Top Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-[#A1887F] flex items-center gap-1 uppercase tracking-wider mb-0.5"><User size={12}/> เจ้าของ</h3>
                    <p className="font-black text-[#372C2E] text-lg truncate leading-none">{customer.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit3 size={18}/></button>
                    <button onClick={() => { if(confirm('ลบลูกค้านี้?')) supabase.from('bookings').delete().eq('customer_name', customer.name).then(fetchData); }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>

                {/* Highlight ชื่อแมวตรงนี้ */}
                <div className="mt-3 bg-[#FFF9F2] p-2.5 rounded-2xl border border-[#FFE0BD]">
                   <h3 className="text-[10px] font-black text-[#DE9E48] uppercase flex items-center gap-1 mb-1"><Cat size={14} /> น้องแมว</h3>
                   <p className="text-base font-black text-[#885E43] truncate leading-none drop-shadow-sm">
                      {customer.catNames || 'ไม่มีข้อมูลชื่อแมว'}
                   </p>
                </div>
              </div>
            </div>

            {/* Social & Contact */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs font-bold bg-[#FDF8F5] text-[#372C2E] px-3 py-1.5 rounded-xl border border-[#efebe9] flex items-center gap-2"><Phone size={14} className="text-[#885E43]"/>{customer.phone}</span>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-2 ${customer.source === 'Line' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                {customer.source === 'Line' ? <MessageCircle size={14}/> : <Facebook size={14}/>} {customer.source_id || '-'}
              </span>
            </div>

            {/* Care Info */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-2xl border border-dashed border-gray-200">
                <p className="text-[9px] font-bold text-[#A1887F] uppercase flex items-center gap-1 mb-1"><Utensils size={10}/> การกิน</p>
                <p className="text-[11px] text-[#372C2E] line-clamp-2 leading-relaxed">{customer.eating_habit || '-'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-dashed border-gray-200">
                <p className="text-[9px] font-bold text-[#A1887F] uppercase flex items-center gap-1 mb-1"><FileText size={10}/> หมายเหตุ</p>
                <p className="text-[11px] text-[#372C2E] line-clamp-2 leading-relaxed">{customer.note || '-'}</p>
              </div>
            </div>

            {/* Stats Footer */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#FDFBFA] text-center">
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</p><p className="text-sm font-black text-blue-600">{customer.cameraId}</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">ยอดสะสม</p><p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div><p className="text-[9px] font-bold text-[#A1887F] uppercase">เข้าพัก</p><p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (เลขหน้า) */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 py-6">
          <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2.5 rounded-2xl border bg-white disabled:opacity-20 text-[#885E43] transition-all hover:bg-[#FDF8F5]"><ChevronLeft size={22} /></button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => handlePageChange(i + 1)} className={`w-12 h-12 rounded-2xl font-black transition-all ${currentPage === i + 1 ? 'bg-[#885E43] text-white shadow-xl scale-110' : 'bg-white border text-[#885E43] hover:bg-[#FDF8F5]'}`}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2.5 rounded-2xl border bg-white disabled:opacity-20 text-[#885E43] transition-all hover:bg-[#FDF8F5]"><ChevronRight size={22} /></button>
        </div>
      )}

      {/* Modal - ปรับปรุงสัดส่วนเล็กน้อย */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md my-auto rounded-[3rem] overflow-hidden shadow-2xl border border-white/20">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2 tracking-wide">
                {modalMode === 'edit' ? <Edit3 size={20}/> : <Plus size={20}/>}
                {modalMode === 'edit' ? 'แก้ไขประวัติ' : 'เพิ่มประวัติใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all p-1 bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border-4 border-dashed border-[#885E43]/10 overflow-hidden relative cursor-pointer group hover:border-[#DE9E48]/50 transition-all shadow-inner" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={24}/><span className="text-[10px] font-black mt-1">รูปโปรไฟล์</span></div>}
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[11px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5 block">ชื่อลูกค้า (ชื่อจริง)</label>
                    <input className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none transition-all" 
                      disabled={modalMode === 'edit'} value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5 block">เบอร์โทร</label>
                    <input className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none" 
                      value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-wider mb-1.5 block">ไอดีกล้อง</label>
                    <input className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-100 focus:border-blue-400 rounded-2xl font-black text-blue-700 outline-none" 
                      value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5 block">ช่องทาง</label>
                    <select className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none" 
                      value={editingCustomer.source} onChange={e => setEditingCustomer({...editingCustomer, source: e.target.value})}>
                      <option value="Line">Line</option><option value="Facebook">Facebook</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5 block">ไอดี {editingCustomer.source}</label>
                    <input className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none" 
                      value={editingCustomer.source_id} onChange={e => setEditingCustomer({...editingCustomer, source_id: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-[#885E43] uppercase tracking-wider mb-1.5 block">พฤติกรรมการกิน / สูตรอาหาร</label>
                  <textarea className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none text-sm" 
                    rows="2" value={editingCustomer.eating_habit} onChange={e => setEditingCustomer({...editingCustomer, eating_habit: e.target.value})}></textarea>
                </div>
                <div>
                  <label className="text-[11px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5 block">หมายเหตุพิเศษ</label>
                  <textarea className="w-full px-4 py-3 bg-[#FDFBFA] border-2 border-[#efebe9] focus:border-[#DE9E48] rounded-2xl font-bold outline-none text-sm" 
                    rows="2" value={editingCustomer.note} onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})}></textarea>
                </div>
                <button onClick={handleSave} className="w-full py-4 bg-[#885E43] hover:bg-[#372C2E] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 mt-4 shadow-xl shadow-[#885E43]/20 transition-all uppercase tracking-widest">
                  <Save size={20}/> บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
