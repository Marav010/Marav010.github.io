import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, History, Camera, 
  Search, X, Plus, Cat, Save, Facebook, Upload, Loader2, Edit3, Trash2
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', note: '-', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // ฟังก์ชันอัปโหลดรูปภาพเข้า Supabase Storage
  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-images')
        .getPublicUrl(filePath);

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

    let error;
    if (modalMode === 'edit') {
      const { error: err } = await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
      error = err;
    } else {
      const { error: err } = await supabase.from('bookings').insert([{ 
        ...payload, 
        cat_names: 'ยังไม่มีข้อมูลแมว',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        room_type: 'สแตนดาร์ด'
      }]);
      error = err;
    }

    if (!error) {
      setIsModalOpen(false);
      fetchData();
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name, phone: b.phone || '-', source: b.source || 'Line',
          source_id: b.source_id || '', stayCount: 0, totalSpent: 0,
          cameraId: b.camera_id || '-', note: b.note || '-',
          image: b.customer_image || '', catNames: new Set()
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
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
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">จัดการโปรไฟล์และไอดีกล้อง</p></div>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <input type="text" placeholder="ค้นหา..." className="pl-4 pr-4 py-2.5 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm w-full md:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', note: '-', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg text-sm"><Plus size={18} /> เพิ่มลูกค้า</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] flex-shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] truncate">{customer.name}</h3>
                  <div className="flex gap-1">
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center"><h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20}/></button></div>
            <div className="p-6 space-y-4">
              
              {/* อัปโหลดรูป */}
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
