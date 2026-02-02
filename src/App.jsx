import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingForm from './components/BookingForm';
import CalendarView from './components/CalendarView';
import HistoryTable from './components/HistoryTable';
import ReportSummary from './components/ReportSummary';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [preSelectedDate, setPreSelectedDate] = useState('');

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
    if (error) alert("❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง: " + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- หน้า Login สไตล์พรีเมียม ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F2F0] p-4 relative overflow-hidden">
        {/* ตกแต่งพื้นหลังเล็กน้อย */}
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
      </div>
    );
  }

  // --- หน้าหลักของระบบ ---
  return (
    <div className="min-h-screen bg-[#F5F2F0]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-[3rem] shadow-xl shadow-[#372C2E]/5 border border-[#DBD0C5] p-4 md:p-10 min-h-[700px]">
          {activeTab === 'calendar' && (
            <CalendarView onDateClick={handleDateClick} />
          )}
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
          {activeTab === 'report' && <ReportSummary />}
        </div>
      </main>

      {/* Footer เล็กๆ เพื่อความสวยงาม */}
      <footer className="pb-8 text-center text-[#A1887F] text-xs font-bold uppercase tracking-widest opacity-50">
        Jingjai Cat Hotel — Premium Management System
      </footer>
    </div>
  );
}

export default App;
