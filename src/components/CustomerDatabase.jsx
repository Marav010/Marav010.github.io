import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, Camera, Search, 
  Edit3, Trash2, X, Plus, Cat, Save, Facebook, Upload, Loader2
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', source_id: '', camera_id: '-', note: '-', customer_image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // --- ฟังก์ชันอัปโหลดรูปภาพ ---
  const handleFileUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // อัปโหลดไปที่ Bucket ชื่อ 'customer-images'
      let { error: uploadError } = await supabase.storage
        .from('customer-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ดึง URL ของรูปออกมา
      const { data: { publicUrl } } = supabase.storage
        .from('customer-images')
        .getPublicUrl(filePath);

      setEditingCustomer({ ...editingCustomer, customer_image: publicUrl });
    } catch (error) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name: name,
          phone: b.phone || '-',
          source: b.source || 'Line',
          source_id: b.source_id || '',
          stayCount: 0,
          totalSpent: 0,
          camera_id: b.camera_id || '-',
          image: b.customer_image || '',
          catNames: new Set(),
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
      return acc;
    }, {});
    return Object.values(stats).map(item => ({ ...item, catNames: Array.from(item.catNames).join(', ') }));
  }, [bookings]);

  const handleSave = async () => {
    if (!editingCustomer.name) return alert('กรุณาระบุชื่อลูกค้า');
    
    const payload = {
      customer_name: editingCustomer.name,
      phone: editingCustomer.phone,
      source: editingCustomer.source,
      source_id: editingCustomer.source_id,
      camera_id: editingCustomer.camera_id,
      customer_image: editingCustomer.customer_image
    };

    const { error } = modalMode === 'edit' 
      ? await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name)
      : await supabase.from('bookings').insert([{ ...payload, cat_names: 'ยังไม่มีข้อมูลแมว', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], room_type: 'สแตนดาร์ด' }]);

    if (!error) {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const filtered = customerStats.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg"><User size={28} /></div>
          <div><h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2><p className="text-xs text-[#A1887F] font-bold">จัดการรูปภาพและไอดีกล้อง</p></div>
        </div>
        <button onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', source_id: '', camera_id: '-', image: '' }); setIsModalOpen(true); }} className="bg-[#885E43] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg"><Plus size={18} /> เพิ่มลูกค้าใหม่</button>
      </div>

      {/* Search */}
      <div className="px-2"><div className="relative"><Search className="absolute left-4 top-3 text-[#A1887F]" size={18} /><input type="text" placeholder="ค้นหาชื่อลูกค้า..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#FDF8F5] border border-[#efebe9] flex-shrink-0">
                {customer.image ? <img src={customer.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={40}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="font-black text-[#372C2E] truncate">{customer.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCustomer({ ...customer, customer_image: customer.image }); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-1 rounded-md flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                  <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-md flex items-center gap-1"><MessageCircle size={10}/>{customer.source_id || customer.source}</span>
                </div>
                <div className="mt-2 text-xs font-black text-[#372C2E] flex items-center gap-1 bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">
                  <Camera size={14} className="text-[#885E43]" /> ไอดีกล้อง: {customer.camera_id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center"><h3 className="font-bold">ข้อมูลลูกค้า</h3><button onClick={() => setIsModalOpen(false)}><X size={20}/></button></div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* ส่วนอัปโหลดรูป */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-3xl border-2 border-dashed border-[#DBD0C5] overflow-hidden bg-gray-50 flex items-center justify-center relative group">
                  {editingCustomer.customer_image ? <img src={editingCustomer.customer_image} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-300" />}
                  {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-[#885E43]" /></div>}
                </div>
                <label className="cursor-pointer bg-[#FDF8F5] border border-[#885E43] text-[#885E43] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#885E43] hover:text-white transition-all flex items-center gap-2">
                  <Upload size={14} /> {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>

              <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ชื่อลูกค้า</label><input className="w-full p-3 bg-[#FDFBFA] border rounded-xl font-bold" disabled={modalMode === 'edit'} value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">เบอร์โทร</label><input className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</label><input className="w-full p-3 bg-[#FDFBFA] border border-[#DE9E48] rounded-xl font-bold text-[#885E43]" value={editingCustomer.camera_id} onChange={e => setEditingCustomer({...editingCustomer, camera_id: e.target.value})} /></div>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-2"><Save size={18}/> บันทึกข้อมูลลูกค้า</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
