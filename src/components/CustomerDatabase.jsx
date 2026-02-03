{/* --- Modal ดูประวัติการเข้าพัก --- */}
{historyModal && (
  <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
    <div className="bg-[#white] w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
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
            <div className="grid grid-cols-4 gap-4 items-start">
              
              {/* ส่วนวันที่เข้าพัก (ที่แก้ไข) */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A1887F] mb-1">วันที่เข้าพัก</span>
                <div className="flex items-start gap-2">
                   <Calendar size={14} className="text-[#885E43] mt-0.5 shrink-0" />
                   <span className="text-[13px] font-black text-[#372C2E] leading-relaxed">
                     {h.start_date} <span className="text-[#885E43] font-bold">ถึง</span> {h.end_date}
                   </span>
                </div>
              </div>

              {/* ประเภทห้อง */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A1887F] mb-1">ประเภทห้อง</span>
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[13px]">
                   <DoorOpen size={14}/> {h.room_type}
                </div>
              </div>

              {/* น้องแมว */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A1887F] mb-1">น้องแมว</span>
                <div className="flex items-center gap-1.5 text-[#DE9E48] font-bold text-[13px]">
                   <Cat size={14}/> {h.cat_names}
                </div>
              </div>

              {/* ค่าที่พัก */}
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-bold text-[#A1887F] mb-1">ค่าที่พัก</span>
                <div className="text-lg font-black text-[#885E43]">
                   ฿{h.total_price?.toLocaleString()}
                </div>
              </div>

            </div>

            {h.note && (
              <div className="mt-3 pt-3 border-t border-dashed border-gray-100 text-[11px] text-[#A1887F] flex gap-2">
                <FileText size={12} className="shrink-0"/> <span className="italic">หมายเหตุ: {h.note}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
