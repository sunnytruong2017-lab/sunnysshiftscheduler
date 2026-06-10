"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek,
  endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────
type Employee = { id: string; name: string };
type TimeSlot = { id: string; label: string; startTime: string; endTime: string; color: string };
type Shift    = {
  id: string; date: string; employeeId: string; employeeName: string;
  timeSlotId: string; timeSlotLabel: string; timeSlotStart: string; timeSlotEnd: string;
  timeSlotColor: string; role: "Server" | "Cook";
};
type ViewMode = "month" | "week";

const ROLES = ["Server", "Cook"] as const;

const PRESET_COLORS = [
  { name: "Red",    value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber",  value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime",   value: "#84cc16" },
  { name: "Green",  value: "#22c55e" },
  { name: "Teal",   value: "#14b8a6" },
  { name: "Cyan",   value: "#06b6d4" },
  { name: "Blue",   value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink",   value: "#ec4899" },
  { name: "Rose",   value: "#f43f5e" },
];

// Color picker component — presets + optional custom
function ColorPicker({ value, onChange }: { value: string; onChange: (c:string)=>void }) {
  const [showCustom, setShowCustom] = useState(false);
  const isPreset = PRESET_COLORS.some(c=>c.value===value);
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
        {PRESET_COLORS.map(c=>(
          <button key={c.value} title={c.name} onClick={()=>onChange(c.value)} style={{
            width:26,height:26,borderRadius:"50%",background:c.value,border:`2.5px solid ${value===c.value?"var(--text)":"transparent"}`,
            cursor:"pointer",padding:0,transition:"border-color 0.1s",flexShrink:0,
          }}/>
        ))}
        <button onClick={()=>setShowCustom(v=>!v)} title="Custom color" style={{
          width:26,height:26,borderRadius:"50%",border:`2px dashed ${showCustom||!isPreset?"var(--text-2)":"var(--border)"}`,
          background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
          cursor:"pointer",padding:0,flexShrink:0,opacity:0.8,
        }}/>
      </div>
      {(showCustom||!isPreset) && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
          <input type="color" value={value} onChange={e=>onChange(e.target.value)}
            style={{width:36,height:32,borderRadius:8,border:"1px solid var(--border)",background:"none",cursor:"pointer",padding:2}}/>
          <span style={{fontSize:12,color:"var(--text-2)",fontFamily:"monospace"}}>{value}</span>
        </div>
      )}
    </div>
  );
}

// hex → rgba helper for tinted backgrounds
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Icons ────────────────────────────────────────────────────
const Icon = {
  sun:      ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>,
  moon:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  chevL:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
  chevR:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
  plus:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/></svg>,
  pencil:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  download: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  x:        ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  calendar: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users:    ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  clock:    ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  lock:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  eye:      ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  grid:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  list:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  ical:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
};

// ─── Password modal ───────────────────────────────────────────
function PasswordModal({ onSuccess, onCancel }: { onSuccess: ()=>void; onCancel: ()=>void }) {
  const [pw, setPw]   = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (pw === "9999") { onSuccess(); }
    else { setErr(true); setPw(""); setTimeout(()=>setErr(false), 1500); }
  };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" style={{maxWidth:340}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}><Icon.lock/> Manager Access</span>
          <button className="icon-btn" onClick={onCancel}><Icon.x/></button>
        </div>
        <div style={{padding:"20px"}}>
          <p style={{margin:"0 0 14px",fontSize:13,color:"var(--text-2)"}}>Enter your manager password to continue.</p>
          <div style={{position:"relative",marginBottom:14}}>
            <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Password" autoFocus
              style={{width:"100%",padding:"9px 38px 9px 12px",borderRadius:8,
                border:`1.5px solid ${err?"var(--danger)":"var(--border)"}`,
                background:err?"var(--danger-light)":"var(--surface2)",
                color:"var(--text)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text-3)",display:"flex"}}>
              {show?<Icon.eyeOff/>:<Icon.eye/>}
            </button>
          </div>
          {err && <p style={{margin:"0 0 12px",fontSize:12,color:"var(--danger)"}}>Incorrect password.</p>}
          <button onClick={attempt} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared data hook — optimistic updates ───────────────────
function useSchedulerData(startDate: string, endDate: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [shifts,    setShifts]    = useState<Shift[]>([]);
  const [loading,   setLoading]   = useState(false);

  const fetchAll = useCallback(async () => {
    const [eR, sR, shR] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/timeslots"),
      fetch(`/api/shifts?start=${startDate}&end=${endDate}`),
    ]);
    const [emps, slots, shs] = await Promise.all([eR.json(), sR.json(), shR.json()]);
    setEmployees(emps);
    setTimeSlots(slots);
    setShifts(sortShifts(shs, slots));
  }, [startDate, endDate]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  // Sort by timeSlotStart ascending
  function sortShifts(shs: Shift[], slots: TimeSlot[]) {
    return [...shs].sort((a,b)=>{
      const ta = a.timeSlotStart || slots.find(s=>s.id===a.timeSlotId)?.startTime || "00:00";
      const tb = b.timeSlotStart || slots.find(s=>s.id===b.timeSlotId)?.startTime || "00:00";
      return ta.localeCompare(tb);
    });
  }

  const tempId = () => `temp-${Math.random().toString(36).slice(2)}`;

  const addEmployee = async (name: string) => {
    setLoading(true);
    await fetch("/api/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    await fetchAll(); setLoading(false);
  };
  const removeEmployee = async (id: string) => {
    setEmployees(es=>es.filter(e=>e.id!==id));
    await fetch("/api/employees",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await fetchAll();
  };

  const saveSlot = async (slot: Omit<TimeSlot,"id">, editId?: string) => {
    setLoading(true);
    if (editId) {
      setTimeSlots(ts=>ts.map(t=>t.id===editId?{...t,...slot}:t));
      await fetch("/api/timeslots",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editId,...slot})});
    } else {
      await fetch("/api/timeslots",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(slot)});
    }
    await fetchAll(); setLoading(false);
  };
  const removeSlot = async (id: string) => {
    setTimeSlots(ts=>ts.filter(t=>t.id!==id));
    await fetch("/api/timeslots",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await fetchAll();
  };

  const addShifts = async (empIds: string[], date: string, slotId: string, role: string) => {
    setLoading(true);
    const slot = timeSlots.find(s=>s.id===slotId);
    // Optimistic: add temp shifts immediately
    const tempShifts: Shift[] = empIds.map(empId => {
      const emp = employees.find(e=>e.id===empId);
      return {
        id: tempId(), date, employeeId: empId, employeeName: emp?.name??"",
        timeSlotId: slotId, timeSlotLabel: slot?.label??"", timeSlotStart: slot?.startTime??"",
        timeSlotEnd: slot?.endTime??"", timeSlotColor: slot?.color??"#6366f1", role: role as "Server"|"Cook",
      };
    });
    setShifts(ss=>sortShifts([...ss,...tempShifts], timeSlots));
    await Promise.all(empIds.map(empId => {
      const emp = employees.find(e=>e.id===empId);
      return fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({employeeId:empId,employeeName:emp?.name??"",date,timeSlotId:slotId,timeSlotLabel:slot?.label??"",role})});
    }));
    await fetchAll(); setLoading(false);
  };

  const updateShift = async (id: string, empId: string, date: string, slotId: string, role: string) => {
    setLoading(true);
    const emp  = employees.find(e=>e.id===empId);
    const slot = timeSlots.find(s=>s.id===slotId);
    // Optimistic update
    setShifts(ss=>sortShifts(ss.map(s=>s.id===id?{...s,employeeId:empId,employeeName:emp?.name??s.employeeName,
      timeSlotId:slotId,timeSlotLabel:slot?.label??s.timeSlotLabel,timeSlotStart:slot?.startTime??s.timeSlotStart,
      timeSlotEnd:slot?.endTime??s.timeSlotEnd,timeSlotColor:slot?.color??s.timeSlotColor,role:role as "Server"|"Cook"}:s), timeSlots));
    await fetch("/api/shifts",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id,employeeId:empId,employeeName:emp?.name??"",date,timeSlotId:slotId,timeSlotLabel:slot?.label??"",role})});
    await fetchAll(); setLoading(false);
  };

  const deleteShift = async (id: string) => {
    setShifts(ss=>ss.filter(s=>s.id!==id)); // optimistic remove
    await fetch("/api/shifts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await fetchAll();
  };

  const shiftsForDay = (day: Date) => shifts.filter(s=>s.date===format(day,"yyyy-MM-dd"));

  return { employees, timeSlots, shifts, loading, fetchAll, addEmployee, removeEmployee, saveSlot, removeSlot, addShifts, updateShift, deleteShift, shiftsForDay };
}

// ─── Role column inside a day cell (used in side-by-side layout) ─
function RoleColumn({ label, shifts, compact }: { label: string; shifts: Shift[]; compact?: boolean }) {
  const h = compact ? 18 : 22;
  const displayed = compact ? shifts.slice(0,2) : shifts; // week cells show all
  return (
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:1,padding:"0 2px"}}>
      <div style={{fontSize:8,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>{label}</div>
      {displayed.length===0
        ? <div style={{height:compact?10:12}}/>
        : displayed.map(s=>(
            <div key={s.id} style={{
              height:h, lineHeight:`${h}px`, padding:"0 3px", borderRadius:3,
              background: hexToRgba(s.timeSlotColor, 0.18),
              borderLeft:`3px solid ${s.timeSlotColor}`,
              fontSize:9, fontWeight:600, color:"var(--text)",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            }}>
              {s.employeeName}
            </div>
          ))
      }
      {compact && shifts.length > 2 && <div style={{fontSize:8,color:"var(--text-3)"}}>{`+${shifts.length-2}`}</div>}
    </div>
  );
}

// ─── Two-column Server|Cook row for a cell ────────────────────
function RoleSplit({ servers, cooks, compact }: { servers: Shift[]; cooks: Shift[]; compact?: boolean }) {
  return (
    <div style={{display:"flex",flex:1,minWidth:0,gap:0,marginTop:2}}>
      <RoleColumn label="Server" shifts={servers} compact={compact}/>
      <div style={{width:1,background:"var(--border)",flexShrink:0,alignSelf:"stretch"}}/>
      <RoleColumn label="Cook" shifts={cooks} compact={compact}/>
    </div>
  );
}

// ─── Day detail panel (read-only summary) ─────────────────────
function DayDetail({
  day, shifts, isManager, onCreateShift, onEditShift, onDeleteShift, onClose,
}: {
  day: Date; shifts: Shift[]; isManager: boolean;
  onCreateShift: ()=>void; onEditShift: (s:Shift)=>void; onDeleteShift: (id:string)=>void; onClose: ()=>void;
}) {
  const servers = shifts.filter(s=>s.role==="Server");
  const cooks   = shifts.filter(s=>s.role==="Cook");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:"-0.4px"}}>{format(day,"EEEE")}</div>
          <div style={{fontSize:13,color:"var(--text-2)"}}>{format(day,"MMMM d, yyyy")}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={onCreateShift} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            <Icon.plus/> Create Shift
          </button>
          <button className="icon-btn" onClick={onClose}><Icon.x/></button>
        </div>
      </div>

      {shifts.length===0 && (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",fontSize:13}}>No shifts scheduled</div>
      )}

      {(["Server","Cook"] as const).map(role=>{
        const roleShifts = shifts.filter(s=>s.role===role);
        if (roleShifts.length===0) return null;
        return (
          <div key={role} style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:8}}>{role}s</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {roleShifts.map(s=>(
                <div key={s.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 12px",borderRadius:10,
                  background:hexToRgba(s.timeSlotColor,0.12),
                  borderLeft:`4px solid ${s.timeSlotColor}`,
                }}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{s.employeeName}</div>
                    <div style={{fontSize:12,color:"var(--text-2)",marginTop:1}}>
                      <span style={{
                        display:"inline-block",padding:"1px 7px",borderRadius:20,fontSize:11,fontWeight:600,
                        background:hexToRgba(s.timeSlotColor,0.2),color:s.timeSlotColor,marginRight:6,
                      }}>{s.timeSlotLabel}</span>
                      {s.timeSlotStart}–{s.timeSlotEnd}
                    </div>
                  </div>
                  {isManager && (
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>onEditShift(s)} style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}><Icon.pencil/></button>
                      <button onClick={()=>onDeleteShift(s.id)} style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shift form (create / edit) ───────────────────────────────
function ShiftForm({
  employees, timeSlots, loading, initialShift, date,
  onSave, onCancel,
}: {
  employees: Employee[]; timeSlots: TimeSlot[]; loading: boolean;
  initialShift?: Shift; date: string;
  onSave: (empIds:string[], slotId:string, role:string)=>void;
  onCancel: ()=>void;
}) {
  const [selEmps, setSelEmps] = useState<string[]>(initialShift?[initialShift.employeeId]:[]);
  const [selSlot, setSelSlot] = useState(initialShift?.timeSlotId??"");
  const [selRole, setSelRole] = useState<string>(initialShift?.role??"Server");
  const S = (active:boolean)=>({padding:"7px 12px",borderRadius:20,fontSize:12,fontWeight:500 as const,cursor:"pointer" as const,fontFamily:"inherit",border:`1.5px solid ${active?"var(--accent)":"var(--border)"}`,background:active?"var(--accent-light)":"var(--surface2)",color:active?"var(--accent)":"var(--text-2)",transition:"all 0.1s"});
  return (
    <div>
      <div style={{fontSize:12,color:"var(--text-2)",marginBottom:6,fontWeight:600}}>Date: <span style={{color:"var(--text)"}}>{date}</span></div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Role</div>
        <div style={{display:"flex",gap:8}}>
          {ROLES.map(r=>(
            <button key={r} onClick={()=>setSelRole(r)} style={S(selRole===r)}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>
          {initialShift?"Employee":"Employees"}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {employees.map(emp=>{
            const sel = selEmps.includes(emp.id);
            const toggle = () => {
              if (initialShift) { setSelEmps([emp.id]); return; }
              setSelEmps(sel?selEmps.filter(i=>i!==emp.id):[...selEmps,emp.id]);
            };
            return <button key={emp.id} onClick={toggle} style={S(sel)}>{emp.name}</button>;
          })}
          {employees.length===0 && <p style={{fontSize:12,color:"var(--text-3)",margin:0}}>Add employees first.</p>}
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Time Slot</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {timeSlots.map(s=>(
            <button key={s.id} onClick={()=>setSelSlot(s.id===selSlot?"":s.id)} style={{
              ...S(selSlot===s.id),
              borderColor: selSlot===s.id ? s.color : "var(--border)",
              background: selSlot===s.id ? hexToRgba(s.color,0.15) : "var(--surface2)",
              color: selSlot===s.id ? s.color : "var(--text-2)",
            }}>
              <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:s.color,marginRight:5,verticalAlign:"middle"}}/>
              {s.label} <span style={{opacity:0.7,fontSize:11,fontFamily:"monospace"}}>{s.startTime}–{s.endTime}</span>
            </button>
          ))}
          {timeSlots.length===0 && <p style={{fontSize:12,color:"var(--text-3)",margin:0}}>Add time slots first.</p>}
        </div>
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(selEmps,selSlot,selRole)} disabled={loading||selEmps.length===0||!selSlot}
          style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(loading||selEmps.length===0||!selSlot)?0.4:1,fontFamily:"inherit"}}>
          {loading?"Saving…":initialShift?"Save Changes":`Add ${selEmps.length>1?selEmps.length+" Shifts":"Shift"}`}
        </button>
        <button onClick={onCancel} style={{padding:"10px 16px",borderRadius:9,border:"1px solid var(--border)",background:"transparent",color:"var(--text-2)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Calendar header nav ──────────────────────────────────────
function CalNav({ label, onPrev, onNext, onToday, viewMode, setViewMode, onExportXLSX, onExportICal, isMobile }:
  { label:string; onPrev:()=>void; onNext:()=>void; onToday:()=>void; viewMode:ViewMode; setViewMode:(v:ViewMode)=>void; onExportXLSX:()=>void; onExportICal:()=>void; isMobile:boolean }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button className="icon-btn" onClick={onPrev}><Icon.chevL/></button>
        <span style={{fontSize:isMobile?15:18,fontWeight:700,letterSpacing:"-0.4px",minWidth:isMobile?130:170,textAlign:"center"}}>{label}</span>
        <button className="icon-btn" onClick={onNext}><Icon.chevR/></button>
        <button onClick={onToday} style={{padding:"4px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-2)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Today</button>
      </div>
      <div style={{display:"flex",gap:6}}>
        <div style={{display:"flex",borderRadius:8,border:"1px solid var(--border)",overflow:"hidden"}}>
          {(["month","week"] as ViewMode[]).map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{padding:"5px 10px",border:"none",background:viewMode===v?"var(--accent)":"var(--surface)",color:viewMode===v?"#fff":"var(--text-2)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {v==="month"?<span style={{display:"flex",alignItems:"center",gap:4}}><Icon.grid/>{!isMobile&&" Month"}</span>:<span style={{display:"flex",alignItems:"center",gap:4}}><Icon.list/>{!isMobile&&" Week"}</span>}
            </button>
          ))}
        </div>
        <button onClick={onExportXLSX} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Export XLSX"><Icon.download/></button>
        <button onClick={onExportICal} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Export iCal"><Icon.ical/></button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DESKTOP APP
// ════════════════════════════════════════════════════════════════
function DesktopApp({ dark, setDark }: { dark:boolean; setDark:(v:boolean)=>void }) {
  const [tab,        setTab]        = useState<"calendar"|"employees"|"timeslots">("calendar");
  const [viewMode,   setViewMode]   = useState<ViewMode>("month");
  const [anchor,     setAnchor]     = useState(new Date()); // month or week anchor
  const [isManager,  setIsManager]  = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [pending,    setPending]    = useState<(()=>void)|null>(null);

  // panel state
  const [selectedDay,   setSelectedDay]   = useState<Date|null>(null);
  const [panelMode,     setPanelMode]     = useState<"detail"|"create"|"edit">("detail");
  const [editingShift,  setEditingShift]  = useState<Shift|null>(null);

  // employees/slots form
  const [newEmpName,   setNewEmpName]   = useState("");
  const [editingSlot,  setEditingSlot]  = useState<TimeSlot|null>(null);
  const [newSlot,      setNewSlot]      = useState({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});

  const rangeStart = viewMode==="month"
    ? format(startOfMonth(anchor),"yyyy-MM-dd")
    : format(startOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");
  const rangeEnd = viewMode==="month"
    ? format(endOfMonth(anchor),"yyyy-MM-dd")
    : format(endOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");

  const data = useSchedulerData(rangeStart, rangeEnd);

  const requireManager = (action:()=>void) => {
    if (isManager) { action(); return; }
    setPending(()=>action); setShowPw(true);
  };

  const today = new Date();

  // Calendar days
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor),{weekStartsOn:1}),
    end:   endOfWeek(endOfMonth(anchor),{weekStartsOn:1}),
  });
  const weekDays = eachDayOfInterval({
    start: startOfWeek(anchor,{weekStartsOn:1}),
    end:   endOfWeek(anchor,{weekStartsOn:1}),
  });

  const nav = {
    prev:    ()=>setAnchor(a=>viewMode==="month"?subMonths(a,1):subWeeks(a,1)),
    next:    ()=>setAnchor(a=>viewMode==="month"?addMonths(a,1):addWeeks(a,1)),
    today:   ()=>setAnchor(new Date()),
    label:   viewMode==="month" ? format(anchor,"MMMM yyyy") : `${format(startOfWeek(anchor,{weekStartsOn:1}),"MMM d")} – ${format(endOfWeek(anchor,{weekStartsOn:1}),"MMM d, yyyy")}`,
  };

  const exportXLSX = async () => {
    const res = await fetch(`/api/export?format=xlsx&start=${rangeStart}&end=${rangeEnd}`);
    const { rows } = await res.json();
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Shifts");
    XLSX.writeFile(wb,`shifts-${rangeStart}.xlsx`);
  };
  const exportICal = () => { window.location.href=`/api/export?format=ical&start=${rangeStart}&end=${rangeEnd}`; };

  const openDay = (day:Date) => {
    setSelectedDay(day);
    setPanelMode("detail");
    setEditingShift(null);
  };

  // Monthly grid cell
  const MonthCell = ({ day }: { day:Date }) => {
    const inMonth = isSameMonth(day,anchor);
    const isToday = isSameDay(day,today);
    const ds = data.shiftsForDay(day);
    const servers = ds.filter(s=>s.role==="Server");
    const cooks   = ds.filter(s=>s.role==="Cook");
    return (
      <div onClick={()=>{ if(inMonth){ openDay(day); } }}
        style={{background:selectedDay&&isSameDay(day,selectedDay)?"var(--surface2)":"var(--surface)",
          minHeight:110,padding:"6px 5px 4px",cursor:inMonth?"pointer":"default",opacity:inMonth?1:0.3,
          transition:"background 0.1s",display:"flex",flexDirection:"column",gap:2}}
        onMouseEnter={e=>{if(inMonth)(e.currentTarget as HTMLElement).style.background="var(--surface2)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=selectedDay&&isSameDay(day,selectedDay)?"var(--surface2)":"var(--surface)";}}
      >
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}>
          <span style={{fontSize:11,fontWeight:isToday?700:400,width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)"}}>{format(day,"d")}</span>
        </div>
        <RoleSplit servers={servers} cooks={cooks} compact/>
      </div>
    );
  };

  // Weekly grid cell
  const WeekCell = ({ day }: { day:Date }) => {
    const isToday = isSameDay(day,today);
    const ds = data.shiftsForDay(day);
    const servers = ds.filter(s=>s.role==="Server");
    const cooks   = ds.filter(s=>s.role==="Cook");
    return (
      <div onClick={()=>openDay(day)}
        style={{background:selectedDay&&isSameDay(day,selectedDay)?"var(--surface2)":"var(--surface)",
          flex:1,minHeight:280,padding:"8px 6px 6px",cursor:"pointer",
          transition:"background 0.1s",display:"flex",flexDirection:"column",gap:3}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--surface2)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=selectedDay&&isSameDay(day,selectedDay)?"var(--surface2)":"var(--surface)";}}
      >
        <div style={{textAlign:"center",marginBottom:4}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.5px"}}>{format(day,"EEE")}</div>
          <div style={{width:26,height:26,borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:isToday?700:500,margin:"2px auto 0"}}>{format(day,"d")}</div>
        </div>
        <RoleSplit servers={servers} cooks={cooks}/>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)"}}>
      {showPw && <PasswordModal onSuccess={()=>{setIsManager(true);setShowPw(false);if(pending){pending();setPending(null);}}} onCancel={()=>{setShowPw(false);setPending(null);}}/>}

      {/* Header */}
      <header style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <span style={{fontSize:15,fontWeight:600,letterSpacing:"-0.3px"}}>Shift Scheduler</span>
          <nav style={{display:"flex",gap:2}}>
            {(["calendar","employees","timeslots"] as const).map(t=>(
              <button key={t} onClick={()=>{if(t!=="calendar")requireManager(()=>setTab(t));else setTab(t);}}
                style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:tab===t?"var(--surface2)":"transparent",color:tab===t?"var(--text)":"var(--text-2)",fontFamily:"inherit"}}>
                {t==="calendar"?"Calendar":t==="employees"?"Employees":"Time Slots"}
              </button>
            ))}
          </nav>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isManager&&(
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:"var(--accent-light)",color:"var(--accent)",fontSize:11,fontWeight:600}}>
              <Icon.unlock/> Manager
              <button onClick={()=>{setIsManager(false);setTab("calendar");}} style={{marginLeft:4,background:"none",border:"none",cursor:"pointer",color:"var(--accent)",display:"flex",padding:0}}><Icon.x/></button>
            </div>
          )}
          <button onClick={()=>setDark(!dark)} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}>
            {dark?<Icon.sun/>:<Icon.moon/>}
          </button>
        </div>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 24px"}}>
        {/* ── Calendar ── */}
        {tab==="calendar" && (
          <div style={{display:"flex",gap:20}}>
            {/* Left: calendar grid */}
            <div style={{flex:1,minWidth:0}}>
              <CalNav label={nav.label} onPrev={nav.prev} onNext={nav.next} onToday={nav.today}
                viewMode={viewMode} setViewMode={setViewMode}
                onExportXLSX={exportXLSX} onExportICal={exportICal} isMobile={false}/>

              {/* Day headers — month view only (week cells render their own labels) */}
              {viewMode==="month" && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>(
                    <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text-3)",padding:"4px 0",letterSpacing:"0.5px",textTransform:"uppercase"}}>{d}</div>
                  ))}
                </div>
              )}

              {viewMode==="month" && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"var(--border)",borderRadius:12,overflow:"hidden"}}>
                  {monthDays.map(day=><MonthCell key={day.toString()} day={day}/>)}
                </div>
              )}

              {viewMode==="week" && (
                <div style={{display:"flex",gap:1,background:"var(--border)",borderRadius:12,overflow:"hidden"}}>
                  {weekDays.map(day=><WeekCell key={day.toString()} day={day}/>)}
                </div>
              )}
            </div>

            {/* Right: detail / form panel */}
            {selectedDay && (
              <div style={{width:320,flexShrink:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:20,alignSelf:"flex-start",position:"sticky",top:24}}>
                {panelMode==="detail" && (
                  <DayDetail
                    day={selectedDay}
                    shifts={data.shiftsForDay(selectedDay)}
                    isManager={isManager}
                    onCreateShift={()=>requireManager(()=>setPanelMode("create"))}
                    onEditShift={s=>{setEditingShift(s);setPanelMode("edit");}}
                    onDeleteShift={async id=>{await data.deleteShift(id);}}
                    onClose={()=>setSelectedDay(null)}
                  />
                )}
                {(panelMode==="create"||panelMode==="edit") && (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                      <span style={{fontSize:15,fontWeight:700}}>{panelMode==="create"?"Create Shift":"Edit Shift"}</span>
                      <button className="icon-btn" onClick={()=>setPanelMode("detail")}><Icon.x/></button>
                    </div>
                    <ShiftForm
                      employees={data.employees} timeSlots={data.timeSlots} loading={data.loading}
                      initialShift={panelMode==="edit"?editingShift??undefined:undefined}
                      date={format(selectedDay,"yyyy-MM-dd")}
                      onSave={async(empIds,slotId,role)=>{
                        if(panelMode==="edit"&&editingShift) await data.updateShift(editingShift.id,empIds[0],editingShift.date,slotId,role);
                        else await data.addShifts(empIds,format(selectedDay,"yyyy-MM-dd"),slotId,role);
                        setPanelMode("detail");
                      }}
                      onCancel={()=>setPanelMode("detail")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Employees ── */}
        {tab==="employees" && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:600,letterSpacing:"-0.4px"}}>Employees</h2>
            <div style={{display:"flex",gap:8,marginBottom:20,maxWidth:560}}>
              <input value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&data.addEmployee(newEmpName.trim()).then(()=>setNewEmpName(""))}
                placeholder="Employee name" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
              <button onClick={async()=>{await data.addEmployee(newEmpName.trim());setNewEmpName("");}} disabled={data.loading||!newEmpName.trim()}
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,opacity:(!newEmpName.trim()||data.loading)?0.5:1,fontFamily:"inherit"}}>
                <Icon.plus/> Add
              </button>
            </div>
            {data.employees.length===0&&<p style={{color:"var(--text-3)",fontSize:13}}>No employees yet.</p>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,maxWidth:860}}>
              {data.employees.map(emp=>(
                <div key={emp.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)"}}>
                  <span style={{fontSize:14,fontWeight:500}}>{emp.name}</span>
                  <button onClick={()=>data.removeEmployee(emp.id)} style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Time Slots ── */}
        {tab==="timeslots" && (
          <div>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:600,letterSpacing:"-0.4px"}}>Time Slots</h2>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:16,marginBottom:20,maxWidth:700}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>{editingSlot?"Edit Slot":"New Slot"}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <input value={newSlot.label} onChange={e=>setNewSlot({...newSlot,label:e.target.value})} placeholder="Label (e.g. Morning)"
                  style={{flex:"1 1 130px",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                <input type="time" value={newSlot.startTime} onChange={e=>setNewSlot({...newSlot,startTime:e.target.value})}
                  style={{flex:"0 0 105px",padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                <input type="time" value={newSlot.endTime} onChange={e=>setNewSlot({...newSlot,endTime:e.target.value})}
                  style={{flex:"0 0 105px",padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                <div style={{flex:"1 1 100%",marginTop:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--text-3)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Color</div>
                  <ColorPicker value={newSlot.color} onChange={c=>setNewSlot({...newSlot,color:c})}/>
                </div>
                <button onClick={async()=>{await data.saveSlot(newSlot,editingSlot?.id);setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});}} disabled={data.loading||!newSlot.label.trim()}
                  style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,opacity:(!newSlot.label.trim()||data.loading)?0.5:1,fontFamily:"inherit"}}>
                  <Icon.plus/>{editingSlot?"Save":"Add"}
                </button>
                {editingSlot&&<button onClick={()=>{setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-2)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>}
              </div>
            </div>
            {data.timeSlots.length===0&&<p style={{color:"var(--text-3)",fontSize:13}}>No time slots yet.</p>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,maxWidth:860}}>
              {[...data.timeSlots].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(slot=>(
                <div key={slot.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:slot.color,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:14,fontWeight:600}}>{slot.label}</div>
                      <div className="mono" style={{fontSize:12,color:"var(--text-2)",marginTop:1}}>{slot.startTime} – {slot.endTime}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setEditingSlot(slot);setNewSlot({label:slot.label,startTime:slot.startTime,endTime:slot.endTime,color:slot.color});}}
                      style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}><Icon.pencil/></button>
                    <button onClick={()=>data.removeSlot(slot.id)} style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
// MOBILE APP
// ════════════════════════════════════════════════════════════════
function MobileApp({ dark, setDark }: { dark:boolean; setDark:(v:boolean)=>void }) {
  const [tab,       setTab]      = useState<"calendar"|"employees"|"timeslots">("calendar");
  const [viewMode,  setViewMode] = useState<ViewMode>("week");
  const [anchor,    setAnchor]   = useState(new Date());
  const [isManager, setIsManager]= useState(false);
  const [showPw,    setShowPw]   = useState(false);
  const [pending,   setPending]  = useState<(()=>void)|null>(null);

  // sheets
  const [sheet,         setSheet]        = useState<"day"|"create"|"edit"|"editSlot"|null>(null);
  const [selectedDay,   setSelectedDay]  = useState<Date|null>(null);
  const [editingShift,  setEditingShift] = useState<Shift|null>(null);
  const [newEmpName,    setNewEmpName]   = useState("");
  const [editingSlot,   setEditingSlot]  = useState<TimeSlot|null>(null);
  const [newSlot,       setNewSlot]      = useState({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});

  const rangeStart = viewMode==="month"
    ? format(startOfMonth(anchor),"yyyy-MM-dd")
    : format(startOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");
  const rangeEnd = viewMode==="month"
    ? format(endOfMonth(anchor),"yyyy-MM-dd")
    : format(endOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");

  const data = useSchedulerData(rangeStart, rangeEnd);

  const requireManager = (action:()=>void) => {
    if (isManager) { action(); return; }
    setPending(()=>action); setShowPw(true);
  };
  const closeSheet = () => setSheet(null);
  const today = new Date();

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor),{weekStartsOn:1}),
    end:   endOfWeek(endOfMonth(anchor),{weekStartsOn:1}),
  });
  const weekDays = eachDayOfInterval({
    start: startOfWeek(anchor,{weekStartsOn:1}),
    end:   endOfWeek(anchor,{weekStartsOn:1}),
  });

  const nav = {
    prev:  ()=>setAnchor(a=>viewMode==="month"?subMonths(a,1):subWeeks(a,1)),
    next:  ()=>setAnchor(a=>viewMode==="month"?addMonths(a,1):addWeeks(a,1)),
    today: ()=>setAnchor(new Date()),
    label: viewMode==="month"
      ? format(anchor,"MMMM yyyy")
      : `${format(startOfWeek(anchor,{weekStartsOn:1}),"MMM d")} – ${format(endOfWeek(anchor,{weekStartsOn:1}),"MMM d")}`,
  };

  const exportXLSX = async () => {
    const res = await fetch(`/api/export?format=xlsx&start=${rangeStart}&end=${rangeEnd}`);
    const { rows } = await res.json();
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Shifts");
    XLSX.writeFile(wb,`shifts-${rangeStart}.xlsx`);
  };
  const exportICal = () => { window.location.href=`/api/export?format=ical&start=${rangeStart}&end=${rangeEnd}`; };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",paddingBottom:72}}>
      {showPw&&<PasswordModal onSuccess={()=>{setIsManager(true);setShowPw(false);if(pending){pending();setPending(null);}}} onCancel={()=>{setShowPw(false);setPending(null);}}/>}

      {/* Top bar */}
      <header style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:50}}>
        <span style={{fontSize:15,fontWeight:700,letterSpacing:"-0.3px"}}>
          {tab==="calendar"?nav.label:tab==="employees"?"Employees":"Time Slots"}
        </span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {isManager&&(
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,background:"var(--accent-light)",color:"var(--accent)",fontSize:11,fontWeight:600}}>
              <Icon.unlock/> Mgr
              <button onClick={()=>{setIsManager(false);setTab("calendar");}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",display:"flex",padding:0,marginLeft:2}}><Icon.x/></button>
            </div>
          )}
          <button onClick={()=>setDark(!dark)} style={{width:34,height:34,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}>
            {dark?<Icon.sun/>:<Icon.moon/>}
          </button>
        </div>
      </header>

      {/* ── CALENDAR ── */}
      {tab==="calendar" && (
        <div style={{padding:"12px 10px 0"}}>
          <CalNav label={nav.label} onPrev={nav.prev} onNext={nav.next} onToday={nav.today}
            viewMode={viewMode} setViewMode={setViewMode}
            onExportXLSX={exportXLSX} onExportICal={exportICal} isMobile={true}/>

          {/* Day headers — month view only (Mon–Sun) */}
          {viewMode==="month" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
              {["M","T","W","T","F","S","S"].map((d,i)=>(
                <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text-3)",padding:"3px 0"}}>{d}</div>
              ))}
            </div>
          )}

          {/* Monthly view */}
          {viewMode==="month" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"var(--border)",borderRadius:10,overflow:"hidden"}}>
              {monthDays.map(day=>{
                const inMonth = isSameMonth(day,anchor);
                const isToday = isSameDay(day,today);
                const ds = data.shiftsForDay(day);
                const servers = ds.filter(s=>s.role==="Server");
                const cooks   = ds.filter(s=>s.role==="Cook");
                return (
                  <div key={day.toString()} onClick={()=>{if(inMonth){setSelectedDay(day);setSheet("day");}}}
                    style={{background:"var(--surface)",minHeight:70,padding:"4px 3px 3px",cursor:inMonth?"pointer":"default",opacity:inMonth?1:0.3,display:"flex",flexDirection:"column",gap:2}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:1}}>
                      <span style={{fontSize:10,fontWeight:isToday?700:400,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)"}}>{format(day,"d")}</span>
                    </div>
                    <RoleSplit servers={servers} cooks={cooks} compact/>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weekly view — Google Calendar style: day header row + scrollable shift rows per role */}
          {viewMode==="week" && (
            <div style={{borderRadius:10,overflow:"hidden",border:"1px solid var(--border)"}}>
              {/* Day header row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                {weekDays.map(day=>{
                  const isToday = isSameDay(day,today);
                  return (
                    <div key={day.toString()} onClick={()=>{setSelectedDay(day);setSheet("day");}}
                      style={{padding:"6px 0",textAlign:"center",cursor:"pointer",borderRight:"1px solid var(--border)"}}>
                      <div style={{fontSize:9,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.3px"}}>{format(day,"EEE")}</div>
                      <div style={{width:24,height:24,borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:isToday?700:500,margin:"2px auto 0"}}>{format(day,"d")}</div>
                    </div>
                  );
                })}
              </div>
              {/* Server row */}
              <div style={{background:"var(--surface)"}}>
                <div style={{fontSize:9,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",padding:"5px 8px 3px",background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>Servers</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",minHeight:70}}>
                  {weekDays.map(day=>{
                    const servers = data.shiftsForDay(day).filter(s=>s.role==="Server");
                    return (
                      <div key={day.toString()} onClick={()=>{setSelectedDay(day);setSheet("day");}}
                        style={{padding:"3px 3px",borderRight:"1px solid var(--border)",cursor:"pointer",display:"flex",flexDirection:"column",gap:2,minHeight:70}}>
                        {servers.map(s=>(
                          <div key={s.id} style={{padding:"3px 4px",borderRadius:4,background:hexToRgba(s.timeSlotColor,0.18),borderLeft:`3px solid ${s.timeSlotColor}`,fontSize:9,fontWeight:600,color:"var(--text)",lineHeight:1.3}}>
                            <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.employeeName}</div>
                            <div style={{fontSize:8,color:"var(--text-2)",opacity:0.8}}>{s.timeSlotStart}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Divider */}
              <div style={{height:1,background:"var(--border)"}}/>
              {/* Cook row */}
              <div style={{background:"var(--surface)"}}>
                <div style={{fontSize:9,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",padding:"5px 8px 3px",background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>Cooks</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",minHeight:70}}>
                  {weekDays.map(day=>{
                    const cooks = data.shiftsForDay(day).filter(s=>s.role==="Cook");
                    return (
                      <div key={day.toString()} onClick={()=>{setSelectedDay(day);setSheet("day");}}
                        style={{padding:"3px 3px",borderRight:"1px solid var(--border)",cursor:"pointer",display:"flex",flexDirection:"column",gap:2,minHeight:70}}>
                        {cooks.map(s=>(
                          <div key={s.id} style={{padding:"3px 4px",borderRadius:4,background:hexToRgba(s.timeSlotColor,0.18),borderLeft:`3px solid ${s.timeSlotColor}`,fontSize:9,fontWeight:600,color:"var(--text)",lineHeight:1.3}}>
                            <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.employeeName}</div>
                            <div style={{fontSize:8,color:"var(--text-2)",opacity:0.8}}>{s.timeSlotStart}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES ── */}
      {tab==="employees" && (
        <div style={{padding:"16px 16px 0"}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&data.addEmployee(newEmpName.trim()).then(()=>setNewEmpName(""))}
              placeholder="Employee name" style={{flex:1,padding:"10px 12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
            <button onClick={async()=>{await data.addEmployee(newEmpName.trim());setNewEmpName("");}} disabled={data.loading||!newEmpName.trim()}
              style={{padding:"10px 14px",borderRadius:10,border:"none",background:"var(--accent)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,opacity:(!newEmpName.trim()||data.loading)?0.5:1,fontFamily:"inherit"}}>
              <Icon.plus/> Add
            </button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {data.employees.length===0&&<p style={{color:"var(--text-3)",fontSize:14}}>No employees yet.</p>}
            {data.employees.map(emp=>(
              <div key={emp.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)"}}>
                <span style={{fontSize:15,fontWeight:500}}>{emp.name}</span>
                <button onClick={()=>data.removeEmployee(emp.id)} style={{width:36,height:36,borderRadius:10,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TIME SLOTS ── */}
      {tab==="timeslots" && (
        <div style={{padding:"16px 16px 0"}}>
          <button onClick={()=>{setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});setSheet("editSlot");}}
            style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"var(--accent)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",marginBottom:16}}>
            <Icon.plus/> New Time Slot
          </button>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {data.timeSlots.length===0&&<p style={{color:"var(--text-3)",fontSize:14}}>No time slots yet.</p>}
            {data.timeSlots.map(slot=>(
              <div key={slot.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:slot.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:15,fontWeight:600}}>{slot.label}</div>
                    <div className="mono" style={{fontSize:12,color:"var(--text-2)",marginTop:2}}>{slot.startTime} – {slot.endTime}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setEditingSlot(slot);setNewSlot({label:slot.label,startTime:slot.startTime,endTime:slot.endTime,color:slot.color});setSheet("editSlot");}}
                    style={{width:36,height:36,borderRadius:10,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}><Icon.pencil/></button>
                  <button onClick={()=>data.removeSlot(slot.id)} style={{width:36,height:36,borderRadius:10,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav className="mobile-nav">
        {([
          {key:"calendar",label:"Schedule",icon:<Icon.calendar/>},
          {key:"employees",label:"Employees",icon:<Icon.users/>},
          {key:"timeslots",label:"Time Slots",icon:<Icon.clock/>},
        ] as const).map(({key,label,icon})=>(
          <button key={key} className={`mobile-nav-btn${tab===key?" active":""}`}
            onClick={()=>{if(key!=="calendar")requireManager(()=>setTab(key));else setTab(key);}}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Day bottom sheet ── */}
      {sheet==="day" && selectedDay && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()} style={{maxHeight:"80vh"}}>
            <div className="bottom-sheet-handle"/>
            <div style={{padding:"4px 16px 20px",overflowY:"auto",maxHeight:"calc(80vh - 24px)"}}>
              <DayDetail
                day={selectedDay}
                shifts={data.shiftsForDay(selectedDay)}
                isManager={isManager}
                onCreateShift={()=>requireManager(()=>setSheet("create"))}
                onEditShift={s=>{setEditingShift(s);setSheet("edit");}}
                onDeleteShift={async id=>{await data.deleteShift(id);}}
                onClose={closeSheet}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Create shift sheet ── */}
      {sheet==="create" && selectedDay && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()} style={{maxHeight:"85vh"}}>
            <div className="bottom-sheet-handle"/>
            <div style={{padding:"4px 16px 20px",overflowY:"auto",maxHeight:"calc(85vh - 24px)"}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Create Shift</div>
              <ShiftForm employees={data.employees} timeSlots={data.timeSlots} loading={data.loading}
                date={format(selectedDay,"yyyy-MM-dd")}
                onSave={async(empIds,slotId,role)=>{await data.addShifts(empIds,format(selectedDay,"yyyy-MM-dd"),slotId,role);setSheet("day");}}
                onCancel={()=>setSheet("day")}/>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit shift sheet ── */}
      {sheet==="edit" && editingShift && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()} style={{maxHeight:"85vh"}}>
            <div className="bottom-sheet-handle"/>
            <div style={{padding:"4px 16px 20px",overflowY:"auto",maxHeight:"calc(85vh - 24px)"}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Edit Shift</div>
              <ShiftForm employees={data.employees} timeSlots={data.timeSlots} loading={data.loading}
                initialShift={editingShift} date={editingShift.date}
                onSave={async(empIds,slotId,role)=>{await data.updateShift(editingShift.id,empIds[0],editingShift.date,slotId,role);setSheet("day");}}
                onCancel={()=>setSheet("day")}/>
              <button onClick={async()=>{await data.deleteShift(editingShift.id);setSheet("day");}}
                style={{width:"100%",marginTop:10,padding:"12px",borderRadius:12,border:"1px solid var(--danger)",background:"var(--danger-light)",color:"var(--danger)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Delete Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit slot sheet ── */}
      {sheet==="editSlot" && (
        <div className="bottom-sheet-backdrop" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="bottom-sheet-handle"/>
            <div style={{padding:"4px 16px 20px"}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>{editingSlot?"Edit":"New"} Time Slot</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
                <input value={newSlot.label} onChange={e=>setNewSlot({...newSlot,label:e.target.value})} placeholder="Label (e.g. Morning)"
                  style={{padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                <div style={{display:"flex",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:"var(--text-3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Start</div>
                    <input type="time" value={newSlot.startTime} onChange={e=>setNewSlot({...newSlot,startTime:e.target.value})}
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:"var(--text-3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>End</div>
                    <input type="time" value={newSlot.endTime} onChange={e=>setNewSlot({...newSlot,endTime:e.target.value})}
                      style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Color</div>
                  <ColorPicker value={newSlot.color} onChange={c=>setNewSlot({...newSlot,color:c})}/>
                </div>
              </div>
              <button onClick={async()=>{await data.saveSlot(newSlot,editingSlot?.id);setEditingSlot(null);setNewSlot({label:"",startTime:"09:00",endTime:"17:00",color:"#6366f1"});closeSheet();}}
                disabled={data.loading||!newSlot.label.trim()}
                style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"var(--accent)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",opacity:(data.loading||!newSlot.label.trim())?0.4:1,fontFamily:"inherit"}}>
                {data.loading?"Saving…":editingSlot?"Save Changes":"Add Slot"}
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
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [dark,     setDark]     = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(()=>{
    const saved       = localStorage.getItem("shift-dark-mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved!==null ? saved==="true" : prefersDark;
    setDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    setMounted(true);
    return ()=>window.removeEventListener("resize", check);
  },[]);

  const handleSetDark = (v:boolean) => {
    setDark(v);
    localStorage.setItem("shift-dark-mode", String(v));
    document.documentElement.classList.toggle("dark", v);
  };

  if (!mounted) return null;
  return isMobile
    ? <MobileApp dark={dark} setDark={handleSetDark}/>
    : <DesktopApp dark={dark} setDark={handleSetDark}/>;
}
