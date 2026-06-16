"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek,
  endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────
export type Employee = { id: string; name: string };
export type TimeSlot = { id: string; label: string; startTime: string; endTime: string; color: string };
export type Shift    = {
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
  qr:       ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>,
  print:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  undo:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  copy:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  template: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  link:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  save:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>,
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
          <button onClick={attempt} className="btn-primary" style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ─── Module-level cache (persists across remounts in this session) ─
type CacheEntry = { employees: Employee[]; timeSlots: TimeSlot[]; shifts: Shift[] };
const dataCache = new Map<string, CacheEntry>();

// ─── Shared data hook — optimistic updates + cache ────────────
function useSchedulerData(startDate: string, endDate: string) {
  const cacheKey = `${startDate}_${endDate}`;
  const cached = dataCache.get(cacheKey);

  const [employees, setEmployees] = useState<Employee[]>(cached?.employees ?? []);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(cached?.timeSlots ?? []);
  const [shifts,    setShifts]    = useState<Shift[]>(cached?.shifts ?? []);
  const [loading,   setLoading]   = useState(false);
  const [initialLoading, setInitialLoading] = useState(!cached);

  // Tracks the most recently requested range so late-arriving responses
  // for a stale range don't clobber the current view.
  const latestKeyRef = useRef(cacheKey);
  useEffect(() => { latestKeyRef.current = cacheKey; }, [cacheKey]);

  // Sort by timeSlotStart ascending
  function sortShifts(shs: Shift[], slots: TimeSlot[]) {
    return [...shs].sort((a,b)=>{
      const ta = a.timeSlotStart || slots.find(s=>s.id===a.timeSlotId)?.startTime || "00:00";
      const tb = b.timeSlotStart || slots.find(s=>s.id===b.timeSlotId)?.startTime || "00:00";
      return ta.localeCompare(tb);
    });
  }

  const fetchAll = useCallback(async (silent?: boolean) => {
    const key = `${startDate}_${endDate}`;
    const [eR, sR, shR] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/timeslots"),
      fetch(`/api/shifts?start=${startDate}&end=${endDate}`),
    ]);
    const [emps, slots, shs] = await Promise.all([eR.json(), sR.json(), shR.json()]);
    const sorted = sortShifts(shs, slots);
    const prev = dataCache.get(key);
    const changed = !prev || JSON.stringify(prev) !== JSON.stringify({employees:emps,timeSlots:slots,shifts:sorted});
    dataCache.set(key, { employees: emps, timeSlots: slots, shifts: sorted });

    // Ignore this response if the user has since navigated to a different range.
    if (latestKeyRef.current !== key) return;

    if (!silent || changed) {
      setEmployees(emps);
      setTimeSlots(slots);
      setShifts(sorted);
    }
    setInitialLoading(false);
  }, [startDate, endDate]);

  // On range change: reset initialLoading appropriately
  useEffect(() => {
    setInitialLoading(!dataCache.has(cacheKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // On range change: show cached data instantly (if any) without a loading
  // flicker, then silently refresh in the background to catch any updates.
  useEffect(() => {
    const c = dataCache.get(cacheKey);
    if (c) {
      setEmployees(c.employees);
      setTimeSlots(c.timeSlots);
      setShifts(c.shifts);
      fetchAll(true); // background refresh, no spinner
    } else {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Invalidate all cached ranges except the current one (their employees/
  // timeSlots/shifts may now be stale after a mutation).
  const invalidateOtherRanges = () => {
    Array.from(dataCache.keys()).forEach(key => {
      if (key !== cacheKey) dataCache.delete(key);
    });
  };

  const tempId = () => `temp-${Math.random().toString(36).slice(2)}`;

  const addEmployee = async (name: string) => {
    setLoading(true);
    await fetch("/api/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
    invalidateOtherRanges();
    await fetchAll(); setLoading(false);
  };
  const removeEmployee = async (id: string) => {
    setEmployees(es=>es.filter(e=>e.id!==id));
    await fetch("/api/employees",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    invalidateOtherRanges();
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
    invalidateOtherRanges();
    await fetchAll(); setLoading(false);
  };
  const removeSlot = async (id: string) => {
    setTimeSlots(ts=>ts.filter(t=>t.id!==id));
    await fetch("/api/timeslots",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    invalidateOtherRanges();
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
    invalidateOtherRanges();
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
    invalidateOtherRanges();
    await fetchAll(); setLoading(false);
  };

  const deleteShift = async (id: string) => {
    setShifts(ss=>ss.filter(s=>s.id!==id)); // optimistic remove
    await fetch("/api/shifts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    invalidateOtherRanges();
    await fetchAll();
  };

  // Delete but keep the removed shift around so the caller can offer "Undo".
  // Returns the removed shift; call restoreDeletedShift(shift) to bring it back.
  const deleteShiftWithUndo = async (id: string): Promise<Shift | null> => {
    const removed = shifts.find(s=>s.id===id) ?? null;
    setShifts(ss=>ss.filter(s=>s.id!==id));
    await fetch("/api/shifts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    invalidateOtherRanges();
    return removed;
  };

  const restoreDeletedShift = async (shift: Shift) => {
    setShifts(ss=>sortShifts([...ss, shift], timeSlots)); // optimistic re-add
    await fetch("/api/shifts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"restore", id: shift.id})});
    invalidateOtherRanges();
    await fetchAll();
  };

  // Create many shifts at once (used by "copy previous week" and templates).
  // Each entry specifies its own date/employee/slot/role.
  const addShiftBatch = async (entries: { employeeId:string; date:string; timeSlotId:string; role:string }[]) => {
    setLoading(true);
    const tempShifts: Shift[] = entries.map(e => {
      const emp  = employees.find(x=>x.id===e.employeeId);
      const slot = timeSlots.find(x=>x.id===e.timeSlotId);
      return {
        id: tempId(), date: e.date, employeeId: e.employeeId, employeeName: emp?.name??"",
        timeSlotId: e.timeSlotId, timeSlotLabel: slot?.label??"", timeSlotStart: slot?.startTime??"",
        timeSlotEnd: slot?.endTime??"", timeSlotColor: slot?.color??"#6366f1", role: e.role as "Server"|"Cook",
      };
    });
    setShifts(ss=>sortShifts([...ss,...tempShifts], timeSlots));
    await Promise.all(entries.map(e => {
      const emp  = employees.find(x=>x.id===e.employeeId);
      const slot = timeSlots.find(x=>x.id===e.timeSlotId);
      return fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({employeeId:e.employeeId,employeeName:emp?.name??"",date:e.date,timeSlotId:e.timeSlotId,timeSlotLabel:slot?.label??"",role:e.role})});
    }));
    invalidateOtherRanges();
    await fetchAll(); setLoading(false);
  };

  // Move an existing shift to a new date (and optionally role) — used for
  // drag-and-drop. Keeps the same employee and time slot.
  const moveShift = async (id: string, newDate: string, newRole?: string) => {
    const existing = shifts.find(s=>s.id===id);
    if (!existing) return;
    const role = (newRole ?? existing.role) as "Server"|"Cook";
    setShifts(ss=>sortShifts(ss.map(s=>s.id===id?{...s,date:newDate,role}:s), timeSlots));
    await fetch("/api/shifts",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id,employeeId:existing.employeeId,employeeName:existing.employeeName,date:newDate,timeSlotId:existing.timeSlotId,timeSlotLabel:existing.timeSlotLabel,role})});
    invalidateOtherRanges();
    await fetchAll();
  };

  // Delete all shifts on a given date. Returns them for undo.
  const clearDay = async (date: string): Promise<Shift[]> => {
    const toDelete = shifts.filter(s => s.date === date);
    if (toDelete.length === 0) return [];
    // Optimistic update first
    setShifts(ss => ss.filter(s => s.date !== date));
    // Update cache immediately so navigating away and back shows empty
    const key = `${startDate}_${endDate}`;
    const cached = dataCache.get(key);
    if (cached) {
      const updated = { ...cached, shifts: cached.shifts.filter(s => s.date !== date) };
      dataCache.set(key, updated);
    }
    // Fire deletes and wait — don't fetchAll after (avoids race where Notion
    // hasn't finished archiving before the re-fetch runs)
    await Promise.all(toDelete.map(s =>
      fetch("/api/shifts", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:s.id}) })
    ));
    invalidateOtherRanges();
    // Delayed re-fetch to reconcile after Notion finishes archiving
    setTimeout(() => fetchAll(true), 2000);
    return toDelete;
  };

  // Delete all shifts in the current loaded range. Returns them for undo.
  const clearWeek = async (): Promise<Shift[]> => {
    const toDelete = [...shifts];
    if (toDelete.length === 0) return [];
    // Optimistic: clear state and cache immediately
    setShifts([]);
    const key = `${startDate}_${endDate}`;
    if (dataCache.has(key)) {
      const cached = dataCache.get(key)!;
      dataCache.set(key, { ...cached, shifts: [] });
    }
    await Promise.all(toDelete.map(s =>
      fetch("/api/shifts", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:s.id}) })
    ));
    invalidateOtherRanges();
    setTimeout(() => fetchAll(true), 2000);
    return toDelete;
  };

  // Restore multiple shifts at once (used for undo of clearDay/clearWeek).
  const restoreShifts = async (restored: Shift[]) => {
    setShifts(ss => sortShifts([...ss, ...restored], timeSlots));
    const key = `${startDate}_${endDate}`;
    const cached = dataCache.get(key);
    if (cached) {
      dataCache.set(key, { ...cached, shifts: sortShifts([...cached.shifts, ...restored], timeSlots) });
    }
    await Promise.all(restored.map(s =>
      fetch("/api/shifts", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"restore", id:s.id}) })
    ));
    invalidateOtherRanges();
    setTimeout(() => fetchAll(true), 2000);
  };

  const shiftsForDay = (day: Date) => shifts.filter(s=>s.date===format(day,"yyyy-MM-dd"));

  return { employees, timeSlots, shifts, loading, initialLoading, fetchAll, addEmployee, removeEmployee, saveSlot, removeSlot, addShifts, addShiftBatch, updateShift, deleteShift, deleteShiftWithUndo, restoreDeletedShift, restoreShifts, moveShift, clearDay, clearWeek, shiftsForDay };
}

// ─── Role column inside a day cell (used in side-by-side layout) ─
function RoleColumn({ label, shifts, compact, skeleton, draggable, onDragStartShift, onDragEndShift }: { label: string; shifts: Shift[]; compact?: boolean; skeleton?: boolean; draggable?: boolean; onDragStartShift?:(id:string)=>void; onDragEndShift?:()=>void }) {
  const displayed = compact ? shifts.slice(0,2) : shifts;
  return (
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:1,padding:"0 2px"}}>
      <div style={{fontSize:8,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:1}}>{label}</div>
      {skeleton
        ? <div className="skeleton" style={{height:compact?18:24,borderRadius:3}}/>
        : displayed.length===0
        ? <div style={{height:compact?10:12}}/>
        : displayed.map(s=>(
            compact ? (
              <div key={s.id} className="entry-pop" draggable={draggable}
                onDragStart={e=>{e.stopPropagation();onDragStartShift?.(s.id);}}
                onDragEnd={()=>onDragEndShift?.()}
                style={{
                height:18, lineHeight:"18px", padding:"0 3px", borderRadius:3,
                background: hexToRgba(s.timeSlotColor, 0.18),
                borderLeft:`3px solid ${s.timeSlotColor}`,
                fontSize:9, fontWeight:600, color:"var(--text)",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                cursor: draggable?"grab":undefined,
              }}>
                {s.employeeName}
              </div>
            ) : (
              <div key={s.id} className="entry-pop" draggable={draggable}
                onDragStart={e=>{e.stopPropagation();onDragStartShift?.(s.id);}}
                onDragEnd={()=>onDragEndShift?.()}
                style={{
                padding:"3px 4px", borderRadius:3,
                background: hexToRgba(s.timeSlotColor, 0.18),
                borderLeft:`3px solid ${s.timeSlotColor}`,
                lineHeight:1.3,
                cursor: draggable?"grab":undefined,
              }}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.employeeName}</div>
                <div style={{fontSize:9,color:"var(--text-2)",fontFamily:"monospace"}}>{s.timeSlotStart}–{s.timeSlotEnd}</div>
              </div>
            )
          ))
      }
      {!skeleton && compact && shifts.length > 2 && <div className="entry-pop" style={{fontSize:8,color:"var(--text-3)"}}>{`+${shifts.length-2}`}</div>}
    </div>
  );
}

// ─── Two-column Server|Cook row for a cell ────────────────────
function RoleSplit({ servers, cooks, compact, skeleton, draggable, onDragStartShift, onDragEndShift }: { servers: Shift[]; cooks: Shift[]; compact?: boolean; skeleton?: boolean; draggable?: boolean; onDragStartShift?:(id:string)=>void; onDragEndShift?:()=>void }) {
  return (
    <div style={{display:"flex",flex:1,minWidth:0,gap:0,marginTop:2}}>
      <RoleColumn label="Server" shifts={servers} compact={compact} skeleton={skeleton} draggable={draggable} onDragStartShift={onDragStartShift} onDragEndShift={onDragEndShift}/>
      <div style={{width:1,background:"var(--border)",flexShrink:0,alignSelf:"stretch"}}/>
      <RoleColumn label="Cook" shifts={cooks} compact={compact} skeleton={skeleton} draggable={draggable} onDragStartShift={onDragStartShift} onDragEndShift={onDragEndShift}/>
    </div>
  );
}

// ─── Day detail panel (read-only summary) ─────────────────────
function DayDetail({
  day, shifts, isManager, onCreateShift, onEditShift, onDeleteShift, onClearDay, onClose,
}: {
  day: Date; shifts: Shift[]; isManager: boolean;
  onCreateShift: ()=>void; onEditShift: (s:Shift)=>void; onDeleteShift: (id:string)=>void; onClearDay: ()=>void; onClose: ()=>void;
}) {
  const servers = shifts.filter(s=>s.role==="Server");
  const cooks   = shifts.filter(s=>s.role==="Cook");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:"-0.4px"}}>{format(day,"EEEE")}</div>
          <div style={{fontSize:13,color:"var(--text-2)"}}>{format(day,"MMMM d, yyyy")}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:10}}>
          {isManager && shifts.length > 0 && (
            <button onClick={onClearDay} title="Clear all shifts this day"
              style={{width:30,height:30,borderRadius:8,border:"1px solid var(--danger)",background:"var(--danger-light)",color:"var(--danger)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s ease"}}>
              <Icon.trash/>
            </button>
          )}
          <button onClick={onCreateShift} className="btn-primary"
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            <Icon.plus/> Create Shift
          </button>
          <button className="icon-btn" onClick={onClose} style={{flexShrink:0}}><Icon.x/></button>
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
                <div key={s.id} className="entry-pop entry-hover" style={{
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
  onSave, onCancel, onClearDay, existingCount,
}: {
  employees: Employee[]; timeSlots: TimeSlot[]; loading: boolean;
  initialShift?: Shift; date: string;
  onSave: (empIds:string[], slotId:string, role:string)=>void;
  onCancel: ()=>void;
  onClearDay?: ()=>void;
  existingCount?: number;
}) {
  const [selEmps, setSelEmps] = useState<string[]>(initialShift?[initialShift.employeeId]:[]);
  const [selSlot, setSelSlot] = useState(initialShift?.timeSlotId??"");
  const [selRole, setSelRole] = useState<string>(initialShift?.role??"Server");
  const S = (active:boolean)=>({padding:"7px 12px",borderRadius:20,fontSize:12,fontWeight:500 as const,cursor:"pointer" as const,fontFamily:"inherit",border:`1.5px solid ${active?"var(--accent)":"var(--border)"}`,background:active?"var(--accent-light)":"var(--surface2)",color:active?"var(--accent)":"var(--text-2)",transition:"all 0.1s"});
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:12,color:"var(--text-2)",fontWeight:600}}>Date: <span style={{color:"var(--text)"}}>{date}</span></div>
        {!initialShift && onClearDay && existingCount && existingCount > 0 ? (
          <button onClick={onClearDay} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,border:"1px solid var(--danger)",background:"var(--danger-light)",color:"var(--danger)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s ease"}}>
            <Icon.trash/> Clear Day ({existingCount})
          </button>
        ) : null}
      </div>

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

// ─── Export modal ─────────────────────────────────────────────
function ExportModal({ employees, rangeStart, rangeEnd, onClose }: {
  employees: Employee[]; rangeStart: string; rangeEnd: string; onClose: ()=>void;
}) {
  const [format_, setFormat_] = useState<"xlsx"|"ical">("xlsx");
  const [empFilter, setEmpFilter] = useState<"all"|"select">("all");
  const [selEmps, setSelEmps] = useState<string[]>([]);

  const toggleEmp = (id: string) =>
    setSelEmps(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  const doExport = async () => {
    const empIds = empFilter==="all" ? [] : selEmps;
    const qs = empIds.length ? `&employees=${empIds.join(",")}` : "";
    if (format_==="xlsx") {
      const res = await fetch(`/api/export?format=xlsx&start=${rangeStart}&end=${rangeEnd}${qs}`);
      const { rows } = await res.json();
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"Shifts");
      XLSX.writeFile(wb,`shifts-${rangeStart}.xlsx`);
    } else {
      window.location.href=`/api/export?format=ical&start=${rangeStart}&end=${rangeEnd}${qs}`;
    }
    onClose();
  };

  const S = (active:boolean) => ({
    padding:"6px 12px", borderRadius:8, border:`1.5px solid ${active?"var(--accent)":"var(--border)"}`,
    background: active?"var(--accent-light)":"var(--surface2)", color: active?"var(--accent)":"var(--text-2)",
    fontSize:12, fontWeight:500 as const, cursor:"pointer" as const, fontFamily:"inherit",
    transition:"background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
  });
  const Sclass = (active:boolean) => active ? "select-bounce" : "";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Export Schedule</span>
          <button className="icon-btn" onClick={onClose}><Icon.x/></button>
        </div>
        <div style={{padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:16}}>
          {/* Format */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Format</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setFormat_("xlsx")} className={Sclass(format_==="xlsx")} style={S(format_==="xlsx")}>📊 Spreadsheet (XLSX)</button>
              <button onClick={()=>setFormat_("ical")} className={Sclass(format_==="ical")} style={S(format_==="ical")}>📅 Calendar (iCal)</button>
            </div>
          </div>
          {/* Employees */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Employees</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <button onClick={()=>{setEmpFilter("all");setSelEmps([]);}} className={Sclass(empFilter==="all")} style={S(empFilter==="all")}>All Employees</button>
              <button onClick={()=>setEmpFilter("select")} className={Sclass(empFilter==="select")} style={S(empFilter==="select")}>Select Employees</button>
            </div>
            {empFilter==="select" && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {employees.map(emp=>(
                  <button key={emp.id} onClick={()=>toggleEmp(emp.id)} className={Sclass(selEmps.includes(emp.id))} style={{
                    ...S(selEmps.includes(emp.id)),
                    padding:"5px 10px", fontSize:12,
                  }}>{emp.name}</button>
                ))}
                {employees.length===0&&<p style={{fontSize:12,color:"var(--text-3)",margin:0}}>No employees yet.</p>}
              </div>
            )}
          </div>
          {/* Range info */}
          <div style={{fontSize:12,color:"var(--text-2)",background:"var(--surface2)",padding:"8px 12px",borderRadius:8}}>
            Range: <span style={{fontFamily:"monospace",color:"var(--text)"}}>{rangeStart}</span> → <span style={{fontFamily:"monospace",color:"var(--text)"}}>{rangeEnd}</span>
          </div>
          <button onClick={doExport}
            disabled={empFilter==="select"&&selEmps.length===0}
            className="btn-primary" style={{padding:"10px",borderRadius:9,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:empFilter==="select"&&selEmps.length===0?0.4:1,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Icon.download/> Export
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar header nav ──────────────────────────────────────
function CalNav({ label, onPrev, onNext, onToday, viewMode, setViewMode, onExport, onPrint, onTemplates, onCopyWeek, onClearWeek, isMobile, isManager }:
  { label:string; onPrev:()=>void; onNext:()=>void; onToday:()=>void; viewMode:ViewMode; setViewMode:(v:ViewMode)=>void; onExport:()=>void; onPrint:()=>void; onTemplates:()=>void; onCopyWeek:()=>void; onClearWeek:()=>void; isMobile:boolean; isManager:boolean }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button className="icon-btn" onClick={onPrev}><Icon.chevL/></button>
        <span style={{fontSize:isMobile?15:18,fontWeight:700,letterSpacing:"-0.4px",minWidth:isMobile?130:170,textAlign:"center"}}>{label}</span>
        <button className="icon-btn" onClick={onNext}><Icon.chevR/></button>
        <button onClick={onToday} style={{padding:"4px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-2)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Today</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <div style={{display:"flex",borderRadius:8,border:"1px solid var(--border)",overflow:"hidden"}}>
          {(["month","week"] as ViewMode[]).map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{padding:"5px 10px",border:"none",background:viewMode===v?"var(--accent)":"var(--surface)",color:viewMode===v?"#fff":"var(--text-2)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {v==="month"?<span style={{display:"flex",alignItems:"center",gap:4}}><Icon.grid/>{!isMobile&&" Month"}</span>:<span style={{display:"flex",alignItems:"center",gap:4}}><Icon.list/>{!isMobile&&" Week"}</span>}
            </button>
          ))}
        </div>
        {isManager && viewMode==="week" && (
          <button onClick={onCopyWeek} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Copy previous week"><Icon.copy/></button>
        )}
        {isManager && viewMode==="week" && (
          <button onClick={onTemplates} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Shift templates"><Icon.template/></button>
        )}
        {isManager && viewMode==="week" && (
          <button onClick={onClearWeek} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--danger)",background:"var(--danger-light)",color:"var(--danger)",cursor:"pointer"}} title="Clear this week"><Icon.trash/></button>
        )}
        <button onClick={onPrint} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Print"><Icon.print/></button>
        <button onClick={onExport} style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",cursor:"pointer"}} title="Export"><Icon.download/></button>
      </div>
    </div>
  );
}

// ─── Toast (undo notifications) ────────────────────────────────
function Toast({ message, actionLabel, onAction, onDismiss }: { message:string; actionLabel?:string; onAction?:()=>void; onDismiss:()=>void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="toast-pop" style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:300,
      background:"var(--text)", color:"var(--bg)", borderRadius:10, padding:"10px 16px",
      display:"flex", alignItems:"center", gap:14, fontSize:13, fontWeight:500,
      boxShadow:"0 8px 24px rgba(0,0,0,0.25)", maxWidth:"calc(100vw - 32px)",
    }}>
      <span>{message}</span>
      {actionLabel && onAction && (
        <button onClick={()=>{onAction();onDismiss();}} style={{background:"none",border:"none",color:"var(--accent)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",padding:0}}>{actionLabel}</button>
      )}
      <button onClick={onDismiss} style={{background:"none",border:"none",color:"var(--bg)",opacity:0.6,cursor:"pointer",display:"flex",padding:0}}><Icon.x/></button>
    </div>
  );
}

// ─── QR / Share modal ───────────────────────────────────────────
function ShareModal({ employees, onClose }: { employees: Employee[]; onClose: ()=>void }) {
  const [selEmp, setSelEmp] = useState<string>(employees[0]?.id ?? "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = selEmp ? `${origin}/my-schedule?id=${selEmp}` : "";
  const qrUrl = link ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}` : "";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}><Icon.qr/> Share Schedule</span>
          <button className="icon-btn" onClick={onClose}><Icon.x/></button>
        </div>
        <div style={{padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Employee</div>
            <select value={selEmp} onChange={e=>setSelEmp(e.target.value)}
              style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              {employees.length===0 && <option value="">No employees</option>}
            </select>
          </div>
          {selEmp && (
            <>
              <div style={{display:"flex",justifyContent:"center",padding:"12px",background:"#fff",borderRadius:12}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} width={180} height={180} alt="QR code for personal schedule" style={{display:"block"}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Shareable Link</div>
                <div style={{display:"flex",gap:8}}>
                  <input readOnly value={link} onClick={e=>(e.target as HTMLInputElement).select()}
                    style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
                  <button onClick={()=>navigator.clipboard.writeText(link)} className="btn-primary"
                    style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <Icon.copy/> Copy
                  </button>
                </div>
                <p style={{fontSize:11,color:"var(--text-3)",margin:"8px 0 0",lineHeight:1.5}}>
                  This link shows a read-only view of this employee&apos;s upcoming shifts — no password needed. They can also subscribe to a personal calendar feed from that page.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Templates modal ─────────────────────────────────────────
type TemplateEntry = { dayOffset:number; employeeId:string; timeSlotId:string; role:string };
type Template = { id:string; name:string; data:string };

function TemplatesModal({ templates, currentWeekShifts, weekStart, employees, timeSlots, onSaveTemplate, onApplyTemplate, onDeleteTemplate, onClose }: {
  templates: Template[];
  currentWeekShifts: Shift[];
  weekStart: Date;
  employees: Employee[];
  timeSlots: TimeSlot[];
  onSaveTemplate: (name:string, entries:TemplateEntry[])=>Promise<void>;
  onApplyTemplate: (entries:TemplateEntry[])=>Promise<void>;
  onDeleteTemplate: (id:string)=>Promise<void>;
  onClose: ()=>void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<string|null>(null);

  const handleSaveCurrentWeek = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const entries: TemplateEntry[] = currentWeekShifts.map(s => {
      const dayOffset = Math.round((parseISO(s.date).getTime() - weekStart.getTime()) / 86400000);
      return { dayOffset, employeeId: s.employeeId, timeSlotId: s.timeSlotId, role: s.role };
    });
    await onSaveTemplate(name.trim(), entries);
    setName(""); setSaving(false);
  };

  const handleApply = async (t: Template) => {
    setApplying(t.id);
    try {
      const entries: TemplateEntry[] = JSON.parse(t.data);
      await onApplyTemplate(entries);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}><Icon.template/> Shift Templates</span>
          <button className="icon-btn" onClick={onClose}><Icon.x/></button>
        </div>
        <div style={{padding:"16px 20px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Save Current Week as Template</div>
            <div style={{display:"flex",gap:8}}>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Template name (e.g. Standard Week)"
                style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
              <button onClick={handleSaveCurrentWeek} disabled={saving||!name.trim()||currentWeekShifts.length===0} className="btn-primary"
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(saving||!name.trim()||currentWeekShifts.length===0)?0.4:1,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
                <Icon.save/> Save
              </button>
            </div>
            {currentWeekShifts.length===0 && <p style={{fontSize:11,color:"var(--text-3)",margin:"6px 0 0"}}>This week has no shifts to save.</p>}
          </div>

          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>Apply Template to This Week</div>
            {templates.length===0 && <p style={{fontSize:12,color:"var(--text-3)",margin:0}}>No templates saved yet.</p>}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {templates.map(t=>{
                let count = 0;
                try { count = JSON.parse(t.data).length; } catch {}
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{t.name}</div>
                      <div style={{fontSize:11,color:"var(--text-2)"}}>{count} shift{count!==1?"s":""}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>handleApply(t)} disabled={applying===t.id} className="btn-primary"
                        style={{padding:"6px 12px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",opacity:applying===t.id?0.5:1,fontFamily:"inherit"}}>
                        {applying===t.id?"Applying…":"Apply"}
                      </button>
                      <button onClick={()=>onDeleteTemplate(t.id)} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)"}}><Icon.trash/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{fontSize:11,color:"var(--text-3)",margin:"8px 0 0",lineHeight:1.5}}>
              Applying a template adds its shifts to the current week, keeping the same days of the week (Mon–Sun) and employees. Existing shifts aren&apos;t removed.
            </p>
          </div>
        </div>
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
  const [showExport,   setShowExport]   = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [showTemplates,setShowTemplates]= useState(false);
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [toast,        setToast]        = useState<{message:string; actionLabel?:string; onAction?:()=>void}|null>(null);
  const [dragShiftId,  setDragShiftId]  = useState<string|null>(null);
  const [dragOverDay,  setDragOverDay]  = useState<string|null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);
  useEffect(()=>{ loadTemplates(); },[loadTemplates]);

  const handleSaveTemplate = async (name:string, entries:TemplateEntry[]) => {
    await fetch("/api/templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,data:entries})});
    await loadTemplates();
  };
  const handleDeleteTemplate = async (id:string) => {
    await fetch("/api/templates",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await loadTemplates();
  };
  const handleApplyTemplate = async (entries:TemplateEntry[]) => {
    const weekMonday = startOfWeek(anchor,{weekStartsOn:1});
    const batch = entries.map(e=>({
      employeeId: e.employeeId, timeSlotId: e.timeSlotId, role: e.role,
      date: format(new Date(weekMonday.getTime() + e.dayOffset*86400000), "yyyy-MM-dd"),
    }));
    await data.addShiftBatch(batch);
    setShowTemplates(false);
    setToast({message:`Applied template — ${batch.length} shift${batch.length!==1?"s":""} added.`});
  };

  const handleCopyPreviousWeek = async () => {
    requireManager(async () => {
      const prevWeekStart = format(subWeeks(startOfWeek(anchor,{weekStartsOn:1}),1),"yyyy-MM-dd");
      const prevWeekEnd   = format(subWeeks(endOfWeek(anchor,{weekStartsOn:1}),1),"yyyy-MM-dd");
      const res = await fetch(`/api/shifts?start=${prevWeekStart}&end=${prevWeekEnd}`);
      const prevShifts: Shift[] = await res.json();
      if (prevShifts.length===0) { setToast({message:"No shifts found in the previous week."}); return; }
      const thisWeekStart = startOfWeek(anchor,{weekStartsOn:1});
      const batch = prevShifts.map(s=>{
        const offset = Math.round((parseISO(s.date).getTime() - parseISO(prevWeekStart).getTime())/86400000);
        return { employeeId:s.employeeId, timeSlotId:s.timeSlotId, role:s.role, date: format(new Date(thisWeekStart.getTime()+offset*86400000),"yyyy-MM-dd") };
      });
      await data.addShiftBatch(batch);
      setToast({message:`Copied ${batch.length} shift${batch.length!==1?"s":""} from last week.`});
    });
  };

  const handlePrint = () => { window.print(); };

  const rangeStart = viewMode==="month"
    ? format(startOfMonth(anchor),"yyyy-MM-dd")
    : format(startOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");
  const rangeEnd = viewMode==="month"
    ? format(endOfMonth(anchor),"yyyy-MM-dd")
    : format(endOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");

  const data = useSchedulerData(rangeStart, rangeEnd);

  const currentWeekShifts = viewMode==="week" ? data.shifts : [];
  const weekStartDate = startOfWeek(anchor,{weekStartsOn:1});

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

  const openDay = (day:Date) => {
    setSelectedDay(day);
    setPanelMode("detail");
    setEditingShift(null);
  };

  // Monthly grid cell
  const MonthCell = ({ day }: { day:Date }) => {
    const inMonth = isSameMonth(day,anchor);
    const isToday = isSameDay(day,today);
    const isSelected = !!(selectedDay&&isSameDay(day,selectedDay));
    const dayStr = format(day,"yyyy-MM-dd");
    const ds = data.shiftsForDay(day);
    const servers = ds.filter(s=>s.role==="Server");
    const cooks   = ds.filter(s=>s.role==="Cook");
    const isDragOver = dragOverDay===dayStr;
    return (
      <div onClick={()=>{ if(inMonth){ openDay(day); } }}
        onDragOver={e=>{e.preventDefault();setDragOverDay(dayStr);}}
        onDragLeave={()=>setDragOverDay(null)}
        onDrop={async e=>{e.preventDefault();setDragOverDay(null);if(dragShiftId){await data.moveShift(dragShiftId,dayStr);setDragShiftId(null);}}}
        className={`day-cell${isSelected?" day-cell-selected":""}`}
        style={{background:isDragOver?"var(--accent-light)":isSelected?"var(--surface2)":"var(--surface)",
          minHeight:110,padding:"6px 5px 4px",cursor:inMonth?"pointer":"default",opacity:inMonth?1:0.3,
          display:"flex",flexDirection:"column",gap:2,transition:"background-color 0.15s ease"}}
      >
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}>
          <span style={{fontSize:11,fontWeight:isToday?700:400,width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)",transition:"background-color 0.2s ease"}}>{format(day,"d")}</span>
        </div>
        <RoleSplit servers={servers} cooks={cooks} compact skeleton={data.initialLoading}
          draggable={isManager} onDragStartShift={id=>{setDragShiftId(id);}} onDragEndShift={()=>{setDragShiftId(null);setDragOverDay(null);}}/>
      </div>
    );
  };

  // Weekly grid cell
  const WeekCell = ({ day }: { day:Date }) => {
    const isToday = isSameDay(day,today);
    const isSelected = !!(selectedDay&&isSameDay(day,selectedDay));
    const dayStr = format(day,"yyyy-MM-dd");
    const ds = data.shiftsForDay(day);
    const servers = ds.filter(s=>s.role==="Server");
    const cooks   = ds.filter(s=>s.role==="Cook");
    const isDragOver = dragOverDay===dayStr;
    return (
      <div onClick={()=>openDay(day)}
        onDragOver={e=>{e.preventDefault();setDragOverDay(dayStr);}}
        onDragLeave={()=>setDragOverDay(null)}
        onDrop={async e=>{e.preventDefault();setDragOverDay(null);if(dragShiftId){await data.moveShift(dragShiftId,dayStr);setDragShiftId(null);}}}
        className={`day-cell${isSelected?" day-cell-selected":""}`}
        style={{background:isDragOver?"var(--accent-light)":isSelected?"var(--surface2)":"var(--surface)",
          flex:1,minHeight:280,padding:"8px 6px 6px",cursor:"pointer",
          display:"flex",flexDirection:"column",gap:3,transition:"background-color 0.15s ease"}}
      >
        <div style={{textAlign:"center",marginBottom:4}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.5px"}}>{format(day,"EEE")}</div>
          <div style={{width:26,height:26,borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:isToday?700:500,margin:"2px auto 0",transition:"background-color 0.2s ease"}}>{format(day,"d")}</div>
        </div>
        <RoleSplit servers={servers} cooks={cooks} skeleton={data.initialLoading}
          draggable={isManager} onDragStartShift={id=>{setDragShiftId(id);}} onDragEndShift={()=>{setDragShiftId(null);setDragOverDay(null);}}/>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)"}}>
      {showPw && <PasswordModal onSuccess={()=>{setIsManager(true);setShowPw(false);if(pending){pending();setPending(null);}}} onCancel={()=>{setShowPw(false);setPending(null);}}/>}
      {showExport && <ExportModal employees={data.employees} rangeStart={rangeStart} rangeEnd={rangeEnd} onClose={()=>setShowExport(false)}/>}
      {showShare && <ShareModal employees={data.employees} onClose={()=>setShowShare(false)}/>}
      {showTemplates && (
        <TemplatesModal templates={templates} currentWeekShifts={currentWeekShifts} weekStart={weekStartDate}
          employees={data.employees} timeSlots={data.timeSlots}
          onSaveTemplate={handleSaveTemplate} onApplyTemplate={handleApplyTemplate} onDeleteTemplate={handleDeleteTemplate}
          onClose={()=>setShowTemplates(false)}/>
      )}
      {toast && <Toast message={toast.message} actionLabel={toast.actionLabel} onAction={toast.onAction} onDismiss={()=>setToast(null)}/>}

      {/* Header */}
      <header style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <span style={{fontSize:15,fontWeight:600,letterSpacing:"-0.3px"}}>Shift Scheduler</span>
          <nav style={{display:"flex",gap:2}}>
            {(["calendar","employees","timeslots"] as const).map(t=>(
              <button key={t} className="nav-tab" onClick={()=>{if(t!=="calendar")requireManager(()=>setTab(t));else setTab(t);}}
                style={{background:tab===t?"var(--surface2)":"transparent",color:tab===t?"var(--text)":"var(--text-2)"}}>
                {t==="calendar"?"Calendar":t==="employees"?"Employees":"Time Slots"}
              </button>
            ))}
          </nav>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isManager ? (
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:"var(--accent-light)",color:"var(--accent)",fontSize:11,fontWeight:600}}>
              <Icon.unlock/> Manager
              <button onClick={()=>{setIsManager(false);setTab("calendar");}} style={{marginLeft:4,background:"none",border:"none",cursor:"pointer",color:"var(--accent)",display:"flex",padding:0}}><Icon.x/></button>
            </div>
          ) : (
            <button onClick={()=>setShowPw(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              <Icon.lock/> Manager
            </button>
          )}
          <button onClick={()=>setShowShare(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text-2)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            <Icon.qr/> Share
          </button>
          <button onClick={()=>setDark(!dark)} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)",overflow:"hidden"}}>
            <span key={dark?"sun":"moon"} className="theme-icon-spin">{dark?<Icon.sun/>:<Icon.moon/>}</span>
          </button>
        </div>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 24px"}}>
        {/* ── Calendar ── */}
        {tab==="calendar" && (
          <div key="calendar" className="tab-fade" style={{display:"flex",gap:20}}>
            {/* Left: calendar grid */}
            <div style={{flex:1,minWidth:0}}>
              <CalNav label={nav.label} onPrev={nav.prev} onNext={nav.next} onToday={nav.today}
                viewMode={viewMode} setViewMode={setViewMode}
                onExport={()=>setShowExport(true)} onPrint={handlePrint}
                onTemplates={()=>requireManager(()=>setShowTemplates(true))}
                onCopyWeek={handleCopyPreviousWeek}
                onClearWeek={()=>{
                  if (data.shifts.length===0) return;
                  if (!confirm(`Clear all ${data.shifts.length} shift${data.shifts.length!==1?"s":""} this week?`)) return;
                  data.clearWeek().then(removed=>{
                    if (removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`, actionLabel:"Undo", onAction:()=>data.restoreShifts(removed)});
                  });
                }}
                isMobile={false} isManager={isManager}/>

              {/* Day headers — month view only (week cells render their own labels) */}
              {viewMode==="month" && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>(
                    <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text-3)",padding:"4px 0",letterSpacing:"0.5px",textTransform:"uppercase"}}>{d}</div>
                  ))}
                </div>
              )}

              {viewMode==="month" && (
                <div key={anchor.toString()} className="cal-fade" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"var(--border)",borderRadius:12,overflow:"hidden"}}>
                  {monthDays.map(day=><MonthCell key={day.toString()} day={day}/>)}
                </div>
              )}

              {viewMode==="week" && (
                <div key={anchor.toString()} className="cal-fade" style={{display:"flex",gap:1,background:"var(--border)",borderRadius:12,overflow:"hidden"}}>
                  {weekDays.map(day=><WeekCell key={day.toString()} day={day}/>)}
                </div>
              )}
            </div>

            {/* Right: detail / form panel */}
            {selectedDay && (
              <div key={selectedDay.toString()+panelMode} className="panel-slide-in" style={{width:320,flexShrink:0,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:20,alignSelf:"flex-start",position:"sticky",top:24}}>
                {panelMode==="detail" && (
                  <DayDetail
                    day={selectedDay}
                    shifts={data.shiftsForDay(selectedDay)}
                    isManager={isManager}
                    onCreateShift={()=>requireManager(()=>setPanelMode("create"))}
                    onEditShift={s=>{setEditingShift(s);setPanelMode("edit");}}
                    onDeleteShift={async id=>{
                      const removed = await data.deleteShiftWithUndo(id);
                      if (removed) setToast({message:`Shift deleted.`, actionLabel:"Undo", onAction:()=>data.restoreDeletedShift(removed)});
                    }}
                    onClearDay={()=>{
                      if (!confirm(`Clear all ${data.shiftsForDay(selectedDay).length} shift${data.shiftsForDay(selectedDay).length!==1?"s":""}  on ${format(selectedDay,"MMMM d")}?`)) return;
                      const dateStr = format(selectedDay,"yyyy-MM-dd");
                      data.clearDay(dateStr).then(removed=>{
                        if (removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`, actionLabel:"Undo", onAction:()=>data.restoreShifts(removed)});
                      });
                    }}
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
                      existingCount={data.shiftsForDay(selectedDay).length}
                      onClearDay={panelMode==="create"?()=>{
                        const dayShifts = data.shiftsForDay(selectedDay);
                        if (!confirm(`Clear all ${dayShifts.length} shift${dayShifts.length!==1?"s":""} on ${format(selectedDay,"MMMM d")}?`)) return;
                        data.clearDay(format(selectedDay,"yyyy-MM-dd")).then(removed=>{
                          if (removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`, actionLabel:"Undo", onAction:()=>data.restoreShifts(removed)});
                        });
                      }:undefined}
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
          <div key="employees" className="tab-fade">
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
          <div key="timeslots" className="tab-fade">
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
        *{transition:background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;}
        .icon-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-2);transition:background 0.15s ease, transform 0.1s ease;}
        .icon-btn:hover{background:var(--surface2);transform:scale(1.06);}
        .icon-btn:active{transform:scale(0.92);}
        button{transition:background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;}
        button:active{transform:scale(0.97);}
        .btn-primary{transition:background-color 0.15s ease, opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;}
        .btn-primary:hover:not(:disabled){box-shadow:0 4px 14px rgba(0,0,0,0.12);transform:translateY(-1px);}
        .btn-primary:active:not(:disabled){transform:translateY(0) scale(0.96);box-shadow:none;}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(2px);animation:fadeIn 0.15s ease;}
        .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:modalIn 0.18s ease;}
        .modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:1px solid var(--border);}
        .modal-title{font-size:15px;font-weight:600;letter-spacing:-0.3px;}
        input:focus{border-color:var(--accent)!important;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px;}
        .cal-fade{animation:fadeSlide 0.22s ease;}
        .tab-fade{animation:fadeSlide 0.2s ease;}
        .panel-slide-in{animation:slideInRight 0.22s ease;}
        .day-cell{transition:background-color 0.18s ease;}
        .day-cell:hover{background:var(--surface2)!important;}
        .day-cell-selected{box-shadow:inset 0 0 0 2px var(--accent);}
        .entry-pop{animation:popIn 0.2s ease;}
        .entry-hover{transition:transform 0.15s ease, box-shadow 0.15s ease;cursor:default;}
        .entry-hover:hover{transform:translateX(2px) scale(1.01);box-shadow:0 2px 10px rgba(0,0,0,0.08);}
        .select-bounce{animation:bounce 0.25s ease;}
        .theme-icon-spin{display:flex;animation:spinIn 0.35s ease;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes modalIn{from{opacity:0;transform:translateY(8px) scale(0.98);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85);}to{opacity:1;transform:scale(1);}}
        @keyframes bounce{0%{transform:scale(1);}40%{transform:scale(1.08);}100%{transform:scale(1);}}
        @keyframes spinIn{from{opacity:0;transform:rotate(-90deg) scale(0.6);}to{opacity:1;transform:rotate(0deg) scale(1);}}
        .toast-pop{animation:toastIn 0.25s ease;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
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
  const [showExport,    setShowExport]   = useState(false);
  const [showShare,     setShowShare]    = useState(false);
  const [showTemplates, setShowTemplates]= useState(false);
  const [templates,     setTemplates]    = useState<Template[]>([]);
  const [toast,         setToast]        = useState<{message:string;actionLabel?:string;onAction?:()=>void}|null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);
  useEffect(()=>{ loadTemplates(); },[loadTemplates]);

  const handleSaveTemplate = async (name:string, entries:TemplateEntry[]) => {
    await fetch("/api/templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,data:entries})});
    await loadTemplates();
  };
  const handleDeleteTemplate = async (id:string) => {
    await fetch("/api/templates",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    await loadTemplates();
  };
  const handleApplyTemplate = async (entries:TemplateEntry[]) => {
    const weekMonday = startOfWeek(anchor,{weekStartsOn:1});
    const batch = entries.map(e=>({
      employeeId:e.employeeId, timeSlotId:e.timeSlotId, role:e.role,
      date:format(new Date(weekMonday.getTime()+e.dayOffset*86400000),"yyyy-MM-dd"),
    }));
    await data.addShiftBatch(batch);
    setShowTemplates(false);
    setToast({message:`Applied template — ${batch.length} shift${batch.length!==1?"s":""} added.`});
  };
  const handleCopyPreviousWeek = async () => {
    requireManager(async () => {
      const prevWeekStart = format(subWeeks(startOfWeek(anchor,{weekStartsOn:1}),1),"yyyy-MM-dd");
      const prevWeekEnd   = format(subWeeks(endOfWeek(anchor,{weekStartsOn:1}),1),"yyyy-MM-dd");
      const res = await fetch(`/api/shifts?start=${prevWeekStart}&end=${prevWeekEnd}`);
      const prevShifts: Shift[] = await res.json();
      if (prevShifts.length===0){setToast({message:"No shifts found in previous week."});return;}
      const thisWeekStart = startOfWeek(anchor,{weekStartsOn:1});
      const batch = prevShifts.map(s=>{
        const offset = Math.round((parseISO(s.date).getTime()-parseISO(prevWeekStart).getTime())/86400000);
        return {employeeId:s.employeeId,timeSlotId:s.timeSlotId,role:s.role,date:format(new Date(thisWeekStart.getTime()+offset*86400000),"yyyy-MM-dd")};
      });
      await data.addShiftBatch(batch);
      setToast({message:`Copied ${batch.length} shift${batch.length!==1?"s":""} from last week.`});
    });
  };

  const rangeStart = viewMode==="month"
    ? format(startOfMonth(anchor),"yyyy-MM-dd")
    : format(startOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");
  const rangeEnd = viewMode==="month"
    ? format(endOfMonth(anchor),"yyyy-MM-dd")
    : format(endOfWeek(anchor,{weekStartsOn:1}),"yyyy-MM-dd");

  const data = useSchedulerData(rangeStart, rangeEnd);

  const currentWeekShifts = viewMode==="week" ? data.shifts : [];
  const weekStartDate = startOfWeek(anchor,{weekStartsOn:1});

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

  // Swipe navigation
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)*1.5) {
      if (dx > 0) nav.prev(); else nav.next();
    }
  };

  return (
    <div style={{height:"100vh",overflow:"hidden",background:"var(--bg)",color:"var(--text)",display:"flex",flexDirection:"column"}}>
      {showPw&&<PasswordModal onSuccess={()=>{setIsManager(true);setShowPw(false);if(pending){pending();setPending(null);}}} onCancel={()=>{setShowPw(false);setPending(null);}}/>}
      {showExport&&<ExportModal employees={data.employees} rangeStart={rangeStart} rangeEnd={rangeEnd} onClose={()=>setShowExport(false)}/>}
      {showShare&&<ShareModal employees={data.employees} onClose={()=>setShowShare(false)}/>}
      {showTemplates&&(
        <TemplatesModal templates={templates} currentWeekShifts={currentWeekShifts} weekStart={weekStartDate}
          employees={data.employees} timeSlots={data.timeSlots}
          onSaveTemplate={handleSaveTemplate} onApplyTemplate={handleApplyTemplate} onDeleteTemplate={handleDeleteTemplate}
          onClose={()=>setShowTemplates(false)}/>
      )}
      {toast&&<Toast message={toast.message} actionLabel={toast.actionLabel} onAction={toast.onAction} onDismiss={()=>setToast(null)}/>}

      {/* Top bar */}
      <header style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,flexShrink:0}}>
        <span style={{fontSize:15,fontWeight:700,letterSpacing:"-0.3px"}}>
          {tab==="calendar"?nav.label:tab==="employees"?"Employees":"Time Slots"}
        </span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {isManager ? (
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,background:"var(--accent-light)",color:"var(--accent)",fontSize:11,fontWeight:600}}>
              <Icon.unlock/> Mgr
              <button onClick={()=>{setIsManager(false);setTab("calendar");}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",display:"flex",padding:0,marginLeft:2}}><Icon.x/></button>
            </div>
          ) : (
            <button onClick={()=>setShowPw(true)} style={{width:34,height:34,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}>
              <Icon.lock/>
            </button>
          )}
          <button onClick={()=>setShowShare(true)} style={{width:34,height:34,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)"}}>
            <Icon.qr/>
          </button>
          <button onClick={()=>setDark(!dark)} style={{width:34,height:34,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-2)",overflow:"hidden"}}>
            <span key={dark?"sun":"moon"} className="theme-icon-spin">{dark?<Icon.sun/>:<Icon.moon/>}</span>
          </button>
        </div>
      </header>

      {/* ── CALENDAR ── */}
      {tab==="calendar" && (
        <div key="calendar" className="tab-fade" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{padding:"12px 10px 0",display:"flex",flexDirection:"column",height:"calc(100vh - 52px - 60px)"}}>
          <CalNav label={nav.label} onPrev={nav.prev} onNext={nav.next} onToday={nav.today}
            viewMode={viewMode} setViewMode={setViewMode}
            onExport={()=>setShowExport(true)} onPrint={()=>window.print()}
            onTemplates={()=>requireManager(()=>setShowTemplates(true))}
            onCopyWeek={handleCopyPreviousWeek}
            onClearWeek={()=>{
              if (data.shifts.length===0) return;
              if (!confirm(`Clear all ${data.shifts.length} shift${data.shifts.length!==1?"s":""} this week?`)) return;
              data.clearWeek().then(removed=>{
                if (removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`, actionLabel:"Undo", onAction:()=>data.restoreShifts(removed)});
              });
            }}
            isMobile={true} isManager={isManager}/>
          <div key={anchor.toString()+viewMode} className="cal-fade" style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>

          {/* Day headers — month view only (Mon–Sun) */}
          {viewMode==="month" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
              {["M","T","W","T","F","S","S"].map((d,i)=>(
                <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text-3)",padding:"3px 0"}}>{d}</div>
              ))}
            </div>
          )}

          {/* Monthly view — fills remaining height, dot-based agenda style */}
          {viewMode==="month" && (
            <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",gridAutoRows:"1fr",gap:1,background:"var(--border)",borderRadius:10,overflow:"hidden"}}>
              {monthDays.map(day=>{
                const inMonth = isSameMonth(day,anchor);
                const isToday = isSameDay(day,today);
                const ds = data.shiftsForDay(day);
                const maxDots = 6;
                const shown = ds.slice(0,maxDots);
                const extra = ds.length - shown.length;
                return (
                  <div key={day.toString()} onClick={()=>{if(inMonth){setSelectedDay(day);setSheet("day");}}}
                    style={{background:"var(--surface)",padding:"4px 3px",cursor:inMonth?"pointer":"default",opacity:inMonth?1:0.3,display:"flex",flexDirection:"column",alignItems:"center",gap:3,overflow:"hidden"}}>
                    <span style={{fontSize:11,fontWeight:isToday?700:400,width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--text)",flexShrink:0}}>{format(day,"d")}</span>
                    {ds.length>0 && (
                      <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:2,maxWidth:"100%"}}>
                        {shown.map(s=>(
                          <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:s.timeSlotColor,flexShrink:0}}/>
                        ))}
                        {extra>0 && <span style={{fontSize:8,color:"var(--text-3)",fontWeight:600,lineHeight:"6px"}}>{`+${extra}`}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Weekly view — fills remaining height, Google Calendar style */}
          {viewMode==="week" && (
            <div style={{flex:1,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",display:"flex",flexDirection:"column"}}>
              {/* Day header row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"var(--surface2)",borderBottom:"1px solid var(--border)",flexShrink:0}}>
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
              {/* Server row — half the remaining space */}
              <div style={{flex:1,display:"flex",flexDirection:"column",background:"var(--surface)",minHeight:0}}>
                <div style={{fontSize:9,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",padding:"4px 8px 3px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",flexShrink:0}}>Servers</div>
                <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",overflow:"hidden"}}>
                  {weekDays.map(day=>{
                    const servers = data.shiftsForDay(day).filter(s=>s.role==="Server");
                    return (
                      <div key={day.toString()} onClick={()=>{setSelectedDay(day);setSheet("day");}}
                        style={{padding:"3px",borderRight:"1px solid var(--border)",cursor:"pointer",display:"flex",flexDirection:"column",gap:2,overflow:"hidden"}}>
                        {servers.map(s=>(
                          <div key={s.id} style={{padding:"3px 4px",borderRadius:4,background:hexToRgba(s.timeSlotColor,0.18),borderLeft:`3px solid ${s.timeSlotColor}`,fontSize:9,fontWeight:600,color:"var(--text)",lineHeight:1.3,flexShrink:0}}>
                            <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.employeeName}</div>
                            <div style={{fontSize:8,color:"var(--text-2)",opacity:0.8,fontFamily:"monospace"}}>{s.timeSlotStart}–{s.timeSlotEnd}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Divider */}
              <div style={{height:1,background:"var(--border)",flexShrink:0}}/>
              {/* Cook row — half the remaining space */}
              <div style={{flex:1,display:"flex",flexDirection:"column",background:"var(--surface)",minHeight:0}}>
                <div style={{fontSize:9,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.4px",padding:"4px 8px 3px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",flexShrink:0}}>Cooks</div>
                <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",overflow:"hidden"}}>
                  {weekDays.map(day=>{
                    const cooks = data.shiftsForDay(day).filter(s=>s.role==="Cook");
                    return (
                      <div key={day.toString()} onClick={()=>{setSelectedDay(day);setSheet("day");}}
                        style={{padding:"3px",borderRight:"1px solid var(--border)",cursor:"pointer",display:"flex",flexDirection:"column",gap:2,overflow:"hidden"}}>
                        {cooks.map(s=>(
                          <div key={s.id} style={{padding:"3px 4px",borderRadius:4,background:hexToRgba(s.timeSlotColor,0.18),borderLeft:`3px solid ${s.timeSlotColor}`,fontSize:9,fontWeight:600,color:"var(--text)",lineHeight:1.3,flexShrink:0}}>
                            <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.employeeName}</div>
                            <div style={{fontSize:8,color:"var(--text-2)",opacity:0.8,fontFamily:"monospace"}}>{s.timeSlotStart}–{s.timeSlotEnd}</div>
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
        </div>
      )}

      {/* ── EMPLOYEES ── */}
      {tab==="employees" && (
        <div key="employees" className="tab-fade" style={{flex:1,overflowY:"auto",padding:"16px 16px 80px"}}>
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
        <div key="timeslots" className="tab-fade" style={{flex:1,overflowY:"auto",padding:"16px 16px 80px"}}>
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
                onDeleteShift={async id=>{
                  const removed = await data.deleteShiftWithUndo(id);
                  if(removed) setToast({message:"Shift deleted.",actionLabel:"Undo",onAction:()=>data.restoreDeletedShift(removed)});
                }}
                onClearDay={()=>{
                  const dayShifts = data.shiftsForDay(selectedDay);
                  if (!confirm(`Clear all ${dayShifts.length} shift${dayShifts.length!==1?"s":""} on ${format(selectedDay,"MMMM d")}?`)) return;
                  data.clearDay(format(selectedDay,"yyyy-MM-dd")).then(removed=>{
                    if(removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`,actionLabel:"Undo",onAction:()=>data.restoreShifts(removed)});
                    closeSheet();
                  });
                }}
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
                existingCount={data.shiftsForDay(selectedDay).length}
                onClearDay={()=>{
                  const dayShifts = data.shiftsForDay(selectedDay);
                  if (!confirm(`Clear all ${dayShifts.length} shift${dayShifts.length!==1?"s":""} on ${format(selectedDay,"MMMM d")}?`)) return;
                  data.clearDay(format(selectedDay,"yyyy-MM-dd")).then(removed=>{
                    if(removed.length>0) setToast({message:`Cleared ${removed.length} shift${removed.length!==1?"s":""}.`,actionLabel:"Undo",onAction:()=>data.restoreShifts(removed)});
                  });
                }}
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
              <button onClick={async()=>{
                const removed = await data.deleteShiftWithUndo(editingShift.id);
                if(removed) setToast({message:"Shift deleted.",actionLabel:"Undo",onAction:()=>data.restoreDeletedShift(removed)});
                setSheet("day");
              }}
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
        *{transition:background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;}
        .icon-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-2);transition:background 0.15s ease, transform 0.1s ease;}
        .icon-btn:hover{background:var(--surface2);}
        .icon-btn:active{transform:scale(0.92);}
        button{transition:background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;}
        button:active{transform:scale(0.97);}
        .btn-primary{transition:background-color 0.15s ease, opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;}
        .btn-primary:active:not(:disabled){transform:scale(0.96);box-shadow:none;}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(2px);animation:fadeIn 0.15s ease;}
        .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:modalIn 0.18s ease;}
        .modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:1px solid var(--border);}
        .modal-title{font-size:15px;font-weight:600;letter-spacing:-0.3px;}
        input:focus{border-color:var(--accent)!important;}
        .cal-fade{animation:fadeSlide 0.22s ease;}
        .tab-fade{animation:fadeSlide 0.2s ease;}
        .entry-pop{animation:popIn 0.2s ease;}
        .entry-hover{transition:transform 0.15s ease, box-shadow 0.15s ease;}
        .select-bounce{animation:bounce 0.25s ease;}
        .theme-icon-spin{display:flex;animation:spinIn 0.35s ease;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes modalIn{from{opacity:0;transform:translateY(8px) scale(0.98);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85);}to{opacity:1;transform:scale(1);}}
        @keyframes bounce{0%{transform:scale(1);}40%{transform:scale(1.08);}100%{transform:scale(1);}}
        @keyframes spinIn{from{opacity:0;transform:rotate(-90deg) scale(0.6);}to{opacity:1;transform:rotate(0deg) scale(1);}}
        .toast-pop{animation:toastIn 0.25s ease;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export type InitialData = {
  rangeKey: string;
  employees: Employee[];
  timeSlots: TimeSlot[];
  shifts: Shift[];
};

export default function ClientApp({ initialData, initialDataAlt }: { initialData?: InitialData; initialDataAlt?: InitialData }) {
  const [dark,     setDark]     = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  // Seed the module-level cache synchronously (before any child mounts)
  // so the first render of useSchedulerData already has data for the
  // server-preloaded ranges — no client fetch, no spinner on first paint.
  // Only do this in the browser: this module is also evaluated during SSR,
  // where dataCache is a shared singleton across concurrent requests.
  if (typeof window !== "undefined") {
    for (const d of [initialData, initialDataAlt]) {
      if (d && !dataCache.has(d.rangeKey)) {
        dataCache.set(d.rangeKey, { employees: d.employees, timeSlots: d.timeSlots, shifts: d.shifts });
      }
    }
  }

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
