"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";

type Shift = {
  id: string; date: string; role: "Server"|"Cook";
  timeSlotLabel: string; timeSlotStart: string; timeSlotEnd: string; timeSlotColor: string;
};

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ScheduleContent() {
  const params = useSearchParams();
  const employeeId = params.get("id") || "";
  const [dark, setDark] = useState(false);
  const [data, setData] = useState<{employee:{id:string;name:string}; shifts:Shift[]}|null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("shift-dark-mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved!==null ? saved==="true" : prefersDark;
    setDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  useEffect(() => {
    if (!employeeId) { setError("No employee specified."); return; }
    fetch(`/api/employee-schedule?id=${employeeId}`)
      .then(async r => {
        const d = await r.json();
        if (d.error) setError(`Error: ${d.error}`);
        else setData(d);
      })
      .catch(err => setError(`Network error: ${err.message}`));
  }, [employeeId]);

  if (error) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif"}}>
        <p style={{color:"var(--text-2)"}}>{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif"}}>
        <p style={{color:"var(--text-2)"}}>Loading…</p>
      </div>
    );
  }

  // Group shifts by date
  const byDate: Record<string, Shift[]> = {};
  for (const s of data.shifts) {
    (byDate[s.date] ??= []).push(s);
  }
  const dates = Object.keys(byDate).sort();

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif"}}>
      <header style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,color:"var(--text-2)",fontWeight:500}}>Schedule for</div>
          <div style={{fontSize:20,fontWeight:700,letterSpacing:"-0.3px"}}>{data.employee.name}</div>
        </div>
        <button onClick={()=>{
          const v = !dark;
          setDark(v);
          localStorage.setItem("shift-dark-mode", String(v));
          document.documentElement.classList.toggle("dark", v);
        }} style={{width:36,height:36,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface2)",cursor:"pointer",color:"var(--text-2)"}}>
          {dark ? "☀️" : "🌙"}
        </button>
      </header>

      <main style={{maxWidth:600,margin:"0 auto",padding:"20px 16px 60px"}}>
        <div style={{fontSize:12,color:"var(--text-3)",marginBottom:16,textAlign:"center"}}>
          Showing this week through the next 3 weeks. Subscribe below to keep this updated automatically.
        </div>

        {dates.length===0 && (
          <p style={{textAlign:"center",color:"var(--text-3)",marginTop:40}}>No upcoming shifts scheduled.</p>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {dates.map(date=>(
            <div key={date} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px"}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{format(parseISO(date),"EEEE, MMMM d")}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {byDate[date].map(s=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:hexToRgba(s.timeSlotColor,0.12),borderLeft:`4px solid ${s.timeSlotColor}`}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600}}>{s.timeSlotLabel}</span>
                      <span style={{fontSize:12,color:"var(--text-2)",marginLeft:8,fontFamily:"monospace"}}>{s.timeSlotStart}–{s.timeSlotEnd}</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:hexToRgba(s.timeSlotColor,0.2),color:s.timeSlotColor}}>{s.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:30,padding:"16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📅 Subscribe to your schedule</div>
          <p style={{fontSize:12,color:"var(--text-2)",margin:"0 0 10px",lineHeight:1.5}}>
            Add this link as a calendar subscription in Google Calendar, Apple Calendar, or Outlook to get automatic updates whenever your shifts change.
          </p>
          <div style={{display:"flex",gap:8}}>
            <input readOnly value={typeof window!=="undefined" ? `${window.location.origin}/api/feed?id=${employeeId}` : ""}
              onClick={e=>(e.target as HTMLInputElement).select()}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--text)",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
            <button onClick={()=>{
              navigator.clipboard.writeText(`${window.location.origin}/api/feed?id=${employeeId}`);
            }} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Copy
            </button>
          </div>
        </div>
      </main>

      <style jsx global>{`
        :root {
          --bg: #f7f6f3; --surface: #ffffff; --surface2: #f0efe9; --border: #e2e0d8;
          --text: #1a1917; --text-2: #6b6860; --text-3: #9b9890; --accent: #2d6a4f;
        }
        .dark {
          --bg: #111110; --surface: #1c1c1a; --surface2: #242422; --border: #2e2e2b;
          --text: #f0ede8; --text-2: #8a8780; --text-3: #5a5854; --accent: #52b788;
        }
        body { margin: 0; transition: background-color 0.2s ease, color 0.2s ease; }
      `}</style>
    </div>
  );
}

export default function MySchedulePage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#f7f6f3"}}/>}>
      <ScheduleContent/>
    </Suspense>
  );
}
