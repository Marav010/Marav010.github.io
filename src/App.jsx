import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingForm from './components/BookingForm';
import CalendarView from './components/CalendarView';
import HistoryTable from './components/HistoryTable';
import ReportSummary from './components/ReportSummary';
import CustomerDatabase from './components/CustomerDatabase'; 
// นำเข้า AlertCircle สำหรับแสดงไอคอนใน Modal
import { AlertCircle, X } from 'lucide-react'; 

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [preSelectedDate, setPreSelectedDate] = useState('');
  
  // สร้าง State สำหรับเก็บข้อความ Error เพื่อเปิด Modal
  const [loginError, setLoginError] = useState(null); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const handleDateClick = (date) => {
    setPreSelectedDate(date);
    setActiveTab('booking');
  };

  const handleSimpleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // แทนที่จะ alert() ปกติ เรามา set loginError แทน
      setLoginError("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F2F0] p-4 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#DE9E48] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#885E43] opacity-10 rounded-full blur-3xl"></div>

        <form onSubmit={handleSimpleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-[#DBD0C5] relative z-10">
          <div className="flex flex-col items-center mb-8">
             <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#C39A7A] mb-4 shadow-md">
                <img src="/Logo/JingJai-Cat-Hotel-final1.jpg" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <h1 className="text-xl font-black text-[#372C2E] uppercase tracking-tighter text-center">
                Jingjai Cat Hotel <br/>
                <span className="text-[#885E43] text-sm font-bold">ระบบจัดการโรงแรมแมวจริงใจ</span>
             </h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2 tracking-widest">Email Address</label>
              <input name="email" type="email" placeholder="ระบุอีเมลผู้ใช้งาน" required 
                className="w-full p-4 bg-[#FDFBFA] border-2 border-[#efebe9] rounded-2xl outline-none focus:border-[#885E43] transition-all font-medium text-[#372C2E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2 tracking-widest">Password</label>
              <input name="password" type="password" placeholder="••••••••" required 
                className="w-full p-4 bg-[#FDFBFA] border-2 border-[#efebe9] rounded-2xl outline-none focus:border-[#885E43] transition-all font-medium text-[#372C2E]" />
            </div>
            <button type="submit" 
              className="w-full bg-[#372C2E] text-white py-4 rounded-2xl font-black shadow-xl shadow-[#372C2E]/20 hover:bg-[#5D4037] transition-all active:scale-95 mt-2">
              เข้าสู่ระบบ
            </button>
          </div>
          <p className="text-center text-[#A1887F] text-[10px] mt-8 font-medium">© 2024 Jingjai Cat Hotel. All rights reserved.</p>
        </form>

        {/* --- สวนของ Login Error Modal (Alert สวยๆ) --- */}
        {loginError && (
          <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                  <AlertCircle size={40} />
                  {/* ปุ่มกากบาทมุมขวาบนของไอคอนเพื่อให้ปิดได้ง่าย */}
                  <button 
                    onClick={() => setLoginError(null)}
                    className="absolute -top-1 -right-1 bg-white text-gray-400 rounded-full p-1 shadow-md hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-[#372C2E] mb-2">เข้าสู่ระบบไม่สำเร็จ</h3>
                <p className="text-sm text-[#A1887F] font-medium leading-relaxed mb-8 px-4">
                  {loginError}
                </p>
                <button 
                  onClick={() => setLoginError(null)} 
                  className="w-full py-4 bg-[#372C2E] text-white rounded-2xl font-black shadow-lg shadow-[#372C2E]/20 hover:bg-[#5D4037] transition-all active:scale-95"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- หน้าหลักของระบบ (Return ตามเดิม) ---
  return (
    <div className="min-h-screen bg-[#F5F2F0]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-[3rem] shadow-xl shadow-[#372C2E]/5 border border-[#DBD0C5] p-4 md:p-10 min-h-[700px]">
          {activeTab === 'calendar' && <CalendarView onDateClick={handleDateClick} />}
          {activeTab === 'booking' && (
            <BookingForm 
              initialDate={preSelectedDate} 
              onSaved={() => {
                setPreSelectedDate('');
                setActiveTab('calendar');
              }} 
            />
          )}
          {activeTab === 'history' && <HistoryTable />}
          {activeTab === 'customers' && <CustomerDatabase />}
          {activeTab === 'report' && <ReportSummary />}
        </div>
      </main>
      <footer className="pb-8 text-center text-[#A1887F] text-xs font-bold uppercase tracking-widest opacity-50">
        Jingjai Cat Hotel — Management System
      </footer>
    </div>
  );
}

export default App;
