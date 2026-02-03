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

  // ฟังก์ชันอัปโหลดรูปภาพ
  const handleFileUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      // อัปโหลดไปที่ Bucket ชื่อ 'customer-images'
      const { error: uploadError } = await supabase.storage
        .from('customer-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ดึง Public URL ของรูปออกมา
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

  const filtered = customerStats.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));

  return (
    <div className="space-y-6 py-4">
      {/* Search & Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48]"><User size={24} /></div>
          <div><h2 className="text-xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2></div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input type="text" placeholder="ค้นหา..." className="p-2.5 border rounded-xl flex-1 md:w-64 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', cameraId: '-', note: '-', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16}/>เพิ่มลูกค้า</button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm relative">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FDF8F5] overflow-hidden border">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={24}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-[#372C2E] truncate">{customer.name}</h4>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="text-blue-500 p-1"><Edit3 size={14}/></button>
                  </div>
                </div>
                <div className="text-[10px] flex flex-wrap gap-1 mt-1">
                  <span className="bg-gray-50 px-2 py-0.5 rounded-md flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                  <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${customer.source === 'Line' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {customer.source === 'Line' ? <MessageCircle size={10}/> : <Facebook size={10}/>} {customer.source_id}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-[#A1887F] font-bold truncate"><Cat size={10} className="inline mr-1 text-[#DE9E48]"/>{customer.catNames}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-center">
                <div><p className="text-[8px] uppercase text-gray-400">ID กล้อง</p><p className="text-[11px] font-black">{customer.cameraId}</p></div>
                <div><p className="text-[8px] uppercase text-gray-400">ยอดสะสม</p><p className="text-[11px] font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between">
               <h3 className="font-bold">{modalMode === 'edit' ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h3>
               <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* ส่วนอัปโหลดรูป */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  {editingCustomer.image ? <img src={editingCustomer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><Upload size={20}/><span className="text-[8px]">คลิกอัปโหลด</span></div>}
                  {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-400">ชื่อลูกค้า</label><input className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} disabled={modalMode === 'edit'} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">เบอร์โทร</label><input className="w-full p-2.5 bg-gray-50 border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">ไอดีกล้อง</label><input className="w-full p-2.5 bg-gray-50 border rounded-xl" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400">ช่องทาง</label>
                  <select className="w-full p-2.5 bg-gray-50 border rounded-xl" value={editingCustomer.source} onChange={e => setEditingCustomer({...editingCustomer, source: e.target.value})}>
                    <option value="Line">Line</option><option value="Facebook">Facebook</option>
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-gray-400">ชื่อ ID ({editingCustomer.source})</label><input className="w-full p-2.5 bg-gray-50 border rounded-xl" value={editingCustomer.source_id} onChange={e => setEditingCustomer({...editingCustomer, source_id: e.target.value})} /></div>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
