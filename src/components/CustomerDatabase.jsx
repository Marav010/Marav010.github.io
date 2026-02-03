import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, History, Camera, 
  Search, X, Plus, Cat, Save, Facebook, Upload, Loader2, Edit3, Trash2, Calendar, Home, CreditCard
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', note: '-', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('start_date', { ascending: false });
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
      note: editingCustomer.note,
      customer_image: editingCustomer.image
    };
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
  };

  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name, phone: b.phone || '-', source: b.source || 'Line',
          source_id: b.source_id || '', stayCount: 0, totalSpent: 0,
          cameraId: b.camera_id || '-', note: b.note || '-',
          image: b.customer_image || '', catNames: new Set(),
          history: []
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
      acc[name].history.push(b);
      return acc;
    }, {});
    return Object.values(stats).map(item => ({ ...item, catNames: Array.from(item.catNames).join(', ') }));
  }, [bookings]);

  const filtered = customerStats.filter(c => 
    c.name.includes(searchTerm) || c.phone.includes(searchTerm) || c.source_id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">จัดการโปรไฟล์และประวัติการเข้าพัก</p></div>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <input type="text" placeholder="ค้นหาชื่อ/เบอร์/ไอดี..." className="pl-4 pr-4 py-2.5 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', note: '-', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg text-sm"><Plus size={18} /> เพิ่มลูกค้า</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((customer, idx) => (
          <div 
            key={idx} 
            onClick={() => { setSelectedCustomer(customer); setIsDetailOpen(true); }}
            className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md hover:border-[#885E43]/30 transition-all relative overflow-hidden cursor-pointer group"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] flex-shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] truncate group-hover:text-[#885E43] transition-colors">{customer.name}</h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => { if(confirm('ลบลูกค้านี้?')) supabase.from('bookings').delete().eq('customer_name', customer.name).then(fetchData); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[9px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${customer.source === 'Line' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {customer.source === 'Line' ? <MessageCircle size={10}/> : <Facebook size={10}/>} {customer.source_id || 'ไม่มีไอดี'}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-[#A1887F] font-bold flex items-center gap-1 truncate italic"><Cat size={12} className="text-[#DE9E48]" /> {customer.catNames || 'ไม่มีข้อมูลแมว'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#FDFBFA] text-center">
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</p><p className="text-xs font-black text-blue-600">{customer.cameraId}</p></div>
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">ยอดสะสม</p><p className="text-xs font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">เข้าพัก</p><p className="text-xs font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal: ดูประวัติการเข้าพักละเอียด */}
      {isDetailOpen && selectedCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#FDFBFA] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border border-white/20 overflow-hidden bg-white/10">
                  {selectedCustomer.image ? <img src={selectedCustomer.image} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2" />}
                </div>
                <div>
                  <h3 className="text-lg font-black">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#DE9E48] font-bold">ประวัติการเข้าพักทั้งหมด {selectedCustomer.stayCount} ครั้ง</p>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedCustomer.history.map((stay, sIdx) => {
                const start = new Date(stay.start_date);
                const end = new Date(stay.end_date);
                const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={sIdx} className="bg-white border border-[#efebe9] rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 bg-[#FDF8F5] px-3 py-1.5 rounded-full border border-[#efebe9]">
                        <Calendar size={14} className="text-[#DE9E48]" />
                        <span className="text-xs font-black text-[#372C2E]">
                          {stay.start_date} ถึง {stay.end_date}
                        </span>
                        <span className="text-[10px] font-bold text-[#885E43] ml-1">({nights} คืน)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#A1887F] uppercase mb-1">ยอดชำระ</p>
                        <p className="text-sm font-black text-[#885E43]">฿{(stay.total_price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Home size={18}/></div>
                        <div>
                          <p className="text-[9px] font-bold text-[#A1887F] uppercase">ประเภทห้อง</p>
                          <p className="text-sm font-bold text-[#372C2E]">{stay.room_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Cat size={18}/></div>
                        <div>
                          <p className="text-[9px] font-bold text-[#A1887F] uppercase">ชื่อน้องแมว</p>
                          <p className="text-sm font-bold text-[#372C2E]">{stay.cat_names}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FDFBFA] rounded-2xl p-4 border border-dashed border-[#DBD0C5]">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-[#A1887F] mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-[#A1887F] uppercase mb-1">หมายเหตุ & รายละเอียดการกิน</p>
                          <p className="text-sm text-[#5D4037] font-medium leading-relaxed italic">
                            {stay.note || 'ไม่มีหมายเหตุ'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: เพิ่ม/แก้ไข (เหมือนเดิม) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center"><h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20}/></button></div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-[#885E43]/20 overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={20}/><span className="text-[8px] font-bold uppercase mt-1">คลิกอัปโหลด</span></div>}
                  {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
              <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ชื่อลูกค้า</label><input className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl font-bold" disabled={modalMode === 'edit'} value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">เบอร์โทร</label><input className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase font-black text-blue-600">ไอดีกล้อง</label><input className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl font-bold" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ช่องทาง</label>
                  <select className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.source} onChange={e => setEditingCustomer({...editingCustomer, source: e.target.value})}>
                    <option value="Line">Line</option><option value="Facebook">Facebook</option>
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ชื่อ ID {editingCustomer.source}</label><input className="w-full p-2.5 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.source_id} onChange={e => setEditingCustomer({...editingCustomer, source_id: e.target.value})} /></div>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg"><Save size={18}/> บันทึกข้อมูลทั้งหมด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
