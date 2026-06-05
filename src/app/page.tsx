"use client";
import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────
type Employee  = { id: string; name: string };
type TimeSlot  = { id: string; label: string; startTime: string; endTime: string };
type Shift     = {
  id: string; date: string; employeeId: string; employeeName: string;
  timeSlotId: string; timeSlotLabel: string; timeSlotStart: string; timeSlotEnd: string;
};

const CHIP_COLORS = ["chip-1","chip-2","chip-3","chip-4","chip-5","chip-6"];
function getChipColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % CHIP_COLORS.length;
  return CHIP_COLORS[h];
}

// ─── Icons ────────────────────────────────────────────────────
const Icon = {
  sun:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  moon:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  chevL:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
  chevR:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
  plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/></svg>,
  pencil:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  download:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  x:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  calendar:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  clock:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  lock:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  eye:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  ical:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
};

// ─── Shared helpers ───────────────────────────────────────────
function PasswordModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (pw === "9999") { onSuccess(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{ display:"flex", alignItems:"center", gap:8 }}><Icon.lock /> Manager Access</span>
          <button className="icon-btn" onClick={onCancel}><Icon.x /></button>
        </div>
        <div style={{ padding:"20px" }}>
          <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-2)" }}>Enter your manager password to continue.</p>
          <div style={{ position:"relative", marginBottom:14 }}>
            <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key==="Enter" && attempt()} placeholder="Password" autoFocus
              style={{ width:"100%", padding:"9px 38px 9px 12px", borderRadius:8,
                border:`1.5px solid ${err?"var(--danger)":"var(--border)"}`,
                background:err?"var(--danger-light)":"var(--surface2)",
                color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none",
                transition:"border-color 0.15s", boxSizing:"border-box" }} />
            <button onClick={() => setShow(!show)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-3)", display:"flex" }}>
              {show ? <Icon.eyeOff /> : <Icon.eye />}
            </button>
          </div>
          {err && <p style={{ margin:"0 0 12px", fontSize:12, color:"var(--danger)" }}>Incorrect password.</p>}
          <button onClick={attempt} style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared data hook ─────────────────────────────────────────
function useSchedulerData(currentMonth: Date) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots]  = useState<TimeSlot[]>([]);
  const [shifts, setShifts]        = useState<Shift[]>([]);
  const [loading, setLoading]      = useState(false);

  const fetchAll = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),   "yyyy-MM-dd");
    const [eR, sR, shR] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/timeslots"),
      fetch(`/api/shifts?start=${start}&end=${end}`),
    ]);
    setEmployees(await eR.json());
    setTimeSlots(await sR.json());
    setShifts(await shR.json());
  }, [currentMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEmployee    = async (name: string) => { setLoading(true); await fetch("/api/employees", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name}) }); await fetchAll(); setLoading(false); };
  const removeEmployee = async (id: string)   => { await fetch("/api/employees", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) }); await fetchAll(); };
  const saveSlot       = async (slot: Omit<TimeSlot,"id">, editId?: string) => {
    setLoading(true);
    if (editId) await fetch("/api/timeslots", { method:"PUT",    headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:editId,...slot}) });
    else        await fetch("/api/timeslots", { method:"POST",   headers:{"Content-Type":"application/json"}, body:JSON.stringify(slot) });
    await fetchAll(); setLoading(false);
  };
  const removeSlot     = async (id: string)   => { await fetch("/api/timeslots", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) }); await fetchAll(); };
  const addShift       = async (empIds: string[], date: string, slotId: string) => {
    setLoading(true);
    const slot = timeSlots.find(s => s.id === slotId);
    await Promise.all(empIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      return fetch("/api/shifts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ employeeId:empId, employeeName:emp?.name??"", date, timeSlotId:slotId, timeSlotLabel:slot?.label??"" }) });
    }));
    await fetchAll(); setLoading(false);
  };
  const updateShift    = async (id: string, empId: string, date: string, slotId: string) => {
    setLoading(true);
    const emp  = employees.find(e => e.id === empId);
    const slot = timeSlots.find(s => s.id === slotId);
    await fetch("/api/shifts", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, employeeId:empId, employeeName:emp?.name??"", date, timeSlotId:slotId, timeSlotLabel:slot?.label??"" }) });
    await fetchAll(); setLoading(false);
  };
  const deleteShift    = async (id: string)   => { await fetch("/api/shifts", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) }); await fetchAll(); };
  const shiftsForDay   = (day: Date) => shifts.filter(s => s.date === format(day,"yyyy-MM-dd"));

  return { employees, timeSlots, shifts, loading, fetchAll, addEmployee, removeEmployee, saveSlot, removeSlot, addShift, updateShift, deleteShift, shiftsForDay };
}

// ════════════════════════════════════════════════════════════════
// DESKTOP UI
// ════════════════════════════════════════════════════════════════
function DesktopApp({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [tab, setTab]               = useState<"calendar"|"employees"|"timeslots">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isManager, setIsManager]   = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [pendingAction, setPendingAction] = useState<(()=>void)|null>(null);

  const data = useSchedulerData(currentMonth);

  const [selectedDay, setSelectedDay]   = useState<Date|null>(null);
  const [selEmps, setSelEmps]           = useState<string[]>([]);
  const [selSlot, setSelSlot]           = useState("");
  const [editingShift, setEditingShift] = useState<Shift|null>(null);
  const [editEmp, setEditEmp]           = useState("");
  const [editSlot, setEditSlot]         = useState("");
  const [newEmpName, setNewEmpName]     = useState("");
  const [editingSlot, setEditingSlot]   = useState<TimeSlot|null>(null);
  const [newSlot, setNewSlot]           = useState({ label:"", startTime:"09:00", endTime:"17:00" });

  const requireManager = (action: ()=>void) => {
    if (isManager) { action(); return; }
    setPendingAction(() => action); setShowPw(true);
  };

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn:0 }),
    end:   endOfWeek(endOfMonth(currentMonth), { weekStartsOn:0 }),
  });

  const handleExportXLSX = async () => {
    const start = format(startOfMonth(currentMonth),"yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),"yyyy-MM-dd");
    const res   = await fetch(`/api/export?format=xlsx&start=${start}&end=${end}`);
    const { rows } = await res.json();
    const XLSX  = await import("xlsx");
    const ws    = XLSX.utils.aoa_to_sheet(rows);
    const wb    = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shifts");
    XLSX.writeFile(wb, `shifts-${format(currentMonth,"yyyy-MM")}.xlsx`);
  };
  const handleExportICal = () => {
    const start = format(startOfMonth(currentMonth),"yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),"yyyy-MM-dd");
    window.location.href = `/api/export?format=ical&start=${start}&end=${end}`;
  };

  const S = { padding:"5px 10px", borderRadius:20, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.1s" };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)" }}>
      {showPw && <PasswordModal onSuccess={() => { setIsManager(true); setShowPw(false); if(pendingAction){pendingAction();setPendingAction(null);} }} onCancel={() => { setShowPw(false); setPendingAction(null); }} />}

      {/* Edit shift modal */}
      {editingShift && (
        <div className="modal-backdrop" onClick={() => setEditingShift(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit Shift</span>
              <button className="icon-btn" onClick={() => setEditingShift(null)}><Icon.x /></button>
            </div>
            <div style={{ padding:"0 20px 20px" }}>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8 }}>Date: <strong>{editingShift.date}</strong></div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, fontWeight:500 }}>Employee</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                {data.employees.map(emp => (
                  <button key={emp.id} onClick={() => setEditEmp(emp.id)} style={{ ...S, border:`1.5px solid ${editEmp===emp.id?"var(--accent)":"var(--border)"}`, background:editEmp===emp.id?"var(--accent-light)":"var(--surface2)", color:editEmp===emp.id?"var(--accent)":"var(--text-2)" }}>{emp.name}</button>
                ))}
              </div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, fontWeight:500 }}>Time Slot</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
                {data.timeSlots.map(s => (
                  <button key={s.id} onClick={() => setEditSlot(s.id)} style={{ ...S, border:`1.5px solid ${editSlot===s.id?"var(--accent)":"var(--border)"}`, background:editSlot===s.id?"var(--accent-light)":"var(--surface2)", color:editSlot===s.id?"var(--accent)":"var(--text-2)" }}>
                    {s.label} <span style={{ opacity:0.7, fontSize:11, fontFamily:"monospace" }}>{s.startTime}–{s.endTime}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={async () => { await data.updateShift(editingShift.id, editEmp, editingShift.date, editSlot); setEditingShift(null); }}
                  disabled={data.loading||!editEmp||!editSlot}
                  style={{ flex:1, padding:"10px", borderRadius:9, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", opacity:(data.loading||!editEmp||!editSlot)?0.4:1, fontFamily:"inherit" }}>
                  {data.loading ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditingShift(null)} style={{ padding:"10px 16px", borderRadius:9, border:"1px solid var(--border)", background:"transparent", color:"var(--text-2)", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.3px" }}>Shift Scheduler</span>
          <nav style={{ display:"flex", gap:2 }}>
            {(["calendar","employees","timeslots"] as const).map(t => (
              <button key={t} onClick={() => { if(t!=="calendar") requireManager(()=>setTab(t)); else setTab(t); }}
                style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, background:tab===t?"var(--surface2)":"transparent", color:tab===t?"var(--text)":"var(--text-2)", fontFamily:"inherit" }}>
                {t==="calendar"?"Calendar":t==="employees"?"Employees":"Time Slots"}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {isManager && (
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:"var(--accent-light)", color:"var(--accent)", fontSize:11, fontWeight:600 }}>
              <Icon.unlock /> Manager
              <button onClick={() => { setIsManager(false); setTab("calendar"); }} style={{ marginLeft:4, background:"none", border:"none", cursor:"pointer", color:"var(--accent)", display:"flex", padding:0 }}><Icon.x /></button>
            </div>
          )}
          <button onClick={() => setDark(!dark)} style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}>
            {dark ? <Icon.sun /> : <Icon.moon />}
          </button>
        </div>
      </header>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px" }}>
        {/* Calendar */}
        {tab==="calendar" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button className="icon-btn" onClick={() => setCurrentMonth(subMonths(currentMonth,1))}><Icon.chevL /></button>
                <h2 style={{ margin:0, fontSize:18, fontWeight:600, letterSpacing:"-0.4px", minWidth:160, textAlign:"center" }}>{format(currentMonth,"MMMM yyyy")}</h2>
                <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth,1))}><Icon.chevR /></button>
                <button onClick={() => setCurrentMonth(new Date())} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-2)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Today</button>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={handleExportXLSX} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-2)", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}><Icon.download /> XLSX</button>
                <button onClick={handleExportICal} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-2)", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}><Icon.ical /> iCal</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:"var(--text-3)", padding:"6px 0", letterSpacing:"0.5px", textTransform:"uppercase" }}>{d}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:"var(--border)", borderRadius:12, overflow:"hidden" }}>
              {calDays.map(day => {
                const inMonth = isSameMonth(day,currentMonth);
                const isToday = isSameDay(day,today);
                const ds = data.shiftsForDay(day);
                return (
                  <div key={day.toString()} onClick={() => { if(inMonth) requireManager(()=>{ setSelectedDay(day); setSelEmps([]); setSelSlot(""); }); }}
                    style={{ background:"var(--surface)", minHeight:96, padding:"8px 8px 6px", cursor:inMonth?"pointer":"default", opacity:inMonth?1:0.35, transition:"background 0.1s" }}
                    onMouseEnter={e => { if(inMonth)(e.currentTarget as HTMLElement).style.background="var(--surface2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="var(--surface)"; }}
                  >
                    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:isToday?700:400, width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:isToday?"var(--accent)":"transparent", color:isToday?"#fff":inMonth?"var(--text)":"var(--text-3)" }}>{format(day,"d")}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {ds.slice(0,3).map(s => {
                        const cc = getChipColor(s.employeeName);
                        return (
                          <div key={s.id} onClick={e => { e.stopPropagation(); requireManager(()=>{ setEditingShift(s); setEditEmp(s.employeeId); setEditSlot(s.timeSlotId); }); }}
                            style={{ padding:"2px 5px", borderRadius:4, background:`var(--${cc})`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span style={{ fontSize:10.5, fontWeight:500, color:`var(--${cc}-text)`, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1 }}>{s.employeeName} · {s.timeSlotLabel}</span>
                          </div>
                        );
                      })}
                      {ds.length>3 && <div style={{ fontSize:10, color:"var(--text-3)", paddingLeft:2 }}>+{ds.length-3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Employees */}
        {tab==="employees" && (
          <div style={{ maxWidth:480 }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:600, letterSpacing:"-0.4px" }}>Employees</h2>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <input value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&data.addEmployee(newEmpName.trim()).then(()=>setNewEmpName(""))} placeholder="Employee name"
                style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              <button onClick={async()=>{await data.addEmployee(newEmpName.trim());setNewEmpName("");}} disabled={data.loading||!newEmpName.trim()}
                style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, opacity:(!newEmpName.trim()||data.loading)?0.5:1, fontFamily:"inherit" }}>
                <Icon.plus /> Add
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.employees.length===0 && <p style={{ color:"var(--text-3)", fontSize:13 }}>No employees yet.</p>}
              {data.employees.map(emp => {
                const cc = getChipColor(emp.name);
                return (
                  <div key={emp.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:`var(--${cc})`, color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{emp.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize:14, fontWeight:500 }}>{emp.name}</span>
                    </div>
                    <button onClick={() => data.removeEmployee(emp.id)} style={{ width:28, height:28, borderRadius:7, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)" }}><Icon.trash /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Slots */}
        {tab==="timeslots" && (
          <div style={{ maxWidth:540 }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:600, letterSpacing:"-0.4px" }}>Time Slots</h2>
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.5px" }}>{editingSlot?"Edit Slot":"New Slot"}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input value={newSlot.label} onChange={e=>setNewSlot({...newSlot,label:e.target.value})} placeholder="Label (e.g. Morning)" style={{ flex:"1 1 140px", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                <input type="time" value={newSlot.startTime} onChange={e=>setNewSlot({...newSlot,startTime:e.target.value})} style={{ flex:"0 0 110px", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                <input type="time" value={newSlot.endTime}   onChange={e=>setNewSlot({...newSlot,endTime:e.target.value})}   style={{ flex:"0 0 110px", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                <button onClick={async()=>{await data.saveSlot(newSlot,editingSlot?.id);setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00"});}} disabled={data.loading||!newSlot.label.trim()}
                  style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, opacity:(!newSlot.label.trim()||data.loading)?0.5:1, fontFamily:"inherit" }}>
                  <Icon.plus /> {editingSlot?"Save":"Add"}
                </button>
                {editingSlot && <button onClick={()=>{setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00"});}} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"transparent", color:"var(--text-2)", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.timeSlots.length===0 && <p style={{ color:"var(--text-3)", fontSize:13 }}>No time slots yet.</p>}
              {data.timeSlots.map(slot => (
                <div key={slot.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)" }}>
                  <div><div style={{ fontSize:14, fontWeight:600 }}>{slot.label}</div><div className="mono" style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>{slot.startTime} – {slot.endTime}</div></div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{setEditingSlot(slot);setNewSlot({label:slot.label,startTime:slot.startTime,endTime:slot.endTime});}} style={{ width:28, height:28, borderRadius:7, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.pencil /></button>
                    <button onClick={()=>data.removeSlot(slot.id)} style={{ width:28, height:28, borderRadius:7, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)" }}><Icon.trash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Day modal */}
      {selectedDay && (
        <div className="modal-backdrop" onClick={()=>setSelectedDay(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{format(selectedDay,"EEEE, MMMM d")}</span>
              <button className="icon-btn" onClick={()=>setSelectedDay(null)}><Icon.x /></button>
            </div>
            <div style={{ padding:"0 20px 20px" }}>
              {data.shiftsForDay(selectedDay).length>0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>Scheduled</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {data.shiftsForDay(selectedDay).map(s => {
                      const cc=getChipColor(s.employeeName);
                      return (
                        <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", borderRadius:8, background:`var(--${cc})` }}>
                          <div><span style={{ fontSize:13, fontWeight:600, color:`var(--${cc}-text)` }}>{s.employeeName}</span><span style={{ fontSize:12, color:`var(--${cc}-text)`, opacity:0.8, marginLeft:8 }}>{s.timeSlotLabel} · {s.timeSlotStart}–{s.timeSlotEnd}</span></div>
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={()=>{setSelectedDay(null);setEditingShift(s);setEditEmp(s.employeeId);setEditSlot(s.timeSlotId);}} style={{ width:24, height:24, borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center", opacity:0.8 }}><Icon.pencil /></button>
                            <button onClick={()=>data.deleteShift(s.id)} style={{ width:24, height:24, borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center", opacity:0.7 }}><Icon.trash /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Add Shift</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, fontWeight:500 }}>Employees</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {data.employees.map(emp => { const sel=selEmps.includes(emp.id); return (
                    <button key={emp.id} onClick={()=>setSelEmps(sel?selEmps.filter(i=>i!==emp.id):[...selEmps,emp.id])} style={{ ...S, border:`1.5px solid ${sel?"var(--accent)":"var(--border)"}`, background:sel?"var(--accent-light)":"var(--surface2)", color:sel?"var(--accent)":"var(--text-2)" }}>{emp.name}</button>
                  );})}
                  {data.employees.length===0 && <p style={{ fontSize:12, color:"var(--text-3)", margin:0 }}>Add employees first.</p>}
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:6, fontWeight:500 }}>Time Slot</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {data.timeSlots.map(s => (
                    <button key={s.id} onClick={()=>setSelSlot(s.id===selSlot?"":s.id)} style={{ ...S, border:`1.5px solid ${selSlot===s.id?"var(--accent)":"var(--border)"}`, background:selSlot===s.id?"var(--accent-light)":"var(--surface2)", color:selSlot===s.id?"var(--accent)":"var(--text-2)" }}>
                      {s.label} <span style={{ opacity:0.7, fontSize:11, fontFamily:"monospace" }}>{s.startTime}–{s.endTime}</span>
                    </button>
                  ))}
                  {data.timeSlots.length===0 && <p style={{ fontSize:12, color:"var(--text-3)", margin:0 }}>Add time slots first.</p>}
                </div>
              </div>
              <button onClick={async()=>{if(selectedDay){await data.addShift(selEmps,format(selectedDay,"yyyy-MM-dd"),selSlot);setSelEmps([]);setSelSlot("");setSelectedDay(null);}}}
                disabled={data.loading||selEmps.length===0||!selSlot}
                style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", opacity:(data.loading||selEmps.length===0||!selSlot)?0.4:1, fontFamily:"inherit" }}>
                {data.loading?"Saving…":`Add ${selEmps.length>1?selEmps.length+" Shifts":"Shift"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .icon-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-2);transition:background 0.1s;}
        .icon-btn:hover{background:var(--surface2);}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(2px);}
        .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15);}
        .modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:1px solid var(--border);}
        .modal-title{font-size:15px;font-weight:600;letter-spacing:-0.3px;}
        input:focus{border-color:var(--accent)!important;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px;}
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MOBILE UI
// ════════════════════════════════════════════════════════════════
function MobileApp({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [tab, setTab]               = useState<"calendar"|"employees"|"timeslots">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isManager, setIsManager]   = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [pendingAction, setPendingAction] = useState<(()=>void)|null>(null);

  const data = useSchedulerData(currentMonth);

  // bottom sheet state
  const [sheet, setSheet] = useState<"day"|"addShift"|"editShift"|"editSlot"|null>(null);
  const [selectedDay, setSelectedDay]   = useState<Date|null>(null);
  const [selEmps, setSelEmps]           = useState<string[]>([]);
  const [selSlot, setSelSlot]           = useState("");
  const [editingShift, setEditingShift] = useState<Shift|null>(null);
  const [editEmp, setEditEmp]           = useState("");
  const [editSlot, setEditSlot]         = useState("");
  const [newEmpName, setNewEmpName]     = useState("");
  const [editingSlot, setEditingSlot]   = useState<TimeSlot|null>(null);
  const [newSlot, setNewSlot]           = useState({ label:"", startTime:"09:00", endTime:"17:00" });

  const requireManager = (action: ()=>void) => {
    if (isManager) { action(); return; }
    setPendingAction(() => action); setShowPw(true);
  };

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn:0 }),
    end:   endOfWeek(endOfMonth(currentMonth), { weekStartsOn:0 }),
  });

  const closeSheet = () => setSheet(null);

  const btnStyle = (active: boolean) => ({
    padding:"8px 12px", borderRadius:20, fontSize:13, fontWeight:500 as const, cursor:"pointer" as const, fontFamily:"inherit",
    border:`1.5px solid ${active?"var(--accent)":"var(--border)"}`,
    background: active?"var(--accent-light)":"var(--surface2)",
    color: active?"var(--accent)":"var(--text-2)",
    transition:"all 0.1s",
  });

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", paddingBottom:72 }}>
      {showPw && <PasswordModal onSuccess={() => { setIsManager(true); setShowPw(false); if(pendingAction){pendingAction();setPendingAction(null);} }} onCancel={() => { setShowPw(false); setPendingAction(null); }} />}

      {/* Top bar */}
      <header style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52, position:"sticky", top:0, zIndex:50 }}>
        <span style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.3px" }}>
          {tab==="calendar" ? format(currentMonth,"MMMM yyyy") : tab==="employees" ? "Employees" : "Time Slots"}
        </span>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {isManager && (
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:20, background:"var(--accent-light)", color:"var(--accent)", fontSize:11, fontWeight:600 }}>
              <Icon.unlock /> Mgr
              <button onClick={() => { setIsManager(false); setTab("calendar"); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--accent)", display:"flex", padding:0, marginLeft:2 }}><Icon.x /></button>
            </div>
          )}
          <button onClick={() => setDark(!dark)} style={{ width:34, height:34, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}>
            {dark ? <Icon.sun /> : <Icon.moon />}
          </button>
        </div>
      </header>

      {/* ── CALENDAR ── */}
      {tab==="calendar" && (
        <div style={{ padding:"12px 12px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={()=>setCurrentMonth(subMonths(currentMonth,1))} style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.chevL /></button>
              <button onClick={()=>setCurrentMonth(addMonths(currentMonth,1))} style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.chevR /></button>
              <button onClick={()=>setCurrentMonth(new Date())} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-2)", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Today</button>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={async()=>{ const start=format(startOfMonth(currentMonth),"yyyy-MM-dd");const end=format(endOfMonth(currentMonth),"yyyy-MM-dd");const res=await fetch(`/api/export?format=xlsx&start=${start}&end=${end}`);const{rows}=await res.json();const XLSX=await import("xlsx");const ws=XLSX.utils.aoa_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Shifts");XLSX.writeFile(wb,`shifts-${format(currentMonth,"yyyy-MM")}.xlsx`); }}
                style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.download /></button>
              <button onClick={()=>{ const s=format(startOfMonth(currentMonth),"yyyy-MM-dd");const e=format(endOfMonth(currentMonth),"yyyy-MM-dd");window.location.href=`/api/export?format=ical&start=${s}&end=${e}`; }}
                style={{ width:32, height:32, borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.ical /></button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:3 }}>
            {["S","M","T","W","T","F","S"].map((d,i) => (
              <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"var(--text-3)", padding:"4px 0", textTransform:"uppercase" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="mobile-cal-grid">
            {calDays.map(day => {
              const inMonth = isSameMonth(day,currentMonth);
              const isToday = isSameDay(day,today);
              const ds = data.shiftsForDay(day);
              return (
                <div key={day.toString()} className={`mobile-cal-cell${inMonth?"":" out-of-month"}`}
                  onClick={() => { if(inMonth) requireManager(()=>{ setSelectedDay(day); setSelEmps([]); setSelSlot(""); setSheet("day"); }); }}>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:isToday?700:400, width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:isToday?"var(--accent)":"transparent", color:isToday?"#fff":"var(--text)" }}>{format(day,"d")}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:1, alignItems:"center" }}>
                    {ds.slice(0,2).map(s => {
                      const cc=getChipColor(s.employeeName);
                      return <div key={s.id} style={{ width:"80%", height:4, borderRadius:2, background:`var(--${cc}-text)`, opacity:0.7 }} />;
                    })}
                    {ds.length>2 && <div style={{ fontSize:8, color:"var(--text-3)" }}>+{ds.length-2}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upcoming shifts list */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10, paddingLeft:2 }}>This Month</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.shifts.length===0 && <p style={{ color:"var(--text-3)", fontSize:13, padding:"8px 0" }}>No shifts scheduled.</p>}
              {data.shifts.sort((a,b)=>a.date.localeCompare(b.date)).map(s => {
                const cc=getChipColor(s.employeeName);
                return (
                  <div key={s.id} onClick={() => requireManager(()=>{ setEditingShift(s); setEditEmp(s.employeeId); setEditSlot(s.timeSlotId); setSheet("editShift"); })}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border)" }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`var(--${cc})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:`var(--${cc}-text)` }}>{s.employeeName.charAt(0)}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.employeeName}</div>
                      <div style={{ fontSize:11, color:"var(--text-2)" }}>{s.date} · {s.timeSlotLabel} {s.timeSlotStart}–{s.timeSlotEnd}</div>
                    </div>
                    <div style={{ color:"var(--text-3)" }}><Icon.pencil /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEES ── */}
      {tab==="employees" && (
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <input value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&data.addEmployee(newEmpName.trim()).then(()=>setNewEmpName(""))}
              placeholder="Employee name" style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
            <button onClick={async()=>{await data.addEmployee(newEmpName.trim());setNewEmpName("");}} disabled={data.loading||!newEmpName.trim()}
              style={{ padding:"10px 14px", borderRadius:10, border:"none", background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, opacity:(!newEmpName.trim()||data.loading)?0.5:1, fontFamily:"inherit" }}>
              <Icon.plus /> Add
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.employees.length===0 && <p style={{ color:"var(--text-3)", fontSize:14 }}>No employees yet.</p>}
            {data.employees.map(emp => {
              const cc=getChipColor(emp.name);
              return (
                <div key={emp.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`var(--${cc})`, color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700 }}>{emp.name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontSize:15, fontWeight:500 }}>{emp.name}</span>
                  </div>
                  <button onClick={()=>data.removeEmployee(emp.id)} style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)" }}><Icon.trash /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TIME SLOTS ── */}
      {tab==="timeslots" && (
        <div style={{ padding:"16px 16px 0" }}>
          <button onClick={()=>{ setEditingSlot(null); setNewSlot({label:"",startTime:"09:00",endTime:"17:00"}); setSheet("editSlot"); }}
            style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit", marginBottom:16 }}>
            <Icon.plus /> New Time Slot
          </button>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.timeSlots.length===0 && <p style={{ color:"var(--text-3)", fontSize:14 }}>No time slots yet.</p>}
            {data.timeSlots.map(slot => (
              <div key={slot.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)" }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600 }}>{slot.label}</div>
                  <div className="mono" style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>{slot.startTime} – {slot.endTime}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setEditingSlot(slot); setNewSlot({label:slot.label,startTime:slot.startTime,endTime:slot.endTime}); setSheet("editSlot"); }}
                    style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}><Icon.pencil /></button>
                  <button onClick={()=>data.removeSlot(slot.id)} style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)" }}><Icon.trash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom navigation ── */}
      <nav className="mobile-nav">
        {([
          { key:"calendar", label:"Schedule", icon:<Icon.calendar /> },
          { key:"employees", label:"Employees", icon:<Icon.users /> },
          { key:"timeslots", label:"Time Slots", icon:<Icon.clock /> },
        ] as const).map(({ key, label, icon }) => (
          <button key={key} className={`mobile-nav-btn${tab===key?" active":""}`}
            onClick={() => { if(key!=="calendar") requireManager(()=>setTab(key)); else setTab(key); }}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Day bottom sheet ── */}
      {sheet==="day" && selectedDay && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <div style={{ padding:"4px 16px 16px" }}>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.3px", marginBottom:14 }}>{format(selectedDay,"EEEE, MMMM d")}</div>

              {data.shiftsForDay(selectedDay).length>0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>Scheduled</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {data.shiftsForDay(selectedDay).map(s => {
                      const cc=getChipColor(s.employeeName);
                      return (
                        <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:10, background:`var(--${cc})` }}>
                          <div>
                            <span style={{ fontSize:14, fontWeight:600, color:`var(--${cc}-text)` }}>{s.employeeName}</span>
                            <span style={{ fontSize:12, color:`var(--${cc}-text)`, opacity:0.8, marginLeft:8 }}>{s.timeSlotLabel} · {s.timeSlotStart}–{s.timeSlotEnd}</span>
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>{ closeSheet(); setEditingShift(s); setEditEmp(s.employeeId); setEditSlot(s.timeSlotId); setSheet("editShift"); }}
                              style={{ width:28, height:28, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon.pencil /></button>
                            <button onClick={()=>data.deleteShift(s.id)} style={{ width:28, height:28, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", color:`var(--${cc}-text)`, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon.trash /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Add Shift</div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8, fontWeight:500 }}>Employees</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {data.employees.map(emp => { const sel=selEmps.includes(emp.id); return (
                    <button key={emp.id} onClick={()=>setSelEmps(sel?selEmps.filter(i=>i!==emp.id):[...selEmps,emp.id])} style={btnStyle(sel)}>{emp.name}</button>
                  );})}
                  {data.employees.length===0 && <p style={{ fontSize:13, color:"var(--text-3)", margin:0 }}>Add employees first.</p>}
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8, fontWeight:500 }}>Time Slot</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {data.timeSlots.map(s => (
                    <button key={s.id} onClick={()=>setSelSlot(s.id===selSlot?"":s.id)} style={btnStyle(selSlot===s.id)}>
                      {s.label} <span style={{ opacity:0.7, fontSize:11, fontFamily:"monospace" }}>{s.startTime}–{s.endTime}</span>
                    </button>
                  ))}
                  {data.timeSlots.length===0 && <p style={{ fontSize:13, color:"var(--text-3)", margin:0 }}>Add time slots first.</p>}
                </div>
              </div>
              <button onClick={async()=>{ if(selectedDay){await data.addShift(selEmps,format(selectedDay,"yyyy-MM-dd"),selSlot);setSelEmps([]);setSelSlot("");closeSheet();} }}
                disabled={data.loading||selEmps.length===0||!selSlot}
                style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:(data.loading||selEmps.length===0||!selSlot)?0.4:1, fontFamily:"inherit" }}>
                {data.loading?"Saving…":`Add ${selEmps.length>1?selEmps.length+" Shifts":"Shift"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit shift sheet ── */}
      {sheet==="editShift" && editingShift && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <div style={{ padding:"4px 16px 16px" }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Edit Shift</div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:14 }}>Date: <strong style={{ color:"var(--text)" }}>{editingShift.date}</strong></div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8, fontWeight:500 }}>Employee</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                {data.employees.map(emp => (
                  <button key={emp.id} onClick={()=>setEditEmp(emp.id)} style={btnStyle(editEmp===emp.id)}>{emp.name}</button>
                ))}
              </div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8, fontWeight:500 }}>Time Slot</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {data.timeSlots.map(s => (
                  <button key={s.id} onClick={()=>setEditSlot(s.id)} style={btnStyle(editSlot===s.id)}>
                    {s.label} <span style={{ opacity:0.7, fontSize:11, fontFamily:"monospace" }}>{s.startTime}–{s.endTime}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={async()=>{ await data.updateShift(editingShift.id,editEmp,editingShift.date,editSlot); closeSheet(); }}
                  disabled={data.loading||!editEmp||!editSlot}
                  style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:(data.loading||!editEmp||!editSlot)?0.4:1, fontFamily:"inherit" }}>
                  {data.loading?"Saving…":"Save Changes"}
                </button>
                <button onClick={async()=>{ await data.deleteShift(editingShift.id); closeSheet(); }}
                  style={{ padding:"13px 16px", borderRadius:12, border:"1px solid var(--danger)", background:"var(--danger-light)", color:"var(--danger)", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit/add slot sheet ── */}
      {sheet==="editSlot" && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <div style={{ padding:"4px 16px 16px" }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>{editingSlot?"Edit Time Slot":"New Time Slot"}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
                <input value={newSlot.label} onChange={e=>setNewSlot({...newSlot,label:e.target.value})} placeholder="Label (e.g. Morning)"
                  style={{ padding:"12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Start</div>
                    <input type="time" value={newSlot.startTime} onChange={e=>setNewSlot({...newSlot,startTime:e.target.value})}
                      style={{ width:"100%", padding:"12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>End</div>
                    <input type="time" value={newSlot.endTime} onChange={e=>setNewSlot({...newSlot,endTime:e.target.value})}
                      style={{ width:"100%", padding:"12px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
                  </div>
                </div>
              </div>
              <button onClick={async()=>{ await data.saveSlot(newSlot,editingSlot?.id); setEditingSlot(null); setNewSlot({label:"",startTime:"09:00",endTime:"17:00"}); closeSheet(); }}
                disabled={data.loading||!newSlot.label.trim()}
                style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:"var(--accent)", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:(data.loading||!newSlot.label.trim())?0.4:1, fontFamily:"inherit" }}>
                {data.loading?"Saving…":editingSlot?"Save Changes":"Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT — detects mobile vs desktop, persists dark mode
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark]       = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Restore dark mode from localStorage
    const saved = localStorage.getItem("shift-dark-mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved !== null ? saved === "true" : prefersDark;
    setDark(shouldBeDark);

    // Detect mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    setMounted(true);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSetDark = (v: boolean) => {
    setDark(v);
    localStorage.setItem("shift-dark-mode", String(v));
    document.documentElement.classList.toggle("dark", v);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Prevent flash of wrong theme before mount
  if (!mounted) return null;

  return isMobile
    ? <MobileApp dark={dark} setDark={handleSetDark} />
    : <DesktopApp dark={dark} setDark={handleSetDark} />;
}
