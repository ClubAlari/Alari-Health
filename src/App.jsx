import { useState, useEffect, useRef, useCallback } from "react";
import { loadUserData, saveUserData, shareSplit, loadSharedSplit, sendFriendRequest, getFriends, respondFriendRequest, removeFriend, syncPublicPRs, getFriendPRs, getGlobalLeaderboard } from "./supabase";
import { NutritionTab, nutritionStyles } from "./Nutrition";

const STORAGE_KEY = "alari_health_data";

const DEFAULT_EXERCISES = [
  // Arms
  { id: "tricep-pulldown", name: "Tricep Pulldown", category: "Arms" },
  { id: "bicep-curl", name: "Bicep Curl", category: "Arms" },
  { id: "hammer-curl", name: "Hammer Curl", category: "Arms" },
  { id: "tricep-dip", name: "Tricep Dip", category: "Arms" },
  { id: "cable-curl", name: "Cable Curl", category: "Arms" },
  { id: "skull-crusher", name: "Skull Crusher", category: "Arms" },
  { id: "preacher-curl", name: "Preacher Curl", category: "Arms" },
  { id: "overhead-tricep-ext", name: "Overhead Tricep Extension", category: "Arms" },
  { id: "concentration-curl", name: "Concentration Curl", category: "Arms" },
  { id: "reverse-curl", name: "Reverse Curl", category: "Arms" },
  // Back
  { id: "lat-pulldown", name: "Lat Pulldown", category: "Back" },
  { id: "seated-row", name: "Seated Row", category: "Back" },
  { id: "pull-up", name: "Pull Up", category: "Back" },
  { id: "single-arm-row", name: "Single Arm Dumbbell Row", category: "Back" },
  { id: "cable-row", name: "Cable Row", category: "Back" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", category: "Back" },
  { id: "hyperextension", name: "Hyperextension", category: "Back" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "Back" },
  { id: "t-bar-row", name: "T-Bar Row", category: "Back" },
  { id: "chin-up", name: "Chin Up", category: "Back" },
  // Chest
  { id: "bench-press", name: "Bench Press", category: "Chest" },
  { id: "incline-bench-press", name: "Incline Bench Press", category: "Chest" },
  { id: "decline-bench-press", name: "Decline Bench Press", category: "Chest" },
  { id: "chest-fly", name: "Chest Fly", category: "Chest" },
  { id: "cable-crossover", name: "Cable Crossover", category: "Chest" },
  { id: "pec-deck", name: "Pec Deck", category: "Chest" },
  { id: "push-up", name: "Push Up", category: "Chest" },
  { id: "dumbbell-press", name: "Dumbbell Press", category: "Chest" },
  { id: "incline-fly", name: "Incline Fly", category: "Chest" },
  // Shoulders
  { id: "shoulder-press", name: "Shoulder Press", category: "Shoulders" },
  { id: "lateral-raise", name: "Lateral Raise", category: "Shoulders" },
  { id: "face-pull", name: "Face Pull", category: "Shoulders" },
  { id: "upright-row", name: "Upright Row", category: "Shoulders" },
  { id: "arnold-press", name: "Arnold Press", category: "Shoulders" },
  { id: "front-raise", name: "Front Raise", category: "Shoulders" },
  { id: "reverse-fly", name: "Reverse Fly", category: "Shoulders" },
  { id: "cable-lateral-raise", name: "Cable Lateral Raise", category: "Shoulders" },
  { id: "shrug", name: "Shrug", category: "Shoulders" },
  // Legs
  { id: "leg-press", name: "Leg Press", category: "Legs" },
  { id: "squat", name: "Squat", category: "Legs" },
  { id: "deadlift", name: "Deadlift", category: "Legs" },
  { id: "leg-curl", name: "Leg Curl", category: "Legs" },
  { id: "leg-extension", name: "Leg Extension", category: "Legs" },
  { id: "calf-raise", name: "Calf Raise", category: "Legs" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "Legs" },
  { id: "hip-thrust", name: "Hip Thrust", category: "Legs" },
  { id: "sumo-deadlift", name: "Sumo Deadlift", category: "Legs" },
  { id: "walking-lunge", name: "Walking Lunge", category: "Legs" },
  { id: "hack-squat", name: "Hack Squat", category: "Legs" },
  { id: "glute-bridge", name: "Glute Bridge", category: "Legs" },
  { id: "goblet-squat", name: "Goblet Squat", category: "Legs" },
  // Core
  { id: "plank", name: "Plank", category: "Core" },
  { id: "crunch", name: "Crunch", category: "Core" },
  { id: "russian-twist", name: "Russian Twist", category: "Core" },
  { id: "leg-raise", name: "Leg Raise", category: "Core" },
  { id: "cable-crunch", name: "Cable Crunch", category: "Core" },
  { id: "ab-rollout", name: "Ab Rollout", category: "Core" },
  { id: "hanging-knee-raise", name: "Hanging Knee Raise", category: "Core" },
  { id: "dead-bug", name: "Dead Bug", category: "Core" },
  { id: "pallof-press", name: "Pallof Press", category: "Core" },
];

const WEIGHT_INCREMENTS = { Arms: 2.5, Shoulders: 2.5, Back: 5, Chest: 5, Legs: 5, Core: 2.5 };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function formatDate(iso) { return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }); }
function formatTime(iso) { return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }); }
function getTodayDay() { return DAYS[new Date().getDay()]; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function calc1RM(weight, reps) { if (!weight || !reps) return null; if (reps === 1) return weight; return Math.round(weight * (1 + reps / 30)); }
function fmtSecs(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
function genId() { return Math.random().toString(36).slice(2,10); }

// Returns the active split variant data for a given day (backwards-compatible)
function getDayActive(day, userData) {
  const variants = userData.dayVariants?.[day];
  if (variants?.length) {
    const activeId = userData.activeVariants?.[day] || variants[0].id;
    return variants.find(v => v.id === activeId) || variants[0];
  }
  return {
    id: null,
    label: userData.splitLabels?.[day] || "",
    muscles: userData.splitMuscles?.[day] || [],
    exercises: userData.splits?.[day] || [],
  };
}

// Compute public PR map from userData { exId: { weight, reps, date } }
function buildPublicPRs(userData) {
  const result = {};
  const exercises = userData.exerciseList || [];
  exercises.forEach(ex => {
    const hist = userData.exercises[ex.id]?.history || [];
    const manual = userData.manualPRs?.[ex.id] || [];
    const all = [...hist, ...manual];
    if (!all.length) return;
    const best = all.reduce((a,b) => calc1RM(b.weight,b.reps) > calc1RM(a.weight,a.reps) ? b : a, all[0]);
    result[ex.id] = { name: ex.name, category: ex.category, weight: best.weight, reps: best.reps, date: best.date };
  });
  return result;
}

// ─────────────────── ICONS ───────────────────
const I = {
  Trophy: ({s=20}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  History: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Fire: ({s=16}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.6 0-8-2.4-8-8.5C4 9 8 4 12 1c4 3 8 8 8 13.5 0 6.1-4.4 8.5-8 8.5Zm0-19C9 7.2 6 11 6 14.5 6 19 9.6 21 12 21s6-2 6-6.5C18 11 15 7.2 12 4Z"/></svg>,
  Dumbbell: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Chart: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Calendar: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Camera: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Home: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  ChevUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
  ChevDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Grip: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>,
  User: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Palette: ({s=18}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10c0 2-1 3.5-3 3.5h-2c-1 0-2 1-2 2 0 1.5 1.5 2 1 3.5-.5 1-2 1-4 1z"/></svg>,
  Share: ({s=18}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Download: ({s=18}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Users: ({s=22}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Question: ({s=18}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Medal: ({s=18}={}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="6"/><path d="M12 2v4"/><path d="m5 7 2 4"/><path d="m19 7-2 4"/><path d="M12 14v2"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>,
};

// ─────────────────── HELP MODAL ───────────────────
const HELP_STEPS = [
  { icon:"🏋️", title:"Build Your Exercise Library", body:"Go to the Library tab (Exercise icon). Add exercises you do from the presets, or create custom ones. Each exercise tracks its own history and goal." },
  { icon:"📅", title:"Set Up Your Weekly Split", body:"In the Split tab, assign exercises to each day of the week. Name each day (Push Day, Legs, etc.) and tag the muscle groups. You can add multiple variants per day — like 'Glute Focus A' and 'Glute Focus B' — and swap between them." },
  { icon:"🎯", title:"Set a Goal for Each Exercise", body:"Open any exercise and tap the edit icon on the Goal card. Set a weight and a rep range (e.g. 8–10 reps × 80kg). The app tracks when you hit the top of your range and suggests moving up." },
  { icon:"📝", title:"Log Your Best Set", body:"On the exercise detail page, tap Log Set. Select whether you used straps or not — both are tracked separately. The app remembers your last entry for each grip type as a starting point." },
  { icon:"🔄", title:"Use the Rest Timer", body:"After logging a set, the rest timer opens automatically. Choose how long you need — the app counts down and closes when you're ready to go again." },
  { icon:"🏠", title:"Home Screen Shortcuts", body:"The Home tab shows only today's exercises. Tap any card to open that exercise directly. Use the calendar icon to swap to a different day's split, or the variant chip to switch between workout variants for today." },
  { icon:"🏆", title:"Track Your PRs", body:"The PRs tab shows your all-time best for every exercise with an estimated 1RM. You can also log manual PRs from before you started using the app." },
  { icon:"👥", title:"Compete with Friends", body:"In the Friends tab, add friends by their phone number. Once they accept, you can compare PRs exercise by exercise and see who's lifting more. 🏆 marks the winner." },
  { icon:"📈", title:"Monitor Progress", body:"The Progress tab shows a chart of your weight over time for any exercise. Growth tab tracks your body weight and lets you log progress photos." },
  { icon:"🎨", title:"Customise the App", body:"Tap the palette icon on the Home tab to switch between Dark Mode (Black & Gold), Light Mode (White & Gold), and Energy Mode (Black & Neon Green)." },
];

function HelpModal({ onClose }) {
  const [step, setStep] = useState(0);
  const s = HELP_STEPS[step];
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal ah-help-modal" onClick={e=>e.stopPropagation()}>
      <div className="ah-help-progress">
        {HELP_STEPS.map((_,i) => <div key={i} className={`ah-help-dot ${i===step?"ah-help-dot-active":i<step?"ah-help-dot-done":""}`}/>)}
      </div>
      <div className="ah-help-icon">{s.icon}</div>
      <h2 className="ah-help-title">{s.title}</h2>
      <p className="ah-help-body">{s.body}</p>
      <div className="ah-help-nav">
        <button className="ah-btn-secondary ah-btn-sm" onClick={()=>setStep(p=>Math.max(0,p-1))} disabled={step===0}>← Back</button>
        <span className="ah-help-count">{step+1} / {HELP_STEPS.length}</span>
        {step < HELP_STEPS.length-1
          ? <button className="ah-btn-primary ah-btn-sm" onClick={()=>setStep(p=>p+1)}>Next →</button>
          : <button className="ah-btn-primary ah-btn-sm" onClick={onClose}>Done ✓</button>}
      </div>
    </div></div>
  );
}

// ─────────────────── WELCOME ───────────────────
function WelcomeScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [fadeClass, setFadeClass] = useState("ah-splash-in");
  useEffect(() => {
    const t = setTimeout(() => { setFadeClass("ah-splash-out"); setTimeout(() => { setStep(1); setFadeClass("ah-form-in"); }, 600); }, 2200);
    return () => clearTimeout(t);
  }, []);
  const submit = () => { if (phone.length >= 6 && name.trim()) onLogin(phone.trim(), name.trim()); };
  if (step === 0) return (
    <div className={`ah-welcome ${fadeClass}`}>
      <div className="ah-welcome-logo"><div className="ah-logo-ring"/><div className="ah-logo-text"><span className="ah-logo-a">A</span><span className="ah-logo-h">H</span></div></div>
      <h1 className="ah-welcome-title">Alari Peak</h1><p className="ah-welcome-sub">Elevate your progress</p>
    </div>
  );
  return (
    <div className={`ah-welcome ${fadeClass}`}>
      <div className="ah-login-card">
        <div className="ah-login-logo-small"><span className="ah-logo-a">A</span><span className="ah-logo-h">H</span></div>
        <h1 className="ah-login-title">Welcome to<br/><span className="ah-gold">Alari Peak</span></h1>
        <p className="ah-login-sub">Enter your details to continue</p>
        <div className="ah-input-group"><label className="ah-label">Your Name</label><input className="ah-input" type="text" placeholder="e.g. Ash" value={name} onChange={e=>setName(e.target.value)}/></div>
        <div className="ah-input-group"><label className="ah-label">Phone Number</label><input className="ah-input" type="tel" placeholder="04XX XXX XXX" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
        <button className={`ah-btn-primary ${phone.length>=6&&name.trim()?"":"ah-btn-disabled"}`} onClick={submit}>Get Started</button>
      </div>
    </div>
  );
}

// ─────────────────── MODALS ───────────────────
function AddExerciseModal({ onAdd, onClose, existingIds }) {
  const [tab, setTab] = useState("preset");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Arms");
  const [sel, setSel] = useState([]);
  const avail = DEFAULT_EXERCISES.filter(e => !existingIds.includes(e.id));
  const cats = [...new Set(avail.map(e => e.category))];
  const toggle = id => setSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const add = () => {
    if (tab==="preset") avail.filter(e=>sel.includes(e.id)).forEach(e=>onAdd(e));
    else if (customName.trim()) onAdd({ id:`custom-${Date.now()}`, name:customName.trim(), category:customCategory });
    onClose();
  };
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Add Exercise</h2>
      <div className="ah-tab-row">
        <button className={`ah-tab ${tab==="preset"?"ah-tab-active":""}`} onClick={()=>setTab("preset")}>Preset</button>
        <button className={`ah-tab ${tab==="custom"?"ah-tab-active":""}`} onClick={()=>setTab("custom")}>Custom</button>
      </div>
      {tab==="preset" ? <div className="ah-preset-list">{cats.map(c=><div key={c}><p className="ah-cat-label">{c}</p>{avail.filter(e=>e.category===c).map(e=><button key={e.id} className={`ah-preset-item ${sel.includes(e.id)?"ah-preset-selected":""}`} onClick={()=>toggle(e.id)}>{e.name}{sel.includes(e.id)&&<I.Check/>}</button>)}</div>)}{avail.length===0&&<p className="ah-empty-text">All presets added</p>}</div>
      : <div className="ah-custom-form"><div className="ah-input-group"><label className="ah-label">Exercise Name</label><input className="ah-input" placeholder="e.g. Hammer Curl" value={customName} onChange={e=>setCustomName(e.target.value)}/></div><div className="ah-input-group"><label className="ah-label">Category</label><select className="ah-input ah-select" value={customCategory} onChange={e=>setCustomCategory(e.target.value)}>{["Arms","Back","Chest","Shoulders","Legs","Core"].map(c=><option key={c}>{c}</option>)}</select></div></div>}
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Cancel</button><button className="ah-btn-primary ah-btn-sm" onClick={add}>Add</button></div>
    </div></div>
  );
}

function SetGoalModal({ exercise, currentGoal, onSave, onClose }) {
  const [w, setW] = useState(currentGoal?.weight || "");
  const [minR, setMinR] = useState(currentGoal?.minReps ?? currentGoal?.targetReps ?? 8);
  const [maxR, setMaxR] = useState(currentGoal?.maxReps ?? (currentGoal?.targetReps ? currentGoal.targetReps + 2 : 10));
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Set Goal</h2><p className="ah-modal-exercise">{exercise.name}</p>
      <p className="ah-modal-sub">Once you hit the top of your rep range, you'll be prompted to increase weight.</p>
      <div className="ah-input-group"><label className="ah-label">Goal Weight (kg)</label><input className="ah-input" type="number" placeholder="e.g. 90" value={w} onChange={e=>setW(e.target.value)}/></div>
      <div className="ah-rep-range-row">
        <div className="ah-input-group ah-rep-range-field"><label className="ah-label">Min Reps</label><input className="ah-input" type="number" placeholder="8" value={minR} onChange={e=>setMinR(e.target.value)}/></div>
        <span className="ah-rep-range-dash">–</span>
        <div className="ah-input-group ah-rep-range-field"><label className="ah-label">Max Reps</label><input className="ah-input" type="number" placeholder="10" value={maxR} onChange={e=>setMaxR(e.target.value)}/></div>
      </div>
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Cancel</button><button className="ah-btn-primary ah-btn-sm" onClick={()=>{if(w&&minR&&maxR)onSave(Number(w),Number(minR),Number(maxR))}}>Save Goal</button></div>
    </div></div>
  );
}

function LogSetModal({ exercise, goal, lastNoStrapsEntry, lastStrapsEntry, onLog, onClose }) {
  // Default to the same grip as the most recent overall entry
  const mostRecent = lastStrapsEntry && lastNoStrapsEntry
    ? (new Date(lastStrapsEntry.date) > new Date(lastNoStrapsEntry.date) ? lastStrapsEntry : lastNoStrapsEntry)
    : (lastStrapsEntry || lastNoStrapsEntry);
  const [straps, setStraps] = useState(!!(mostRecent?.straps));
  const relevantLast = straps ? lastStrapsEntry : lastNoStrapsEntry;
  const [w, setW] = useState(String(relevantLast?.weight ?? goal?.weight ?? ""));
  const [r, setR] = useState(String(relevantLast?.reps ?? ""));

  // Re-fill weight/reps when toggling grip
  const handleStrapsToggle = (val) => {
    setStraps(val);
    const rel = val ? lastStrapsEntry : lastNoStrapsEntry;
    setW(String(rel?.weight ?? goal?.weight ?? ""));
    setR(String(rel?.reps ?? ""));
  };

  const goalMin = goal?.minReps ?? goal?.targetReps;
  const goalMax = goal?.maxReps ?? goal?.targetReps;
  const rNum = Number(r), wNum = Number(w);
  const inRange = goal && wNum >= goal.weight && rNum >= goalMin && rNum < goalMax;
  const hitTop  = goal && wNum >= goal.weight && rNum >= goalMax;

  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Log Set</h2><p className="ah-modal-exercise">{exercise.name}</p>

      {/* Grip toggle */}
      <div className="ah-grip-toggle">
        <button className={`ah-grip-btn ${!straps?"ah-grip-active":""}`} onClick={()=>handleStrapsToggle(false)}>🤲 No Straps</button>
        <button className={`ah-grip-btn ${straps?"ah-grip-active":""}`} onClick={()=>handleStrapsToggle(true)}>💪 With Straps</button>
      </div>

      {relevantLast && (
        <div className="ah-last-entry">
          <I.History/> Last ({straps?"straps":"no straps"}): <strong>{relevantLast.weight}kg × {relevantLast.reps} reps</strong>
          <span className="ah-last-date"> · {formatDate(relevantLast.date)}</span>
        </div>
      )}
      {goal && <div className="ah-goal-badge"><I.Trophy/> Goal: {goalMin}–{goalMax} reps × {goal.weight}kg</div>}
      <div className="ah-input-group"><label className="ah-label">Weight (kg)</label><input className="ah-input" type="number" placeholder="e.g. 90" value={w} onChange={e=>setW(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Reps Completed</label><input className="ah-input" type="number" placeholder="e.g. 8" value={r} onChange={e=>setR(e.target.value)}/></div>
      {w&&r&&inRange&&<div className="ah-range-banner">In your target range — great set!</div>}
      {w&&r&&hitTop&&<div className="ah-hit-banner"><I.Fire/> Top of range hit — ready to move up!</div>}
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Cancel</button><button className="ah-btn-primary ah-btn-sm" onClick={()=>{if(w&&r)onLog(Number(w),Number(r),straps)}}>Log Set</button></div>
    </div></div>
  );
}

// ─────────────────── REST TIMER ───────────────────
function RestTimer({ onClose }) {
  const [duration, setDuration] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const presets = [60, 90, 120, 180, 240, 300];

  useEffect(() => {
    if (duration === null || remaining <= 0) return;
    const t = setTimeout(() => setRemaining(r => { if (r <= 1) { onClose(); return 0; } return r - 1; }), 1000);
    return () => clearTimeout(t);
  }, [remaining, duration]);

  const start = (s) => { setDuration(s); setRemaining(s); };
  const pct = duration ? (remaining / duration) * 100 : 0;
  const circ = 2 * Math.PI * 44;

  if (duration === null) return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Rest Timer</h2>
      <p className="ah-modal-sub">How long do you need?</p>
      <div className="ah-timer-presets">{presets.map(s=><button key={s} className="ah-timer-preset" onClick={()=>start(s)}>{fmtSecs(s)}</button>)}</div>
      <button className="ah-btn-secondary" style={{marginTop:12}} onClick={onClose}>Skip</button>
    </div></div>
  );
  return (
    <div className="ah-modal-overlay"><div className="ah-modal ah-timer-modal" onClick={e=>e.stopPropagation()}>
      <p className="ah-timer-label">Rest</p>
      <div className="ah-timer-circle-wrap">
        <svg viewBox="0 0 100 100" className="ah-timer-svg">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--card-border)" strokeWidth="5"/>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--gold)" strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
            strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s linear"}}/>
        </svg>
        <span className="ah-timer-count">{fmtSecs(remaining)}</span>
      </div>
      <button className="ah-btn-secondary" onClick={onClose}>Skip</button>
    </div></div>
  );
}

// ─────────────────── EDIT SET MODAL ───────────────────
function EditSetModal({ entry, onSave, onClose }) {
  const [w, setW] = useState(String(entry.weight));
  const [r, setR] = useState(String(entry.reps));
  const [date, setDate] = useState(entry.date.slice(0,10));
  const [straps, setStraps] = useState(!!(entry.straps));
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Edit Set</h2>
      <div className="ah-grip-toggle" style={{marginBottom:16}}>
        <button className={`ah-grip-btn ${!straps?"ah-grip-active":""}`} onClick={()=>setStraps(false)}>🤲 No Straps</button>
        <button className={`ah-grip-btn ${straps?"ah-grip-active":""}`} onClick={()=>setStraps(true)}>💪 With Straps</button>
      </div>
      <div className="ah-input-group"><label className="ah-label">Weight (kg)</label><input className="ah-input" type="number" value={w} onChange={e=>setW(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Reps</label><input className="ah-input" type="number" value={r} onChange={e=>setR(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Date</label><input className="ah-input ah-date-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div className="ah-modal-actions">
        <button className="ah-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="ah-btn-primary ah-btn-sm" onClick={()=>{if(w&&r&&date)onSave({...entry,weight:Number(w),reps:Number(r),straps,date:new Date(date).toISOString()})}}>Save</button>
      </div>
    </div></div>
  );
}

// ─────────────────── EDIT PR MODAL ───────────────────
function EditPRModal({ entry, onSave, onClose }) {
  const [w, setW] = useState(String(entry.weight));
  const [r, setR] = useState(String(entry.reps));
  const [date, setDate] = useState(entry.date.slice(0,10));
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Edit PR</h2>
      <div className="ah-input-group"><label className="ah-label">Weight (kg)</label><input className="ah-input" type="number" value={w} onChange={e=>setW(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Reps</label><input className="ah-input" type="number" value={r} onChange={e=>setR(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Date</label><input className="ah-input ah-date-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div className="ah-modal-actions">
        <button className="ah-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="ah-btn-primary ah-btn-sm" onClick={()=>{if(w&&r&&date)onSave({...entry,weight:Number(w),reps:Number(r),date:new Date(date).toISOString()})}}>Save</button>
      </div>
    </div></div>
  );
}

// ─────────────────── EXERCISE DETAIL ───────────────────
function ExerciseDetail({ exercise, userData, onBack, onUpdateData }) {
  const [showLog, setShowLog] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // entry object being edited
  const [overrideWeight, setOverrideWeight] = useState("");
  const [customWeight, setCustomWeight] = useState("");

  const exData = userData.exercises[exercise.id] || { goal: null, history: [] };
  const goal = exData.goal;
  const history = exData.history || [];
  const lastEntry = history[0];

  const goalMin = goal?.minReps ?? goal?.targetReps;
  const goalMax = goal?.maxReps ?? goal?.targetReps;
  const pendingIncrease = lastEntry?.hitGoal && goal && !exData.increaseDismissed && goal.weight === lastEntry.goalAtTime?.weight;

  // Best set ever — for 1RM
  const bestSet = history.length ? history.reduce((a,b) => calc1RM(b.weight,b.reps) > calc1RM(a.weight,a.reps) ? b : a, history[0]) : null;
  const estimated1RM = bestSet ? calc1RM(bestSet.weight, bestSet.reps) : null;

  // Today's entries — one per grip type
  const todayNoStraps  = history.find(e => e.date.slice(0,10) === todayStr() && !e.straps);
  const todayWithStraps = history.find(e => e.date.slice(0,10) === todayStr() && e.straps);
  const hasTodayEntry = !!(todayNoStraps || todayWithStraps);

  // Last entries per grip type (for pre-filling LogSetModal)
  const lastNoStrapsEntry  = history.find(e => !e.straps);
  const lastStrapsEntry    = history.find(e => e.straps);

  useEffect(() => {
    if (pendingIncrease && goal) setCustomWeight(String(goal.weight + (WEIGHT_INCREMENTS[exercise.category] || 2.5)));
  }, [pendingIncrease]);

  const handleLog = (weight, reps, straps) => {
    const hitGoal = goal ? weight >= goal.weight && reps >= goalMax : false;
    const entry = { date: new Date().toISOString(), weight, reps, straps: !!straps, goalAtTime: goal ? { ...goal } : null, hitGoal };
    // Replace today's entry for the same grip type, otherwise prepend
    const todayMatch = history.find(e => e.date.slice(0,10) === todayStr() && !!e.straps === !!straps);
    const newHistory = todayMatch
      ? history.map(e => (e.date.slice(0,10) === todayStr() && !!e.straps === !!straps) ? entry : e)
      : [entry, ...history];
    onUpdateData(exercise.id, { goal, history: newHistory, increaseDismissed: false });
    setShowLog(false);
    setShowRestTimer(true);
  };

  const handleDeleteEntry = (entryToDelete) => {
    const newHistory = history.filter(e => !(e.date === entryToDelete.date && e.weight === entryToDelete.weight && e.reps === entryToDelete.reps));
    onUpdateData(exercise.id, { ...exData, history: newHistory });
  };

  const handleEditEntry = (original, updated) => {
    const hitGoal = goal ? updated.weight >= goal.weight && updated.reps >= goalMax : false;
    const newHistory = history.map(e => e === original ? { ...updated, hitGoal } : e);
    onUpdateData(exercise.id, { ...exData, history: newHistory });
    setEditingEntry(null);
  };

  const acceptIncrease = () => {
    const newW = Number(customWeight);
    if (newW > 0) onUpdateData(exercise.id, { ...exData, goal: { ...goal, weight: newW }, increaseDismissed: false });
  };
  const dismissIncrease = () => onUpdateData(exercise.id, { ...exData, increaseDismissed: true });
  const setGoalFn = (w, minR, maxR) => { onUpdateData(exercise.id, { ...exData, goal: { weight: w, minReps: minR, maxReps: maxR } }); setShowGoal(false); };
  const applyOverride = () => {
    const newW = Number(overrideWeight);
    if (newW > 0) { onUpdateData(exercise.id, { ...exData, goal: { ...goal, weight: newW }, increaseDismissed: true }); setShowOverride(false); }
  };

  // Group history by weight
  const weightMap = {};
  [...history].reverse().forEach(e => { if (!weightMap[e.weight]) weightMap[e.weight] = []; weightMap[e.weight].push(e); });
  const sortedWeights = Object.keys(weightMap).map(Number).sort((a,b) => b-a);
  const currentWeightSets = goal ? (weightMap[goal.weight] || []) : [];

  return (
    <div className="ah-detail ah-fade-in">
      <button className="ah-back-btn" onClick={onBack}><I.Back/> Back</button>
      <div className="ah-detail-header"><h2 className="ah-detail-title">{exercise.name}</h2><span className="ah-detail-cat">{exercise.category}</span></div>

      {/* Goal card */}
      <div className="ah-card ah-goal-card">
        <div className="ah-card-header"><span className="ah-card-label">Current Goal</span><button className="ah-icon-btn" onClick={()=>setShowGoal(true)}><I.Edit/></button></div>
        {goal ? (
          <>
            <div className="ah-goal-display">
              <div className="ah-goal-num"><span className="ah-big-num">{goalMin}–{goalMax}</span><span className="ah-big-label">reps</span></div>
              <span className="ah-goal-x">×</span>
              <div className="ah-goal-num"><span className="ah-big-num">{goal.weight}</span><span className="ah-big-label">kg</span></div>
            </div>
            {estimated1RM && <div className="ah-1rm-chip">Est. 1RM <strong>{estimated1RM}kg</strong></div>}
          </>
        ) : <p className="ah-empty-text">No goal set — tap edit to add one</p>}

        {/* Rep progression dots for current weight */}
        {goal && currentWeightSets.length > 0 && (
          <div className="ah-weight-progress">
            <span className="ah-weight-progress-label">Reps at {goal.weight}kg</span>
            <div className="ah-rep-dots">
              {currentWeightSets.map((s,i) => (
                <span key={i} title={`${s.reps} reps · ${formatDate(s.date)}`}
                  className={`ah-rep-dot ${s.reps>=goalMax?"ah-rep-dot-gold":s.reps>=goalMin?"ah-rep-dot-good":"ah-rep-dot-low"}`}>
                  {s.reps}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending increase */}
      {pendingIncrease && (
        <div className="ah-increase-prompt">
          <div className="ah-increase-icon"><I.Trophy/></div>
          <div className="ah-increase-content">
            <p className="ah-increase-title">Top of range hit — ready to move up!</p>
            <p className="ah-increase-desc">What weight for next time?</p>
            <div className="ah-increase-weight-row">
              <input className="ah-input ah-increase-input" type="number" value={customWeight} onChange={e=>setCustomWeight(e.target.value)} placeholder="kg"/>
              <span className="ah-increase-kg">kg</span>
            </div>
            <div className="ah-increase-actions">
              <button className="ah-btn-primary ah-btn-sm" onClick={acceptIncrease}>Move Up</button>
              <button className="ah-btn-secondary ah-btn-sm" onClick={dismissIncrease}>Not yet</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Set + Override */}
      <div className="ah-log-row">
        <button className="ah-btn-primary ah-btn-log" style={{flex:1}} onClick={()=>setShowLog(true)}>
          <I.Plus/> Log Set
        </button>
        {goal && !pendingIncrease && (
          <button className="ah-btn-override" onClick={()=>{ setOverrideWeight(String(goal.weight+(WEIGHT_INCREMENTS[exercise.category]||2.5))); setShowOverride(true); }}>
            ↑ Override
          </button>
        )}
      </div>
      {/* Today's logged sets by grip */}
      {(todayNoStraps || todayWithStraps) && (
        <div className="ah-today-grip-summary">
          {todayNoStraps && <span className="ah-today-grip-chip ah-grip-nostraps">🤲 {todayNoStraps.weight}kg × {todayNoStraps.reps} reps</span>}
          {todayWithStraps && <span className="ah-today-grip-chip ah-grip-straps">💪 {todayWithStraps.weight}kg × {todayWithStraps.reps} reps</span>}
        </div>
      )}

      {/* Override modal */}
      {showOverride && (
        <div className="ah-modal-overlay" onClick={()=>setShowOverride(false)}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
          <h2 className="ah-modal-title">Override Weight</h2>
          <p className="ah-modal-sub">Move up before hitting the top of your rep range.</p>
          <div className="ah-input-group"><label className="ah-label">New Goal Weight (kg)</label>
            <input className="ah-input" type="number" value={overrideWeight} onChange={e=>setOverrideWeight(e.target.value)}/></div>
          <div className="ah-modal-actions">
            <button className="ah-btn-secondary" onClick={()=>setShowOverride(false)}>Cancel</button>
            <button className="ah-btn-primary ah-btn-sm" onClick={applyOverride}>Apply</button>
          </div>
        </div></div>
      )}

      {/* Weight history */}
      <div className="ah-history-section">
        <h3 className="ah-section-title"><I.History/> Weight History</h3>
        {sortedWeights.length === 0 ? <p className="ah-empty-text">No sets logged yet</p> :
          sortedWeights.map(w => {
            const sets = weightMap[w];
            const best = Math.max(...sets.map(s=>s.reps));
            const didHit = sets.some(s=>s.hitGoal);
            const isCurrent = goal && w === goal.weight;
            const goalAtW = sets.find(s=>s.goalAtTime)?.goalAtTime;
            const rangeLabel = goalAtW ? `${goalAtW.minReps??goalAtW.targetReps}–${goalAtW.maxReps??goalAtW.targetReps}` : null;
            const orm = calc1RM(w, best);
            return (
              <div key={w} className={`ah-weight-group ${isCurrent?"ah-weight-current":""}`}>
                <div className="ah-weight-group-header">
                  <span className="ah-weight-group-kg">{w}<small>kg</small></span>
                  <div className="ah-weight-group-meta">
                    {orm && <span className="ah-weight-1rm">1RM ~{orm}kg</span>}
                    {rangeLabel && <span className="ah-weight-range-label">{rangeLabel} reps</span>}
                    {didHit && <span className="ah-hit-badge"><I.Fire s={12}/> Hit</span>}
                    {isCurrent && <span className="ah-current-badge">Current</span>}
                  </div>
                </div>
                <div className="ah-weight-set-list">
                  {sets.slice().reverse().map((s,i) => (
                    <div key={i} className={`ah-weight-set-row ${s.hitGoal?"ah-set-hit":""}`}>
                      <span className="ah-set-date">{formatDate(s.date)}</span>
                      <span className={`ah-grip-badge ${s.straps?"ah-grip-badge-on":"ah-grip-badge-off"}`}>{s.straps?"💪 Straps":"🤲 No Straps"}</span>
                      <span className="ah-set-reps">{s.reps} reps{s.hitGoal&&" 🔥"}</span>
                      <div className="ah-set-actions">
                        <button className="ah-icon-btn" onClick={()=>setEditingEntry(s)} title="Edit"><I.Edit/></button>
                        <button className="ah-icon-btn ah-del-btn" onClick={()=>handleDeleteEntry(s)} title="Delete"><I.Trash/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ah-weight-best">Best: {best} reps · {sets.length} session{sets.length!==1?"s":""}</div>
              </div>
            );
          })
        }
      </div>

      {showLog && <LogSetModal exercise={exercise} goal={goal} lastNoStrapsEntry={lastNoStrapsEntry} lastStrapsEntry={lastStrapsEntry} onLog={handleLog} onClose={()=>setShowLog(false)}/>}
      {showGoal && <SetGoalModal exercise={exercise} currentGoal={goal} onSave={setGoalFn} onClose={()=>setShowGoal(false)}/>}
      {showRestTimer && <RestTimer onClose={()=>setShowRestTimer(false)}/>}
      {editingEntry && <EditSetModal entry={editingEntry} onSave={(orig,upd)=>handleEditEntry(editingEntry,upd)} onClose={()=>setEditingEntry(null)}/>}
    </div>
  );
}

// ─────────────────── TAB: HOME ───────────────────
function HomeTab({ userData, onUpdateData, onLogout, onSelectExercise, onOpenProfile }) {
  const [showTheme, setShowTheme] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const currentTheme = userData.theme || "dark_gold";
  const changeTheme = (id) => { applyTheme(id); const u={...userData,theme:id}; saveData(u); onUpdateData(u); };

  const exercises = userData.exerciseList || [];
  const today = getTodayDay();

  // Day override (temporary, resets tomorrow)
  const todayOverride = userData.todayOverride;
  const isOverrideActive = todayOverride && todayOverride.date === todayStr();
  const activeDay = isOverrideActive ? todayOverride.day : today;

  // Active split (supports variants)
  const active = getDayActive(activeDay, userData);
  const activeDayIds = active.exercises || [];
  const activeDayExs = activeDayIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);
  const activeLabel = active.label || "";
  const activeMuscles = active.muscles || [];
  const isRestDay = activeDayExs.length === 0;

  // Variant switching
  const variants = userData.dayVariants?.[activeDay] || [];
  const setActiveVariant = (variantId) => {
    const u = { ...userData, activeVariants: { ...(userData.activeVariants||{}), [activeDay]: variantId } };
    saveData(u); onUpdateData(u);
  };

  const totalSets = Object.values(userData.exercises||{}).reduce((s,e)=>s+(e.history?.length||0),0);
  const totalHits = Object.values(userData.exercises||{}).reduce((s,e)=>s+(e.history?.filter(h=>h.hitGoal)?.length||0),0);

  const setDayOverride = (day) => { const u={...userData,todayOverride:{date:todayStr(),day}}; saveData(u); onUpdateData(u); };
  const clearOverride = () => { const u={...userData,todayOverride:null}; saveData(u); onUpdateData(u); };

  return (
    <div className="ah-page ah-fade-in">
      {/* Header */}
      <div className="ah-dash-header">
        <div>
          <p className="ah-dash-greeting">Welcome back,</p>
          <h1 className="ah-dash-name-big">{userData.name}</h1>
        </div>
        <div className="ah-dash-header-btns">
          <button className="ah-profile-btn" onClick={()=>setShowHelp(true)} title="How to use"><I.Question s={18}/></button>
          <button className="ah-profile-btn" onClick={()=>setShowTheme(true)} title="Change theme"><I.Palette s={18}/></button>
          <button className="ah-profile-btn" onClick={onOpenProfile} title="Profile"><I.User s={20}/></button>
        </div>
      </div>
      {showTheme && <ThemeSheet current={currentTheme} onChange={changeTheme} onClose={()=>setShowTheme(false)}/>}
      {showHelp && <HelpModal onClose={()=>setShowHelp(false)}/>}

      {/* Override banner */}
      {isOverrideActive && (
        <div className="ah-override-banner">
          <I.Calendar s={14}/>
          <span>Using <strong>{getDayActive(todayOverride.day, userData).label || todayOverride.day}</strong> split instead of {today}'s</span>
          <button className="ah-override-clear" onClick={clearOverride}>✕ Reset</button>
        </div>
      )}

      {/* Today's workout heading */}
      <div className="ah-workout-heading">
        <div>
          <p className="ah-workout-day-label">{isOverrideActive ? `${today} · swapped from ${todayOverride.day}` : today}</p>
          <h2 className="ah-workout-title">{activeLabel || (isRestDay ? "Rest Day" : "Today's Workout")}</h2>
        </div>
      </div>

      {/* Variant chips — shown when multiple variants exist for this day */}
      {variants.length > 1 && (
        <div className="ah-variant-chips">
          {variants.map(v => (
            <button key={v.id} className={`ah-variant-chip ${active.id===v.id?"ah-variant-chip-active":""}`}
              onClick={()=>setActiveVariant(v.id)}>{v.label || "Variant"}</button>
          ))}
        </div>
      )}

      {activeMuscles.length > 0 && (
        <div className="ah-muscle-tags" style={{marginBottom:14}}>
          {activeMuscles.map(m=><span key={m} className="ah-muscle-tag">{m}</span>)}
        </div>
      )}

      {/* Exercise cards or rest state */}
      {isRestDay ? (
        <div className="ah-rest-card">
          <span className="ah-rest-emoji">😴</span>
          <p className="ah-rest-title">Rest Day</p>
          <p className="ah-rest-sub">{activeLabel ? `${activeLabel} — ` : ""}No exercises scheduled</p>
          <button className="ah-btn-secondary ah-pick-split-btn" onClick={()=>setShowDayPicker(true)}>
            <I.Dumbbell s={16}/> Train a different split today
          </button>
        </div>
      ) : (
        <>
          <div className="ah-workout-ex-list">
            {activeDayExs.map(ex => {
              const d = userData.exercises[ex.id] || {};
              const g = d.goal;
              const last = d.history?.[0];
              const gMin = g?.minReps ?? g?.targetReps;
              const gMax = g?.maxReps ?? g?.targetReps;
              const orm = last ? calc1RM(last.weight, last.reps) : null;
              const loggedToday = d.history?.find(e => e.date.slice(0,10) === todayStr());
              return (
                <div key={ex.id} className="ah-workout-ex-card" onClick={()=>onSelectExercise(ex)}>
                  <div className="ah-workout-ex-header">
                    <span className="ah-workout-ex-name">{ex.name}</span>
                    <span className="ah-workout-ex-cat">{ex.category}</span>
                  </div>
                  <div className="ah-workout-ex-meta">
                    {g ? (
                      <span className="ah-workout-ex-goal">🎯 {gMin}–{gMax} reps × {g.weight}kg</span>
                    ) : (
                      <span className="ah-workout-ex-nogoal">No goal set</span>
                    )}
                    {loggedToday ? (
                      <span className="ah-workout-ex-done">✓ Logged: {loggedToday.weight}kg × {loggedToday.reps} reps</span>
                    ) : last ? (
                      <span className="ah-workout-ex-last">Last: {last.weight}kg × {last.reps} reps</span>
                    ) : (
                      <span className="ah-workout-ex-nogoal">No sets logged yet</span>
                    )}
                  </div>
                  {orm && <div className="ah-workout-ex-1rm">Est. 1RM {orm}kg</div>}
                </div>
              );
            })}
          </div>
          <button className="ah-pick-split-subtle" onClick={()=>setShowDayPicker(true)}>
            <I.Calendar s={14}/> Use a different day's split
          </button>
        </>
      )}

      {/* Stats */}
      <div className="ah-stats-row" style={{marginTop:24}}>
        <div className="ah-stat-card"><span className="ah-stat-val">{exercises.length}</span><span className="ah-stat-label">Exercises</span></div>
        <div className="ah-stat-card"><span className="ah-stat-val">{totalSets}</span><span className="ah-stat-label">Sets Logged</span></div>
        <div className="ah-stat-card"><span className="ah-stat-val ah-gold">{totalHits}</span><span className="ah-stat-label">Goals Hit</span></div>
      </div>

      {showDayPicker && <DayPickerSheet userData={userData} exercises={exercises} onPick={setDayOverride} onClose={()=>setShowDayPicker(false)}/>}
    </div>
  );
}

// ─────────────────── DAY PICKER SHEET ───────────────────
function DayPickerSheet({ userData, exercises, onPick, onClose }) {
  const splits = userData.splits || {};
  const splitLabels = userData.splitLabels || {};
  const splitMuscles = userData.splitMuscles || {};
  const today = getTodayDay();
  const daysWithEx = DAYS.filter(day => (splits[day] || []).length > 0);
  return (
    <div className="ah-modal-overlay ah-sheet-overlay" onClick={onClose}>
      <div className="ah-theme-sheet" onClick={e=>e.stopPropagation()}>
        <div className="ah-sheet-handle"/>
        <h2 className="ah-sheet-title">Pick a Split for Today</h2>
        <p className="ah-modal-sub" style={{textAlign:"center",marginTop:-8}}>This only applies today — resets tomorrow</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
          {daysWithEx.length === 0
            ? <p className="ah-empty-text">No exercises assigned to any day yet. Set up your split first.</p>
            : daysWithEx.map(day => {
              const ids = splits[day] || [];
              const dayExs = ids.map(id => exercises.find(e => e.id === id)).filter(Boolean);
              const label = splitLabels[day] || day;
              const muscles = (splitMuscles[day] || []).slice(0,3);
              const isToday = day === today;
              return (
                <button key={day} className={`ah-day-pick-btn ${isToday?"ah-day-pick-today":""}`} onClick={()=>{onPick(day);onClose();}}>
                  <div className="ah-day-pick-left">
                    <span className="ah-day-pick-name">{label}{isToday?" · Today":""}</span>
                    <span className="ah-day-pick-sub">{day} · {dayExs.length} exercise{dayExs.length!==1?"s":""}</span>
                  </div>
                  {muscles.length>0 && <div className="ah-day-pick-muscles">{muscles.map(m=><span key={m} className="ah-muscle-tag-sm">{m}</span>)}</div>}
                </button>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────── TAB: PRs ───────────────────
function AddPRModal({ exercises, onSave, onClose }) {
  const [exId, setExId] = useState(exercises[0]?.id || "");
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Add PR Manually</h2>
      <p className="ah-modal-sub">Log a personal record from any date</p>
      <div className="ah-input-group"><label className="ah-label">Exercise</label>
        <select className="ah-input ah-select" value={exId} onChange={e=>setExId(e.target.value)}>
          {exercises.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </div>
      <div className="ah-input-group"><label className="ah-label">Weight (kg)</label><input className="ah-input" type="number" placeholder="e.g. 100" value={w} onChange={e=>setW(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Reps</label><input className="ah-input" type="number" placeholder="e.g. 8" value={r} onChange={e=>setR(e.target.value)}/></div>
      <div className="ah-input-group"><label className="ah-label">Date Achieved</label><input className="ah-input ah-date-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Cancel</button><button className="ah-btn-primary ah-btn-sm" onClick={()=>{if(exId&&w&&r&&date)onSave(exId,Number(w),Number(r),date)}}>Save PR</button></div>
    </div></div>
  );
}

function PRsTab({ userData, onUpdateData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPR, setEditingPR] = useState(null); // { exId, entry }
  const exercises = userData.exerciseList || [];
  const manualPRs = userData.manualPRs || {};

  const getBestEntry = (ex) => {
    const hist = userData.exercises[ex.id]?.history || [];
    const manual = manualPRs[ex.id] || [];
    const all = [...hist, ...manual];
    if (!all.length) return null;
    return all.reduce((a,b) => calc1RM(b.weight,b.reps) > calc1RM(a.weight,a.reps) ? b : a, all[0]);
  };

  const prs = exercises.map(ex => ({ ...ex, pr: getBestEntry(ex) }));
  const categories = [...new Set(exercises.map(e => e.category))];

  const handleSavePR = (exId, weight, reps, dateStr) => {
    const entry = { date: new Date(dateStr).toISOString(), weight, reps, manual: true };
    const existing = manualPRs[exId] || [];
    const u = { ...userData, manualPRs: { ...manualPRs, [exId]: [...existing, entry] } };
    saveData(u); onUpdateData(u); setShowAdd(false);
  };

  const handleDeleteManualPR = (exId, entry) => {
    const updated = (manualPRs[exId] || []).filter(e => !(e.date===entry.date && e.weight===entry.weight && e.reps===entry.reps));
    const u = { ...userData, manualPRs: { ...manualPRs, [exId]: updated } };
    saveData(u); onUpdateData(u);
  };

  const handleEditManualPR = (exId, original, updated) => {
    const list = manualPRs[exId] || [];
    const newList = list.map(e => (e.date===original.date && e.weight===original.weight && e.reps===original.reps) ? { ...updated, manual:true } : e);
    const u = { ...userData, manualPRs: { ...manualPRs, [exId]: newList } };
    saveData(u); onUpdateData(u); setEditingPR(null);
  };

  return (
    <div className="ah-page ah-fade-in">
      <div className="ah-section-header" style={{marginBottom:4}}>
        <h1 className="ah-page-title"><I.Trophy s={24}/> Personal Records</h1>
        {exercises.length>0 && <button className="ah-btn-add" onClick={()=>setShowAdd(true)}><I.Plus/></button>}
      </div>
      <p className="ah-page-sub">Your all-time bests · estimated 1RM shown</p>
      {exercises.length === 0
        ? <div className="ah-empty-state"><I.Trophy s={32}/><p>Add exercises and log sets to see your PRs</p></div>
        : categories.map(cat => (
          <div key={cat} className="ah-cat-group"><p className="ah-cat-label">{cat}</p>
            {prs.filter(e=>e.category===cat).map(ex => {
              const orm = ex.pr ? calc1RM(ex.pr.weight, ex.pr.reps) : null;
              const isManual = ex.pr?.manual;
              return (
                <div key={ex.id} className={`ah-pr-card ${ex.pr?"":"ah-pr-empty"}`}>
                  <div className="ah-pr-left">
                    <div className="ah-pr-name">{ex.name}</div>
                    {isManual && <span className="ah-pr-manual-tag">Manual</span>}
                  </div>
                  {ex.pr ? (
                    <div className="ah-pr-right">
                      <div className="ah-pr-details">
                        <div className="ah-pr-main">
                          <span className="ah-pr-weight">{ex.pr.weight}<small>kg</small></span>
                          <span className="ah-pr-x">×</span>
                          <span className="ah-pr-reps">{ex.pr.reps}<small>reps</small></span>
                        </div>
                        {orm && <div className="ah-pr-1rm">1RM ~{orm}kg</div>}
                        <div className="ah-pr-date">{formatDate(ex.pr.date)}</div>
                      </div>
                      {isManual && (
                        <div className="ah-pr-actions">
                          <button className="ah-icon-btn" onClick={()=>setEditingPR({exId:ex.id,entry:ex.pr})}><I.Edit/></button>
                          <button className="ah-icon-btn ah-del-btn" onClick={()=>handleDeleteManualPR(ex.id,ex.pr)}><I.Trash/></button>
                        </div>
                      )}
                    </div>
                  ) : <div className="ah-pr-none">No PR yet</div>}
                </div>
              );
            })}
          </div>
        ))
      }
      {showAdd && <AddPRModal exercises={exercises} onSave={handleSavePR} onClose={()=>setShowAdd(false)}/>}
      {editingPR && <EditPRModal entry={editingPR.entry} onSave={(_,upd)=>handleEditManualPR(editingPR.exId,editingPR.entry,upd)} onClose={()=>setEditingPR(null)}/>}
    </div>
  );
}

// ─────────────────── TAB: SPLIT ───────────────────
const SPLIT_PRESETS = ["Push", "Pull", "Legs", "Upper Body", "Lower Body", "Full Body", "Arms", "Back & Biceps", "Chest & Triceps", "Shoulders", "Rest Day"];
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core", "Full Body"];

const SPLIT_TEMPLATES = {
  2: {
    name: "Full Body",
    badge: "2×/week",
    desc: "Train your whole body each session with rest days in between. Ideal for beginners or busy schedules.",
    defaultDays: ["Monday", "Thursday"],
    workouts: [
      { label: "Full Body A", muscles: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
        exercises: ["squat","bench-press","lat-pulldown","shoulder-press","bicep-curl","tricep-pulldown"] },
      { label: "Full Body B", muscles: ["Legs", "Chest", "Back", "Shoulders", "Arms"],
        exercises: ["deadlift","incline-bench-press","seated-row","lateral-raise","hammer-curl","leg-press"] },
    ],
  },
  3: {
    name: "Push / Pull / Legs",
    badge: "3×/week",
    desc: "The gold standard. Push days target chest/shoulders/triceps, pull days hit back/biceps, leg days cover everything lower.",
    defaultDays: ["Monday", "Wednesday", "Friday"],
    workouts: [
      { label: "Push", muscles: ["Chest", "Shoulders", "Triceps"],
        exercises: ["bench-press","incline-bench-press","shoulder-press","lateral-raise","tricep-pulldown","overhead-tricep-ext"] },
      { label: "Pull", muscles: ["Back", "Biceps"],
        exercises: ["lat-pulldown","seated-row","pull-up","face-pull","bicep-curl","hammer-curl"] },
      { label: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
        exercises: ["squat","romanian-deadlift","leg-press","leg-curl","leg-extension","calf-raise"] },
    ],
  },
  4: {
    name: "Upper / Lower",
    badge: "4×/week",
    desc: "Hit each muscle group twice per week. Alternate upper and lower body days for maximum recovery and frequency.",
    defaultDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    workouts: [
      { label: "Upper A", muscles: ["Chest", "Back", "Shoulders", "Arms"],
        exercises: ["bench-press","lat-pulldown","shoulder-press","seated-row","bicep-curl","tricep-pulldown"] },
      { label: "Lower A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
        exercises: ["squat","romanian-deadlift","leg-press","leg-curl","calf-raise"] },
      { label: "Upper B", muscles: ["Chest", "Back", "Shoulders", "Arms"],
        exercises: ["incline-bench-press","pull-up","lateral-raise","cable-row","hammer-curl","overhead-tricep-ext"] },
      { label: "Lower B", muscles: ["Quads", "Hamstrings", "Glutes"],
        exercises: ["deadlift","hack-squat","leg-extension","hip-thrust","calf-raise"] },
    ],
  },
  5: {
    name: "PPL + Upper / Lower",
    badge: "5×/week",
    desc: "Five days of targeted training. The PPL days focus on isolation; Upper and Lower days add frequency on compound lifts.",
    defaultDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    workouts: [
      { label: "Push", muscles: ["Chest", "Shoulders", "Triceps"],
        exercises: ["bench-press","incline-bench-press","shoulder-press","lateral-raise","tricep-pulldown","overhead-tricep-ext"] },
      { label: "Pull", muscles: ["Back", "Biceps"],
        exercises: ["lat-pulldown","seated-row","pull-up","face-pull","bicep-curl","hammer-curl"] },
      { label: "Legs", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
        exercises: ["squat","romanian-deadlift","leg-press","leg-curl","hip-thrust","calf-raise"] },
      { label: "Upper", muscles: ["Chest", "Back", "Shoulders", "Arms"],
        exercises: ["dumbbell-press","single-arm-row","lateral-raise","rear-delt-fly","preacher-curl","skull-crusher"] },
      { label: "Lower", muscles: ["Quads", "Hamstrings", "Glutes"],
        exercises: ["deadlift","hack-squat","leg-extension","glute-bridge","calf-raise"] },
    ],
  },
  6: {
    name: "PPL × 2",
    badge: "6×/week",
    desc: "Each muscle group twice a week. High-frequency training for advanced lifters looking to maximise volume.",
    defaultDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    workouts: [
      { label: "Push A", muscles: ["Chest", "Shoulders", "Triceps"],
        exercises: ["bench-press","incline-bench-press","shoulder-press","lateral-raise","tricep-pulldown","overhead-tricep-ext"] },
      { label: "Pull A", muscles: ["Back", "Biceps"],
        exercises: ["lat-pulldown","seated-row","pull-up","face-pull","bicep-curl","hammer-curl"] },
      { label: "Legs A", muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
        exercises: ["squat","romanian-deadlift","leg-press","leg-curl","hip-thrust","calf-raise"] },
      { label: "Push B", muscles: ["Chest", "Shoulders", "Triceps"],
        exercises: ["dumbbell-press","incline-fly","lateral-raise","cable-lateral-raise","skull-crusher","tricep-dip"] },
      { label: "Pull B", muscles: ["Back", "Biceps"],
        exercises: ["chin-up","single-arm-row","cable-row","rear-delt-fly","hammer-curl","preacher-curl"] },
      { label: "Legs B", muscles: ["Quads", "Hamstrings", "Glutes"],
        exercises: ["deadlift","hack-squat","leg-extension","glute-bridge","bulgarian-split-squat","calf-raise"] },
    ],
  },
};

function SplitMakerModal({ userData, onUpdateData, onClose }) {
  const [step, setStep] = useState(1); // 1=days, 2=pick days, 3=preview
  const [daysPerWeek, setDaysPerWeek] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);

  const template = daysPerWeek ? SPLIT_TEMPLATES[daysPerWeek] : null;

  const pickDays = (n) => {
    setDaysPerWeek(n);
    setSelectedDays(SPLIT_TEMPLATES[n].defaultDays);
    setStep(2);
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) setSelectedDays(d => d.filter(x => x !== day));
    } else {
      if (selectedDays.length < daysPerWeek) setSelectedDays(d => [...d, day]);
    }
  };

  const orderedSelected = DAYS.filter(d => selectedDays.includes(d));

  const applySplit = () => {
    const allExIds = [...new Set(template.workouts.flatMap(w => w.exercises))];
    const existingIds = new Set((userData.exerciseList || []).map(e => e.id));
    const newExItems = allExIds.filter(id => !existingIds.has(id))
      .map(id => DEFAULT_EXERCISES.find(e => e.id === id)).filter(Boolean);

    const newExList = [...(userData.exerciseList || []), ...newExItems];
    const newExData = { ...userData.exercises };
    newExItems.forEach(ex => { if (!newExData[ex.id]) newExData[ex.id] = { goal: null, history: [] }; });

    const newDayVariants = { ...(userData.dayVariants || {}) };
    const newActiveVariants = { ...(userData.activeVariants || {}) };

    // Clear all days, then assign workouts
    DAYS.forEach(day => { newDayVariants[day] = []; });
    orderedSelected.forEach((day, i) => {
      const workout = template.workouts[i % template.workouts.length];
      const vid = genId();
      newDayVariants[day] = [{ id: vid, label: workout.label, muscles: workout.muscles, exercises: workout.exercises }];
      newActiveVariants[day] = vid;
    });

    const u = { ...userData, exerciseList: newExList, exercises: newExData, dayVariants: newDayVariants, activeVariants: newActiveVariants };
    saveData(u); onUpdateData(u); onClose();
  };

  return (
    <div className="ah-modal-overlay" onClick={onClose}>
      <div className="ah-modal ah-maker-modal" onClick={e => e.stopPropagation()}>

        {/* Step 1: choose days per week */}
        {step === 1 && (<>
          <h2 className="ah-modal-title">Split Generator</h2>
          <p className="ah-modal-sub">How many days per week do you want to train?</p>
          <div className="ah-maker-grid">
            {[2, 3, 4, 5, 6].map(n => {
              const t = SPLIT_TEMPLATES[n];
              return (
                <button key={n} className="ah-maker-card" onClick={() => pickDays(n)}>
                  <span className="ah-maker-days">{n}</span>
                  <span className="ah-maker-card-name">{t.name}</span>
                  <span className="ah-maker-badge">{t.badge}</span>
                  <span className="ah-maker-card-desc">{t.desc}</span>
                </button>
              );
            })}
          </div>
          <button className="ah-btn-secondary" style={{marginTop:8}} onClick={onClose}>Cancel</button>
        </>)}

        {/* Step 2: pick which days */}
        {step === 2 && template && (<>
          <button className="ah-back-btn" style={{marginBottom:12}} onClick={() => setStep(1)}><I.Back/> Back</button>
          <h2 className="ah-modal-title">{template.name}</h2>
          <p className="ah-modal-sub">Select {daysPerWeek} training days ({selectedDays.length}/{daysPerWeek} selected)</p>
          <div className="ah-maker-days-grid">
            {DAYS.map(day => {
              const sel = selectedDays.includes(day);
              const full = !sel && selectedDays.length >= daysPerWeek;
              return (
                <button key={day} className={`ah-maker-day-btn ${sel ? "ah-maker-day-sel" : ""} ${full ? "ah-maker-day-full" : ""}`}
                  onClick={() => toggleDay(day)} disabled={full}>
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <div className="ah-maker-preview-list">
            {orderedSelected.map((day, i) => {
              const w = template.workouts[i % template.workouts.length];
              return (
                <div key={day} className="ah-maker-preview-row">
                  <span className="ah-maker-preview-day">{day.slice(0, 3)}</span>
                  <span className="ah-maker-preview-label">{w.label}</span>
                  <span className="ah-maker-preview-muscles">{w.muscles.slice(0, 3).join(" · ")}</span>
                </div>
              );
            })}
          </div>

          <button className="ah-btn-primary" disabled={selectedDays.length !== daysPerWeek}
            style={{ opacity: selectedDays.length !== daysPerWeek ? 0.4 : 1 }}
            onClick={() => setStep(3)}>Preview Split →</button>
        </>)}

        {/* Step 3: preview & apply */}
        {step === 3 && template && (<>
          <button className="ah-back-btn" style={{marginBottom:12}} onClick={() => setStep(2)}><I.Back/> Back</button>
          <h2 className="ah-modal-title">Your Generated Split</h2>
          <p className="ah-modal-sub">{template.name} · {daysPerWeek} days/week</p>

          <div className="ah-maker-final-list">
            {orderedSelected.map((day, i) => {
              const w = template.workouts[i % template.workouts.length];
              const exNames = w.exercises.map(id => DEFAULT_EXERCISES.find(e => e.id === id)?.name).filter(Boolean);
              return (
                <div key={day} className="ah-maker-final-day">
                  <div className="ah-maker-final-header">
                    <span className="ah-maker-final-day-name">{day}</span>
                    <span className="ah-maker-final-label">{w.label}</span>
                  </div>
                  <div className="ah-maker-final-muscles">
                    {w.muscles.map(m => <span key={m} className="ah-muscle-tag-sm">{m}</span>)}
                  </div>
                  <div className="ah-maker-final-exs">{exNames.join(" · ")}</div>
                </div>
              );
            })}
            {DAYS.filter(d => !selectedDays.includes(d)).map(day => (
              <div key={day} className="ah-maker-final-day ah-maker-rest-day">
                <div className="ah-maker-final-header">
                  <span className="ah-maker-final-day-name">{day}</span>
                  <span className="ah-maker-final-label" style={{color:"var(--text3)"}}>Rest</span>
                </div>
              </div>
            ))}
          </div>

          <div className="ah-maker-warn">⚠️ This will replace your current split schedule</div>
          <button className="ah-btn-primary" onClick={applySplit}>Apply This Split ✓</button>
          <button className="ah-btn-secondary" style={{marginTop:8}} onClick={onClose}>Cancel</button>
        </>)}
      </div>
    </div>
  );
}

function SplitTab({ userData, onUpdateData, importCode = "", onImportDone }) {
  const [editDay, setEditDay] = useState(null);
  const [editVariantId, setEditVariantId] = useState(null); // which variant tab is selected in expanded view
  const [reorderMode, setReorderMode] = useState(false);
  const [addExMode, setAddExMode] = useState(false);
  const [editingVariantLabel, setEditingVariantLabel] = useState(null); // { day, variantId }
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(null); // day string
  const [showMaker, setShowMaker] = useState(false);

  useEffect(() => { if (importCode) setShowImport(true); }, [importCode]);

  const exercises = userData.exerciseList || [];
  const today = getTodayDay();

  // ── helpers that work on EITHER old or variant structure ──
  const getDayVariants = (day) => userData.dayVariants?.[day] || null;

  // Get exercise list for a variant (old struct or new)
  const getVariantExs = (day, variantId) => {
    const variants = getDayVariants(day);
    if (variants) {
      const v = variants.find(v=>v.id===variantId) || variants[0];
      return (v?.exercises || []).map(id=>exercises.find(e=>e.id===id)).filter(Boolean);
    }
    return (userData.splits?.[day]||[]).map(id=>exercises.find(e=>e.id===id)).filter(Boolean);
  };

  const getVariantIds = (day, variantId) => {
    const variants = getDayVariants(day);
    if (variants) return (variants.find(v=>v.id===variantId)||variants[0])?.exercises || [];
    return userData.splits?.[day] || [];
  };

  // Convert old-style day to dayVariants, return updated userData
  const ensureVariants = (day, ud) => {
    if (ud.dayVariants?.[day]) return ud; // already has variants
    const oldIds = ud.splits?.[day] || [];
    const oldLabel = ud.splitLabels?.[day] || "Split A";
    const oldMuscles = ud.splitMuscles?.[day] || [];
    const v = { id: genId(), label: oldLabel, muscles: oldMuscles, exercises: oldIds };
    return { ...ud, dayVariants: { ...(ud.dayVariants||{}), [day]: [v] }, activeVariants: { ...(ud.activeVariants||{}), [day]: v.id } };
  };

  // Add a new variant to a day
  const addVariant = (day) => {
    let ud = ensureVariants(day, userData);
    const existing = ud.dayVariants[day];
    const newV = { id: genId(), label: `Split ${String.fromCharCode(65+existing.length)}`, muscles: [], exercises: [] };
    const updated = { ...ud, dayVariants: { ...ud.dayVariants, [day]: [...existing, newV] } };
    saveData(updated); onUpdateData(updated);
    setEditVariantId(newV.id);
  };

  const deleteVariant = (day, variantId) => {
    const variants = (userData.dayVariants?.[day]||[]).filter(v=>v.id!==variantId);
    if (!variants.length) return; // don't delete the last one
    const ud = { ...userData, dayVariants: { ...(userData.dayVariants||{}), [day]: variants },
      activeVariants: { ...(userData.activeVariants||{}), [day]: variants[0].id } };
    saveData(ud); onUpdateData(ud);
    setEditVariantId(variants[0].id);
  };

  const setDayActiveVariant = (day, variantId) => {
    const ud = { ...userData, activeVariants: { ...(userData.activeVariants||{}), [day]: variantId } };
    saveData(ud); onUpdateData(ud);
  };

  // Update exercises in a variant (or old split)
  const updateVariantExercises = (day, variantId, newIds) => {
    const variants = getDayVariants(day);
    if (variants) {
      const updated = variants.map(v => v.id===variantId ? { ...v, exercises: newIds } : v);
      const ud = { ...userData, dayVariants: { ...(userData.dayVariants||{}), [day]: updated } };
      saveData(ud); onUpdateData(ud);
    } else {
      const ud = { ...userData, splits: { ...(userData.splits||{}), [day]: newIds } };
      saveData(ud); onUpdateData(ud);
    }
  };

  const toggleExercise = (day, variantId, exId) => {
    const cur = getVariantIds(day, variantId);
    const upd = cur.includes(exId) ? cur.filter(x=>x!==exId) : [...cur, exId];
    updateVariantExercises(day, variantId, upd);
  };

  const moveExercise = (day, variantId, index, direction) => {
    const cur = [...getVariantIds(day, variantId)];
    const ni = index + direction;
    if (ni < 0 || ni >= cur.length) return;
    [cur[index], cur[ni]] = [cur[ni], cur[index]];
    updateVariantExercises(day, variantId, cur);
  };

  const addNewExerciseToVariant = (day, variantId, exercise) => {
    const nl = exercises.find(e=>e.id===exercise.id) ? exercises : [...exercises, exercise];
    const ne = { ...userData.exercises };
    if (!ne[exercise.id]) ne[exercise.id] = { goal: null, history: [] };
    const cur = getVariantIds(day, variantId);
    const upd = cur.includes(exercise.id) ? cur : [...cur, exercise.id];
    const variants = getDayVariants(day);
    let ud;
    if (variants) {
      const updatedVariants = variants.map(v => v.id===variantId ? { ...v, exercises: upd } : v);
      ud = { ...userData, exerciseList: nl, exercises: ne, dayVariants: { ...(userData.dayVariants||{}), [day]: updatedVariants } };
    } else {
      ud = { ...userData, exerciseList: nl, exercises: ne, splits: { ...(userData.splits||{}), [day]: upd } };
    }
    saveData(ud); onUpdateData(ud);
  };

  const saveVariantLabel = (day, variantId, label, muscles) => {
    const variants = getDayVariants(day);
    if (variants) {
      const updated = variants.map(v => v.id===variantId ? { ...v, label, muscles } : v);
      const ud = { ...userData, dayVariants: { ...(userData.dayVariants||{}), [day]: updated } };
      saveData(ud); onUpdateData(ud);
    } else {
      const ud = { ...userData, splitLabels: { ...(userData.splitLabels||{}), [day]: label }, splitMuscles: { ...(userData.splitMuscles||{}), [day]: muscles } };
      saveData(ud); onUpdateData(ud);
    }
    setEditingVariantLabel(null);
  };

  const handleImport = (ud) => { saveData(ud); onUpdateData(ud); if (onImportDone) onImportDone(); };

  const expand = (day) => {
    if (editDay === day) { setEditDay(null); setReorderMode(false); setAddExMode(false); setEditVariantId(null); return; }
    const variants = getDayVariants(day);
    const activeId = variants ? (userData.activeVariants?.[day] || variants[0]?.id) : null;
    setEditDay(day); setEditVariantId(activeId); setReorderMode(false); setAddExMode(false);
  };

  // Today's summary
  const todayActive = getDayActive(today, userData);
  const todayExs = (todayActive.exercises||[]).map(id=>exercises.find(e=>e.id===id)).filter(Boolean);

  return (
    <div className="ah-page ah-fade-in">
      <div className="ah-split-top-row">
        <div>
          <h1 className="ah-page-title" style={{margin:0}}><I.Calendar s={24}/> Workout Split</h1>
          <p className="ah-page-sub" style={{margin:"4px 0 0"}}>Assign exercises to days · create multiple variants</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="ah-btn-primary ah-btn-sm" style={{padding:"8px 14px",fontSize:13}} onClick={()=>setShowMaker(true)}>✦ Generate</button>
          <button className="ah-icon-btn ah-split-action-btn" onClick={()=>setShowImport(true)} title="Import a split"><I.Download s={18}/></button>
          <button className="ah-icon-btn ah-split-action-btn" onClick={()=>setShowShare(true)} title="Share your split"><I.Share s={18}/></button>
        </div>
      </div>

      {/* Today highlight */}
      <div className="ah-today-card">
        <div className="ah-today-header">
          <div>
            <span className="ah-today-label">Today — {today}</span>
            {todayActive.label && <span className="ah-today-split-name">{todayActive.label}</span>}
          </div>
          <span className="ah-today-count">{todayExs.length} exercises</span>
        </div>
        {todayActive.muscles?.length>0 && <div className="ah-muscle-tags">{todayActive.muscles.map(m=><span key={m} className="ah-muscle-tag">{m}</span>)}</div>}
        {todayExs.length===0 ? <p className="ah-today-empty">Rest day or no exercises assigned</p>
        : <div className="ah-today-list">{todayExs.map(ex=>{const g=userData.exercises[ex.id]?.goal;return <div key={ex.id} className="ah-today-exercise"><span className="ah-today-ex-name">{ex.name}</span>{g&&<span className="ah-today-ex-goal">{g.minReps??g.targetReps}–{g.maxReps??g.targetReps}×{g.weight}kg</span>}</div>})}</div>}
      </div>

      <h3 className="ah-section-title" style={{marginTop:20,marginBottom:12}}>Weekly Schedule</h3>
      {DAYS.map(day => {
        const isToday = day === today;
        const isExpanded = editDay === day;
        const variants = getDayVariants(day);
        const viewVariantId = editVariantId;
        const activeVariant = variants ? (variants.find(v=>v.id===viewVariantId)||variants[0]) : null;
        const displayLabel = variants ? (activeVariant?.label || "") : (userData.splitLabels?.[day] || "");
        const displayMuscles = variants ? (activeVariant?.muscles || []) : (userData.splitMuscles?.[day] || []);
        const displayIds = variants ? (activeVariant?.exercises || []) : (userData.splits?.[day] || []);
        const displayExs = displayIds.map(id=>exercises.find(e=>e.id===id)).filter(Boolean);
        const variantCount = variants?.length || 0;

        return (
          <div key={day} className={`ah-split-day ${isToday?"ah-split-today":""}`}>
            <div className="ah-split-day-header" onClick={()=>expand(day)}>
              <div className="ah-split-day-left">
                <span className="ah-split-day-name">{day}{isToday&&<span className="ah-today-dot"/>}</span>
                {displayLabel && <span className="ah-split-day-label">{displayLabel}</span>}
                {variantCount > 1 && <span className="ah-variant-count-badge">{variantCount} variants</span>}
              </div>
              <div className="ah-split-day-right">
                <span className="ah-split-day-count">{displayExs.length}</span>
              </div>
            </div>

            {/* Collapsed: muscle tags + exercise pills */}
            {!isExpanded && displayMuscles.length>0 && <div className="ah-split-day-muscles">{displayMuscles.map(m=><span key={m} className="ah-muscle-tag-sm">{m}</span>)}</div>}
            {!isExpanded && displayExs.length>0 && <div className="ah-split-day-exercises">{displayExs.map(e=><span key={e.id} className="ah-split-tag">{e.name}</span>)}</div>}

            {/* Expanded */}
            {isExpanded && (
              <div className="ah-split-expanded">
                {/* Variant tabs (shown when multiple variants exist) */}
                {variants && variants.length > 0 && (
                  <div className="ah-variant-tabs">
                    {variants.map(v => (
                      <button key={v.id} className={`ah-variant-tab ${viewVariantId===v.id?"ah-variant-tab-active":""}`}
                        onClick={()=>{ setEditVariantId(v.id); setDayActiveVariant(day, v.id); setAddExMode(false); setReorderMode(false); }}>
                        {v.label || "Variant"}
                      </button>
                    ))}
                    <button className="ah-variant-tab ah-variant-tab-add" onClick={()=>addVariant(day)} title="Add variant">+</button>
                  </div>
                )}

                {/* Active variant header controls */}
                <div className="ah-split-variant-controls">
                  <button className="ah-icon-btn" style={{padding:4}} title="Edit name & muscles"
                    onClick={()=>setEditingVariantLabel({ day, variantId: activeVariant?.id || null, label: displayLabel, muscles: displayMuscles })}>
                    <I.Edit/>
                  </button>
                  {displayExs.length > 1 && (
                    <button className={`ah-icon-btn ${reorderMode?"ah-reorder-active":""}`} style={{padding:4}} title="Reorder"
                      onClick={()=>{ setReorderMode(r=>!r); setAddExMode(false); }}>
                      <I.Grip/>
                    </button>
                  )}
                  {variants && variants.length > 1 && activeVariant && (
                    <button className="ah-icon-btn ah-del-btn" style={{padding:4}} title="Delete this variant"
                      onClick={()=>deleteVariant(day, activeVariant.id)}>
                      <I.Trash/>
                    </button>
                  )}
                  {!variants && (
                    <button className="ah-icon-btn" style={{padding:4,fontSize:11,color:"var(--gold)"}} title="Add a second variant"
                      onClick={()=>addVariant(day)}>
                      <I.Plus/>
                    </button>
                  )}
                </div>

                {displayMuscles.length>0 && <div className="ah-muscle-tags" style={{padding:'0 16px 8px'}}>{displayMuscles.map(m=><span key={m} className="ah-muscle-tag">{m}</span>)}</div>}

                {/* Exercise list or reorder */}
                {!reorderMode && (
                  <>
                    {displayExs.length > 0 ? (
                      <div className="ah-split-ex-list">
                        {displayExs.map((ex, idx) => {
                          const g = userData.exercises[ex.id]?.goal;
                          return (
                            <div key={ex.id} className="ah-split-ex-item">
                              <span className="ah-split-ex-num">{idx+1}</span>
                              <div className="ah-split-ex-info">
                                <span className="ah-split-ex-name">{ex.name}</span>
                                <span className="ah-split-ex-detail">{ex.category}{g ? ` · ${g.minReps??g.targetReps}–${g.maxReps??g.targetReps}×${g.weight}kg` : ""}</span>
                              </div>
                              <button className="ah-icon-btn ah-del-btn" title="Remove"
                                onClick={()=>toggleExercise(day, activeVariant?.id||null, ex.id)}><I.Trash/></button>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="ah-split-no-ex">No exercises assigned to this variant</p>}

                    <div className="ah-split-actions">
                      <button className="ah-btn-add-to-day" onClick={()=>setAddExMode(m=>!m)}>
                        <I.Plus/> {addExMode ? "Done" : "Add / Remove Exercises"}
                      </button>
                    </div>

                    {addExMode && (
                      <div className="ah-split-edit">
                        <p className="ah-split-edit-label">Select exercises for this variant</p>
                        {exercises.length===0
                          ? <p className="ah-empty-text">No exercises in your library yet</p>
                          : exercises.map(e => {
                              const inVariant = displayIds.includes(e.id);
                              return <button key={e.id} className={`ah-split-toggle ${inVariant?"ah-split-on":""}`}
                                onClick={()=>toggleExercise(day, activeVariant?.id||null, e.id)}>
                                {e.name}<span className="ah-split-toggle-cat">{e.category}</span>{inVariant&&<I.Check/>}
                              </button>;
                            })}
                        <button className="ah-btn-add-to-day" onClick={()=>setShowAddModal(day)}><I.Plus/> Create New Exercise</button>
                      </div>
                    )}
                  </>
                )}

                {/* Reorder mode */}
                {reorderMode && displayExs.length > 0 && (
                  <div className="ah-reorder-list">
                    {displayExs.map((ex, idx) => (
                      <div key={ex.id} className="ah-reorder-item">
                        <span className="ah-reorder-num">{idx+1}</span>
                        <span className="ah-reorder-name">{ex.name}</span>
                        <div className="ah-reorder-btns">
                          <button className="ah-reorder-btn" disabled={idx===0} onClick={()=>moveExercise(day, activeVariant?.id||null, idx, -1)}><I.ChevUp/></button>
                          <button className="ah-reorder-btn" disabled={idx===displayExs.length-1} onClick={()=>moveExercise(day, activeVariant?.id||null, idx, 1)}><I.ChevDown/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add first variant button for days without variants */}
                {!variants && (
                  <div style={{padding:"4px 16px 12px"}}>
                    <button className="ah-btn-add-to-day" onClick={()=>addVariant(day)}>
                      <I.Plus/> Add Second Workout Variant
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Variant Label Modal */}
      {editingVariantLabel && (
        <VariantLabelModal
          day={editingVariantLabel.day}
          currentLabel={editingVariantLabel.label}
          currentMuscles={editingVariantLabel.muscles}
          onSave={(label, muscles) => saveVariantLabel(editingVariantLabel.day, editingVariantLabel.variantId, label, muscles)}
          onClose={() => setEditingVariantLabel(null)}
        />
      )}

      {/* Add New Exercise Modal */}
      {showAddModal && <AddExerciseModal existingIds={exercises.map(e=>e.id)}
        onAdd={(ex)=>{ addNewExerciseToVariant(showAddModal, editVariantId, ex); setShowAddModal(null); }}
        onClose={()=>setShowAddModal(null)}/>}

      {showShare && <ShareSplitModal userData={userData} onClose={()=>setShowShare(false)}/>}
      {showImport && <ImportSplitModal initialCode={importCode} userData={userData} onImport={handleImport} onClose={()=>setShowImport(false)}/>}
      {showMaker && <SplitMakerModal userData={userData} onUpdateData={onUpdateData} onClose={()=>setShowMaker(false)}/>}
    </div>
  );
}

function VariantLabelModal({ day, currentLabel, currentMuscles, onSave, onClose }) {
  const [label, setLabel] = useState(currentLabel);
  const [muscles, setMuscles] = useState(currentMuscles);
  const toggleMuscle = (m) => setMuscles(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m]);
  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">{day}</h2>
      <p className="ah-modal-sub">Name this workout variant and tag its muscle groups</p>
      <div className="ah-input-group"><label className="ah-label">Variant Name</label>
        <input className="ah-input" placeholder="e.g. Glute Focus" value={label} onChange={e=>setLabel(e.target.value)}/>
      </div>
      <div className="ah-preset-quick">{SPLIT_PRESETS.map(p=><button key={p} className={`ah-quick-tag ${label===p?"ah-quick-active":""}`} onClick={()=>setLabel(p)}>{p}</button>)}</div>
      <div className="ah-input-group" style={{marginTop:16}}><label className="ah-label">Muscle Groups</label></div>
      <div className="ah-muscle-select">{MUSCLE_GROUPS.map(m=><button key={m} className={`ah-split-toggle ${muscles.includes(m)?"ah-split-on":""}`} onClick={()=>toggleMuscle(m)}>{m}{muscles.includes(m)&&<I.Check/>}</button>)}</div>
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Cancel</button><button className="ah-btn-primary ah-btn-sm" onClick={()=>onSave(label,muscles)}>Save</button></div>
    </div></div>
  );
}

// ─────────────────── TAB: FRIENDS & LEADERBOARD ───────────────────
function FriendsTab({ userData, onUpdateData }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPhone, setAddPhone] = useState("");
  const [addStatus, setAddStatus] = useState(null); // null | "sending" | "sent" | "error" | string
  const [comparing, setComparing] = useState(null); // friend object
  const [friendPRs, setFriendPRs] = useState({}); // phone -> { name, prs }
  const [leaderTab, setLeaderTab] = useState("friends"); // "friends" | "global"
  const [globalData, setGlobalData] = useState(null); // null = not loaded
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalEx, setGlobalEx] = useState(""); // selected exercise id

  const myPhone = userData.phone;

  const loadFriends = async () => {
    setLoading(true);
    const data = await getFriends(myPhone);
    setFriends(data);
    // Load PR data for accepted friends
    const accepted = data.filter(f => f.status === "accepted");
    const friendPhones = accepted.map(f => f.from_phone === myPhone ? f.to_phone : f.from_phone);
    if (friendPhones.length) {
      const prData = await getFriendPRs(friendPhones);
      const map = {};
      prData.forEach(d => { map[d.phone] = d; });
      setFriendPRs(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadFriends(); }, []);

  const loadGlobal = async () => {
    setGlobalLoading(true);
    const data = await getGlobalLeaderboard();
    setGlobalData(data);
    setGlobalLoading(false);
  };

  useEffect(() => {
    if (leaderTab === "global" && globalData === null) loadGlobal();
  }, [leaderTab]);

  const sendRequest = async () => {
    const phone = addPhone.trim().replace(/\s+/g,"");
    if (!phone || phone === myPhone) return;
    setAddStatus("sending");
    const result = await sendFriendRequest(myPhone, userData.name, phone);
    if (result.alreadyExists) setAddStatus("already_exists");
    else if (result.error) setAddStatus("error");
    else { setAddStatus("sent"); setAddPhone(""); loadFriends(); }
  };

  const respond = async (id, accept) => {
    await respondFriendRequest(id, accept);
    loadFriends();
  };

  const remove = async (id) => {
    await removeFriend(id);
    loadFriends();
  };

  const pending = friends.filter(f => f.status === "pending" && f.to_phone === myPhone);
  const sentPending = friends.filter(f => f.status === "pending" && f.from_phone === myPhone);
  const accepted = friends.filter(f => f.status === "accepted");

  const getFriendName = (f) => f.from_phone === myPhone ? (friendPRs[f.to_phone]?.name || f.to_phone) : (f.from_name || friendPRs[f.from_phone]?.name || f.from_phone);
  const getFriendPhone = (f) => f.from_phone === myPhone ? f.to_phone : f.from_phone;

  // Build my PRs for comparison
  const myPRs = buildPublicPRs(userData);

  return (
    <div className="ah-page ah-fade-in">
      <h1 className="ah-page-title"><I.Users s={24}/> Friends & Leaderboard</h1>

      {/* Tab toggle */}
      <div className="ah-leader-tabs">
        <button className={`ah-leader-tab ${leaderTab==="friends"?"ah-leader-tab-active":""}`} onClick={()=>setLeaderTab("friends")}>Friends</button>
        <button className={`ah-leader-tab ${leaderTab==="global"?"ah-leader-tab-active":""}`} onClick={()=>setLeaderTab("global")}>🌍 Global</button>
      </div>

      {/* ─── GLOBAL LEADERBOARD ─── */}
      {leaderTab === "global" && (() => {
        if (!userData.publicProfile) {
          return (
            <div className="ah-global-optin">
              <div className="ah-global-optin-icon">🌍</div>
              <h3 className="ah-global-optin-title">Global Leaderboard</h3>
              <p className="ah-global-optin-desc">Make your PRs public to appear on the global leaderboard and compete with everyone on Alari Peak.</p>
              <button className="ah-btn-primary" onClick={() => {
                const u = { ...userData, publicProfile: true }; saveData(u); if(onUpdateData) onUpdateData(u);
              }}>Make My Profile Public</button>
              <p className="ah-global-optin-note">You can turn this off anytime in your Profile.</p>
            </div>
          );
        }

        // Build leaderboard for selected exercise
        const myPRs = buildPublicPRs(userData);
        const allExercises = Object.values(myPRs).map(pr => ({ id: Object.keys(myPRs).find(k=>myPRs[k]===pr), ...pr }));
        // All exercises across all public profiles
        const allExIds = new Set();
        (globalData||[]).forEach(p => Object.keys(p.prs||{}).forEach(id => allExIds.add(id)));
        Object.keys(myPRs).forEach(id => allExIds.add(id));
        const exOptions = [...allExIds].map(id => {
          const name = myPRs[id]?.name || (globalData||[]).find(p=>p.prs[id])?.prs[id]?.name || id;
          return { id, name };
        }).sort((a,b)=>a.name.localeCompare(b.name));

        const selEx = globalEx || exOptions[0]?.id || "";

        // Build ranked list for selected exercise
        const rows = [];
        (globalData||[]).forEach(p => {
          const pr = p.prs?.[selEx];
          if (pr) rows.push({ phone: p.phone, name: p.name, weight: pr.weight, reps: pr.reps, orm: calc1RM(pr.weight, pr.reps) });
        });
        const myPR = myPRs[selEx];
        const meAlready = rows.find(r => r.phone === userData.phone);
        if (!meAlready && myPR) rows.push({ phone: userData.phone, name: userData.name || "You", weight: myPR.weight, reps: myPR.reps, orm: calc1RM(myPR.weight, myPR.reps), isMe: true });
        rows.sort((a,b) => (b.orm||0) - (a.orm||0));
        const myRank = rows.findIndex(r => r.phone === userData.phone) + 1;

        return (
          <div>
            {!userData.publicProfile && null}
            <div className="ah-global-banner">
              <span>✓ Your profile is public</span>
              <button className="ah-global-private-btn" onClick={() => {
                const u = { ...userData, publicProfile: false }; saveData(u); if(onUpdateData) onUpdateData(u);
              }}>Go private</button>
            </div>

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <span className="ah-cat-label" style={{margin:0}}>Exercise</span>
              <button className="ah-btn-secondary ah-btn-sm" onClick={loadGlobal} style={{fontSize:12}}>↺ Refresh</button>
            </div>
            <select className="ah-input ah-global-ex-select" value={selEx} onChange={e=>{setGlobalEx(e.target.value);}}>
              {exOptions.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>

            {globalLoading ? <p className="ah-empty-text">Loading…</p>
            : rows.length === 0 ? <p className="ah-empty-text">No data for this exercise yet — be the first!</p>
            : (
              <div className="ah-global-list">
                {rows.map((r, i) => {
                  const isMe = r.phone === userData.phone;
                  const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
                  return (
                    <div key={r.phone} className={`ah-global-row ${isMe?"ah-global-row-me":""}`}>
                      <span className="ah-global-rank">{medal || `#${i+1}`}</span>
                      <div className="ah-global-info">
                        <span className="ah-global-name">{isMe ? `${r.name || "You"} (You)` : r.name}</span>
                        <span className="ah-global-orm">~{r.orm}kg estimated 1RM</span>
                      </div>
                      <span className="ah-global-weight">{r.weight}<small>kg</small></span>
                    </div>
                  );
                })}
                {myRank > 0 && <p className="ah-global-rank-note">Your rank: #{myRank} of {rows.length}</p>}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── FRIENDS ─── */}
      {leaderTab === "friends" && <>

      {/* Add Friend */}
      <div className="ah-card" style={{marginBottom:20}}>
        <p className="ah-card-label" style={{marginBottom:10}}>Add Friend by Phone Number</p>
        <div style={{display:"flex",gap:8}}>
          <input className="ah-input" style={{flex:1}} placeholder="e.g. 0412 345 678" value={addPhone}
            onChange={e=>{ setAddPhone(e.target.value); setAddStatus(null); }}/>
          <button className="ah-btn-primary ah-btn-sm" disabled={!addPhone||addStatus==="sending"} onClick={sendRequest}>
            {addStatus==="sending"?"Sending…":"Send"}
          </button>
        </div>
        {addStatus==="sent" && <p className="ah-friends-status ah-status-ok">✓ Friend request sent!</p>}
        {addStatus==="already_exists" && <p className="ah-friends-status ah-status-warn">Already connected or request pending</p>}
        {addStatus==="error" && <p className="ah-friends-status ah-status-err">Something went wrong. Try again.</p>}
      </div>

      {/* Pending incoming requests */}
      {pending.length > 0 && (
        <div style={{marginBottom:20}}>
          <p className="ah-cat-label">Pending Requests</p>
          {pending.map(f => (
            <div key={f.id} className="ah-friend-card">
              <div className="ah-friend-info">
                <span className="ah-friend-name">{f.from_name || f.from_phone}</span>
                <span className="ah-friend-phone">{f.from_phone}</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="ah-btn-primary ah-btn-sm" onClick={()=>respond(f.id, true)}>Accept</button>
                <button className="ah-btn-secondary ah-btn-sm" onClick={()=>respond(f.id, false)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent pending */}
      {sentPending.length > 0 && (
        <div style={{marginBottom:20}}>
          <p className="ah-cat-label">Requests Sent</p>
          {sentPending.map(f => (
            <div key={f.id} className="ah-friend-card">
              <div className="ah-friend-info">
                <span className="ah-friend-name">{f.to_phone}</span>
                <span className="ah-friend-phone">Awaiting acceptance</span>
              </div>
              <button className="ah-icon-btn ah-del-btn" onClick={()=>remove(f.id)}><I.Trash/></button>
            </div>
          ))}
        </div>
      )}

      {/* Accepted friends */}
      {loading ? <p className="ah-empty-text">Loading…</p> : accepted.length === 0 && pending.length === 0 && sentPending.length === 0 ? (
        <div className="ah-empty-state"><I.Users s={32}/><p>No friends yet — send your first request above!</p></div>
      ) : accepted.length > 0 && (
        <div>
          <p className="ah-cat-label">Friends</p>
          {accepted.map(f => {
            const phone = getFriendPhone(f);
            const name = getFriendName(f);
            const theirPRs = friendPRs[phone]?.prs || {};
            const shared = Object.keys(myPRs).filter(id => theirPRs[id]);
            return (
              <div key={f.id} className="ah-friend-card ah-friend-card-accepted">
                <div className="ah-friend-info">
                  <span className="ah-friend-name">{name}</span>
                  <span className="ah-friend-phone">{shared.length} shared exercises</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="ah-btn-primary ah-btn-sm" onClick={()=>setComparing({phone, name, prs: theirPRs})}>Compare</button>
                  <button className="ah-icon-btn ah-del-btn" onClick={()=>remove(f.id)}><I.Trash/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare modal */}
      {comparing && (
        <div className="ah-modal-overlay" onClick={()=>setComparing(null)}><div className="ah-modal" style={{maxHeight:"85vh"}} onClick={e=>e.stopPropagation()}>
          <h2 className="ah-modal-title">vs {comparing.name}</h2>
          <p className="ah-modal-sub">Exercise by exercise PR comparison</p>
          <div className="ah-compare-header">
            <span className="ah-compare-me">You</span>
            <span className="ah-compare-ex"/>
            <span className="ah-compare-them">{comparing.name}</span>
          </div>
          {Object.entries(myPRs).map(([id, mine]) => {
            const theirs = comparing.prs[id];
            if (!theirs) return null;
            const my1rm = calc1RM(mine.weight, mine.reps);
            const their1rm = calc1RM(theirs.weight, theirs.reps);
            const iWin = my1rm >= their1rm;
            return (
              <div key={id} className="ah-compare-row">
                <div className={`ah-compare-side ah-compare-left ${iWin?"ah-compare-win":""}`}>
                  <span className="ah-compare-kg">{mine.weight}<small>kg</small></span>
                  <span className="ah-compare-orm">~{my1rm}kg 1RM</span>
                  {iWin && <span className="ah-compare-trophy">🏆</span>}
                </div>
                <div className="ah-compare-middle">
                  <span className="ah-compare-exname">{mine.name}</span>
                </div>
                <div className={`ah-compare-side ah-compare-right ${!iWin?"ah-compare-win":""}`}>
                  {!iWin && <span className="ah-compare-trophy">🏆</span>}
                  <span className="ah-compare-orm">~{their1rm}kg 1RM</span>
                  <span className="ah-compare-kg">{theirs.weight}<small>kg</small></span>
                </div>
              </div>
            );
          })}
          {!Object.keys(comparing.prs).some(id => myPRs[id]) && (
            <p className="ah-empty-text">No exercises in common yet — log some sets first!</p>
          )}
          <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={()=>setComparing(null)}>Close</button></div>
        </div></div>
      )}

      </>}
    </div>
  );
}

// ─────────────────── SHARE SPLIT MODAL ───────────────────
function ShareSplitModal({ userData, onClose }) {
  const [status, setStatus] = useState("sharing"); // sharing | done | error
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const doShare = async () => {
      const splits = userData.splits || {};
      const splitLabels = userData.splitLabels || {};
      const splitMuscles = userData.splitMuscles || {};
      const exercises = userData.exerciseList || [];
      // Only share exercises that appear in the split
      const usedIds = new Set(Object.values(splits).flat());
      const splitExercises = exercises.filter(e => usedIds.has(e.id));
      const payload = {
        splits, splitLabels, splitMuscles,
        exerciseList: splitExercises,
        authorName: userData.name,
        createdAt: new Date().toISOString(),
      };
      try {
        const c = await shareSplit(payload);
        setCode(c); setStatus("done");
      } catch { setStatus("error"); }
    };
    doShare();
  }, []);

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type); setTimeout(() => setCopied(false), 2000);
  };
  const link = code ? `${window.location.origin}?import=${code}` : "";

  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Share Your Split</h2>
      {status==="sharing" && <p className="ah-modal-sub">Generating your share code…</p>}
      {status==="error" && <p className="ah-modal-sub" style={{color:"var(--danger)"}}>Something went wrong. Check your connection and try again.</p>}
      {status==="done" && (<>
        <p className="ah-modal-sub">Anyone with this code can import your workout split</p>
        <div className="ah-share-code-display"><span className="ah-share-code">{code}</span></div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button className="ah-btn-primary ah-btn-sm" style={{flex:1}} onClick={()=>copyText(code,"code")}>{copied==="code"?"✓ Copied!":"Copy Code"}</button>
          <button className="ah-btn-secondary" style={{flex:1}} onClick={()=>copyText(link,"link")}>{copied==="link"?"✓ Copied!":"Copy Link"}</button>
        </div>
        <p className="ah-share-hint">Share this code with friends — they enter it on the Import Split screen to copy your setup</p>
      </>)}
      <div className="ah-modal-actions"><button className="ah-btn-secondary" onClick={onClose}>Close</button></div>
    </div></div>
  );
}

// ─────────────────── IMPORT SPLIT MODAL ───────────────────
function ImportSplitModal({ initialCode = "", userData, onImport, onClose }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [status, setStatus] = useState("idle"); // idle | loading | loaded | error
  const [splitData, setSplitData] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => { if (initialCode) fetchSplit(initialCode); }, []);

  const fetchSplit = async (c) => {
    setStatus("loading"); setErrMsg("");
    const data = await loadSharedSplit(c);
    if (data) { setSplitData(data); setStatus("loaded"); }
    else { setErrMsg("No split found with that code. Double-check and try again."); setStatus("idle"); }
  };

  const handleImport = () => {
    if (!splitData) return;
    const existing = userData.exerciseList || [];
    const existingIds = new Set(existing.map(e => e.id));
    const incoming = (splitData.exerciseList || []).filter(e => !existingIds.has(e.id));
    const exercisesData = { ...userData.exercises };
    incoming.forEach(e => { if (!exercisesData[e.id]) exercisesData[e.id] = { goal: null, history: [] }; });
    onImport({
      ...userData,
      exerciseList: [...existing, ...incoming],
      exercises: exercisesData,
      splits: splitData.splits || {},
      splitLabels: splitData.splitLabels || {},
      splitMuscles: splitData.splitMuscles || {},
    });
    onClose();
  };

  const daysWithEx = splitData ? DAYS.filter(d => (splitData.splits?.[d] || []).length > 0) : [];

  return (
    <div className="ah-modal-overlay" onClick={onClose}><div className="ah-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="ah-modal-title">Import a Split</h2>
      <p className="ah-modal-sub">Enter a share code to load someone's workout split</p>

      {status !== "loaded" && (
        <div className="ah-input-group">
          <label className="ah-label">Share Code</label>
          <input className="ah-input ah-code-input" placeholder="e.g. A3K9MX" value={code}
            onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} maxLength={6}/>
        </div>
      )}
      {errMsg && <p style={{color:"var(--danger)",fontSize:13,margin:"-8px 0 12px"}}>{errMsg}</p>}

      {status==="loaded" && splitData && (
        <div className="ah-import-preview">
          {splitData.authorName && <p className="ah-import-author">Split by <strong>{splitData.authorName}</strong></p>}
          {daysWithEx.map(day => {
            const ids = splitData.splits[day] || [];
            const exs = ids.map(id=>(splitData.exerciseList||[]).find(e=>e.id===id)).filter(Boolean);
            const label = splitData.splitLabels?.[day] || "";
            const muscles = splitData.splitMuscles?.[day] || [];
            return (
              <div key={day} className="ah-import-day">
                <div className="ah-import-day-header">
                  <span className="ah-import-day-name">{day}</span>
                  {label && <span className="ah-import-day-label">{label}</span>}
                </div>
                {muscles.length>0 && <div style={{display:"flex",gap:4,flexWrap:"wrap",margin:"2px 0 4px"}}>{muscles.map(m=><span key={m} className="ah-muscle-tag-sm">{m}</span>)}</div>}
                <p className="ah-import-day-exs">{exs.length ? exs.map(e=>e.name).join(", ") : "No exercises"}</p>
              </div>
            );
          })}
          <p className="ah-import-warn">⚠️ This replaces your current split schedule. Your history and PRs stay.</p>
        </div>
      )}

      <div className="ah-modal-actions">
        <button className="ah-btn-secondary" onClick={status==="loaded"?()=>setSplitData(null)||setStatus("idle"):onClose}>
          {status==="loaded" ? "Back" : "Cancel"}
        </button>
        {status==="loaded"
          ? <button className="ah-btn-primary ah-btn-sm" onClick={handleImport}>Import Split</button>
          : <button className="ah-btn-primary ah-btn-sm" disabled={code.length<4||status==="loading"} onClick={()=>fetchSplit(code)}>
              {status==="loading" ? "Loading…" : "Find Split"}
            </button>}
      </div>
    </div></div>
  );
}

// ─────────────────── TAB: PROGRESS ───────────────────
function ProgressTab({ userData }) {
  const [selected, setSelected] = useState(null);
  const exercises = userData.exerciseList || [];
  const canvasRef = useRef(null);
  const ex = exercises.find(e => e.id === selected);
  const history = ex ? [...(userData.exercises[ex.id]?.history || [])].reverse() : [];

  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const pad = { top: 20, right: 16, bottom: 32, left: 40 };
    const cW = W - pad.left - pad.right, cH = H - pad.top - pad.bottom;
    const weights = history.map(h => h.weight);
    const minW = Math.min(...weights) - 2, maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    ctx.clearRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
    for (let i=0;i<=4;i++) { const y=pad.top+(cH/4)*i; ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke(); }
    // Y labels
    ctx.fillStyle="#666"; ctx.font="11px Outfit"; ctx.textAlign="right";
    for (let i=0;i<=4;i++) { const v=maxW-(range/4)*i; ctx.fillText(v.toFixed(1),pad.left-8,pad.top+(cH/4)*i+4); }
    // X labels
    ctx.textAlign="center"; const step=Math.max(1,Math.floor(history.length/5));
    history.forEach((h,i)=>{ if(i%step===0||i===history.length-1){ const x=pad.left+(i/(history.length-1))*cW; const d=new Date(h.date); ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`,x,H-6); }});
    // Line
    ctx.beginPath(); ctx.strokeStyle="#C8A84E"; ctx.lineWidth=2.5; ctx.lineJoin="round";
    history.forEach((h,i)=>{ const x=pad.left+(i/(history.length-1))*cW; const y=pad.top+cH-((h.weight-minW)/range)*cH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();
    // Fill
    ctx.lineTo(pad.left+cW,pad.top+cH); ctx.lineTo(pad.left,pad.top+cH); ctx.closePath();
    const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+cH); grad.addColorStop(0,"rgba(200,168,78,0.25)"); grad.addColorStop(1,"rgba(200,168,78,0)");
    ctx.fillStyle=grad; ctx.fill();
    // Dots
    history.forEach((h,i)=>{ const x=pad.left+(i/(history.length-1))*cW; const y=pad.top+cH-((h.weight-minW)/range)*cH;
      ctx.beginPath(); ctx.arc(x,y,h.hitGoal?5:3,0,Math.PI*2); ctx.fillStyle=h.hitGoal?"#C8A84E":"#666"; ctx.fill();
      if(h.hitGoal){ctx.strokeStyle="rgba(200,168,78,0.4)";ctx.lineWidth=2;ctx.stroke();}
    });
  }, [selected, history]);

  return (
    <div className="ah-page ah-fade-in">
      <h1 className="ah-page-title"><I.Chart s={24}/> Progress</h1>
      <p className="ah-page-sub">Track your weight progression over time</p>
      <div className="ah-progress-select"><select className="ah-input ah-select" value={selected||""} onChange={e=>setSelected(e.target.value||null)}><option value="">Select an exercise</option>{exercises.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</select></div>
      {selected && ex ? <div className="ah-chart-area">
        {history.length<2 ? <p className="ah-empty-text">Log at least 2 sets to see a chart</p> : <>
          <canvas ref={canvasRef} className="ah-chart-canvas"/>
          <div className="ah-chart-legend"><span className="ah-legend-item"><span className="ah-legend-dot ah-legend-gold"/> Goal hit</span><span className="ah-legend-item"><span className="ah-legend-dot ah-legend-grey"/> Regular set</span></div>
          <div className="ah-chart-summary">
            <div className="ah-chart-stat"><span className="ah-chart-stat-val">{history[0]?.weight}kg</span><span className="ah-chart-stat-label">Started</span></div>
            <div className="ah-chart-stat"><span className="ah-chart-stat-val">{history[history.length-1]?.weight}kg</span><span className="ah-chart-stat-label">Current</span></div>
            <div className="ah-chart-stat"><span className={`ah-chart-stat-val ${history[history.length-1]?.weight>=history[0]?.weight?"ah-gold":"ah-red"}`}>{history[history.length-1]?.weight>=history[0]?.weight?"+":""}{(history[history.length-1]?.weight-history[0]?.weight).toFixed(1)}kg</span><span className="ah-chart-stat-label">Change</span></div>
          </div>
        </>}
      </div> : <div className="ah-empty-state"><I.Chart s={32}/><p>Select an exercise to view progress</p></div>}
    </div>
  );
}

// ─────────────────── TAB: GROWTH ───────────────────
function BodyWeightChart({ entries }) {
  const canvasRef = useRef(null);
  const sorted = [...entries].sort((a,b)=>new Date(a.date)-new Date(b.date));
  useEffect(() => {
    if (!canvasRef.current || sorted.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio||1;
    const rect = canvas.getBoundingClientRect();
    canvas.width=rect.width*dpr; canvas.height=rect.height*dpr; ctx.scale(dpr,dpr);
    const W=rect.width,H=rect.height,pad={top:16,right:12,bottom:28,left:38};
    const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom;
    const weights=sorted.map(e=>e.weight);
    const minW=Math.min(...weights)-2,maxW=Math.max(...weights)+2,range=maxW-minW||1;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1;
    for(let i=0;i<=3;i++){const y=pad.top+(cH/3)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();}
    ctx.fillStyle="#666"; ctx.font="10px Outfit"; ctx.textAlign="right";
    for(let i=0;i<=3;i++){const v=maxW-(range/3)*i;ctx.fillText(v.toFixed(1),pad.left-4,pad.top+(cH/3)*i+4);}
    ctx.textAlign="center";
    const step=Math.max(1,Math.floor(sorted.length/4));
    sorted.forEach((e,i)=>{if(i%step===0||i===sorted.length-1){const x=pad.left+(i/(sorted.length-1))*cW;const d=new Date(e.date);ctx.fillStyle="#666";ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`,x,H-6);}});
    ctx.beginPath(); ctx.strokeStyle="var(--gold)"; ctx.lineWidth=2.5; ctx.lineJoin="round";
    sorted.forEach((e,i)=>{const x=pad.left+(i/(sorted.length-1))*cW;const y=pad.top+cH-((e.weight-minW)/range)*cH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
    const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+cH);
    grad.addColorStop(0,"rgba(200,168,78,0.2)"); grad.addColorStop(1,"rgba(200,168,78,0)");
    ctx.lineTo(pad.left+cW,pad.top+cH); ctx.lineTo(pad.left,pad.top+cH); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();
    sorted.forEach((e,i)=>{const x=pad.left+(i/(sorted.length-1))*cW;const y=pad.top+cH-((e.weight-minW)/range)*cH;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle="var(--gold)";ctx.fill();});
  }, [entries]);
  if (sorted.length < 2) return null;
  return <canvas ref={canvasRef} className="ah-bw-chart"/>;
}

function GrowthTab({ userData, onUpdateData }) {
  const fileRef = useRef(null);
  const [bwInput, setBwInput] = useState("");
  const photos = userData.photos || [];
  const bodyWeights = userData.bodyWeight || [];
  const todayBW = bodyWeights.find(e=>e.date.slice(0,10)===todayStr());
  const recentBW = bodyWeights.slice(0,7);

  const logBodyWeight = () => {
    const w = Number(bwInput);
    if (!w || w <= 0) return;
    const entry = { date: new Date().toISOString(), weight: w };
    const filtered = bodyWeights.filter(e=>e.date.slice(0,10)!==todayStr());
    const sorted = [entry,...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const u={...userData, bodyWeight:sorted}; saveData(u); onUpdateData(u); setBwInput("");
  };
  const deleteBW = (entry) => {
    const u={...userData,bodyWeight:bodyWeights.filter(e=>!(e.date===entry.date&&e.weight===entry.weight))};
    saveData(u); onUpdateData(u);
  };

  const handleFile = (e) => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const np={id:Date.now(),date:new Date().toISOString(),data:ev.target.result};
      const u={...userData,photos:[np,...photos]}; saveData(u); onUpdateData(u);
    };
    reader.readAsDataURL(file); e.target.value="";
  };
  const deletePhoto = (id) => { const u={...userData,photos:photos.filter(p=>p.id!==id)}; saveData(u); onUpdateData(u); };

  return (
    <div className="ah-page ah-fade-in">
      <h1 className="ah-page-title"><I.Chart s={24}/> Growth</h1>
      <p className="ah-page-sub">Body weight & progress photos</p>

      {/* ── Body Weight ── */}
      <h3 className="ah-section-title" style={{marginBottom:12}}>Body Weight</h3>
      <div className="ah-bw-log-row">
        <input className="ah-input ah-bw-input" type="number" step="0.1" placeholder={todayBW ? `Today: ${todayBW.weight}kg` : "e.g. 82.5"} value={bwInput} onChange={e=>setBwInput(e.target.value)}/>
        <span className="ah-bw-unit">kg</span>
        <button className="ah-btn-primary ah-bw-btn" onClick={logBodyWeight}>Log</button>
      </div>

      {bodyWeights.length >= 2 && <BodyWeightChart entries={bodyWeights}/>}

      {recentBW.length > 0 && (
        <div className="ah-bw-list">
          {recentBW.map((e,i)=>(
            <div key={i} className="ah-bw-row">
              <span className="ah-bw-date">{formatDate(e.date)}</span>
              <span className="ah-bw-val">{e.weight}<small>kg</small></span>
              {i>0 && recentBW[i-1] && <span className={`ah-bw-diff ${e.weight<recentBW[i-1].weight?"ah-bw-down":e.weight>recentBW[i-1].weight?"ah-bw-up":""}`}>
                {e.weight<recentBW[i-1].weight?`-${(recentBW[i-1].weight-e.weight).toFixed(1)}`:e.weight>recentBW[i-1].weight?`+${(e.weight-recentBW[i-1].weight).toFixed(1)}`:"—"}
              </span>}
              <button className="ah-icon-btn ah-del-btn" onClick={()=>deleteBW(e)}><I.Trash/></button>
            </div>
          ))}
        </div>
      )}
      {bodyWeights.length===0 && <p className="ah-empty-text" style={{marginBottom:24}}>Log your first body weight above</p>}

      {/* ── Progress Photos ── */}
      <h3 className="ah-section-title" style={{marginTop:28,marginBottom:12}}><I.Camera s={18}/> Progress Photos</h3>
      <button className="ah-btn-secondary ah-btn-photo" onClick={()=>fileRef.current?.click()}><I.Camera s={16}/> Add Photo</button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
      {photos.length===0
        ? <div className="ah-empty-state" style={{marginTop:12}}><I.Camera s={28}/><p>No progress photos yet</p></div>
        : <div className="ah-photo-grid">{photos.map(p=>(
          <div key={p.id} className="ah-photo-card">
            <div className="ah-photo-img-wrap"><img src={p.data} alt="Progress" className="ah-photo-img"/></div>
            <div className="ah-photo-footer"><span className="ah-photo-date">{formatDate(p.date)}</span><button className="ah-icon-btn ah-del-btn" onClick={()=>deletePhoto(p.id)}><I.Trash/></button></div>
          </div>
        ))}</div>
      }
    </div>
  );
}

// ─────────────────── THEME SHEET ───────────────────
function ThemeSheet({ current, onChange, onClose }) {
  return (
    <div className="ah-modal-overlay ah-sheet-overlay" onClick={onClose}>
      <div className="ah-theme-sheet" onClick={e=>e.stopPropagation()}>
        <div className="ah-sheet-handle"/>
        <h2 className="ah-sheet-title">Choose Mode</h2>
        <div className="ah-theme-cards">
          {Object.values(THEMES).map(t => (
            <button key={t.id} className={`ah-theme-card ${current===t.id?"ah-theme-card-active":""}`} onClick={()=>{onChange(t.id);onClose();}}>
              {/* Mini app preview */}
              <div className="ah-theme-card-preview" style={{background:t.bg,borderColor:t.cardBorder}}>
                <div className="ah-tcp-bar" style={{background:t.card,borderColor:t.cardBorder}}>
                  <div className="ah-tcp-dot" style={{background:t.accent}}/>
                  <div className="ah-tcp-line" style={{background:t.text3}}/>
                </div>
                <div className="ah-tcp-card" style={{background:t.card,borderColor:t.cardBorder}}>
                  <div className="ah-tcp-line ah-tcp-line-short" style={{background:t.text3}}/>
                  <div className="ah-tcp-accent-bar" style={{background:t.accent}}/>
                </div>
              </div>
              <div className="ah-theme-card-info">
                <span className="ah-theme-card-name" style={{color:current===t.id?t.accent:"inherit"}}>{t.name}</span>
                <span className="ah-theme-card-desc">{t.desc}</span>
              </div>
              {current===t.id && <div className="ah-theme-card-check" style={{background:t.accent}}><I.Check/></div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────── THEMES ───────────────────
const THEMES = {
  dark_gold:  { id:"dark_gold",  name:"Dark Mode",   desc:"Black & Gold",        bg:"#0A0A0A", bg2:"#111111", bg3:"#1A1A1A", card:"#141414", cardBorder:"#222",     text:"#F5F5F0", text2:"#999", text3:"#555", accent:"#C8A84E", accentLight:"#E8D48B" },
  light_gold: { id:"light_gold", name:"Light Mode",  desc:"White & Gold",        bg:"#F5F5F0", bg2:"#EAEAE5", bg3:"#E0E0DB", card:"#FFFFFF", cardBorder:"#D4D4CF", text:"#1A1A1A", text2:"#666", text3:"#999", accent:"#B8942E", accentLight:"#D4B45E" },
  dark_neon:  { id:"dark_neon",  name:"Energy Mode", desc:"Black & Neon Green",  bg:"#0A0A0A", bg2:"#0D0D0D", bg3:"#141414", card:"#111111", cardBorder:"#1A2E1A", text:"#F0FFF0", text2:"#7BAF7B", text3:"#4A6B4A", accent:"#39FF14", accentLight:"#80FF57" },
};

function applyTheme(themeId) {
  const t = THEMES[themeId] || THEMES.dark_gold;
  const root = document.documentElement;
  root.style.setProperty("--gold", t.accent);
  root.style.setProperty("--gold-light", t.accentLight);
  root.style.setProperty("--gold-dim", t.accent + "26");
  root.style.setProperty("--gold-glow", t.accent + "4D");
  root.style.setProperty("--bg", t.bg);
  root.style.setProperty("--bg2", t.bg2);
  root.style.setProperty("--bg3", t.bg3);
  root.style.setProperty("--card", t.card);
  root.style.setProperty("--card-border", t.cardBorder);
  root.style.setProperty("--text", t.text);
  root.style.setProperty("--text2", t.text2);
  root.style.setProperty("--text3", t.text3);
  document.body.style.background = t.bg;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.bg;
}

// ─────────────────── PROFILE PAGE ───────────────────
function ProfilePage({ userData, onUpdateData, onLogout, onBack }) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userData.name || "");
  const currentTheme = userData.theme || "dark_gold";

  const saveName = () => {
    if (newName.trim()) {
      const u = { ...userData, name: newName.trim() }; saveData(u); onUpdateData(u);
    }
    setEditingName(false);
  };

  const changeTheme = (themeId) => {
    applyTheme(themeId);
    const u = { ...userData, theme: themeId }; saveData(u); onUpdateData(u);
  };

  const totalSets = Object.values(userData.exercises||{}).reduce((s,e)=>s+(e.history?.length||0),0);
  const memberSince = userData.joinDate ? formatDate(userData.joinDate) : "Today";

  return (
    <div className="ah-page ah-fade-in">
      <button className="ah-back-btn" onClick={onBack}><I.Back/> Back</button>
      <div className="ah-profile-header">
        <div className="ah-profile-avatar"><I.User s={36}/></div>
        {editingName ? (
          <div className="ah-profile-edit-name">
            <input className="ah-input" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus/>
            <button className="ah-btn-primary ah-btn-sm" onClick={saveName}>Save</button>
          </div>
        ) : (
          <div className="ah-profile-name-row">
            <h1 className="ah-profile-name">{userData.name}</h1>
            <button className="ah-icon-btn" onClick={()=>{setNewName(userData.name);setEditingName(true)}}><I.Edit/></button>
          </div>
        )}
        <p className="ah-profile-phone">{userData.phone}</p>
        <p className="ah-profile-since">Member since {memberSince}</p>
      </div>

      <div className="ah-profile-stats">
        <div className="ah-stat-card"><span className="ah-stat-val">{(userData.exerciseList||[]).length}</span><span className="ah-stat-label">Exercises</span></div>
        <div className="ah-stat-card"><span className="ah-stat-val">{totalSets}</span><span className="ah-stat-label">Total Sets</span></div>
      </div>

      <h3 className="ah-section-title" style={{marginTop:24,marginBottom:12}}><I.Palette/> Colour Mode</h3>
      <div className="ah-theme-cards">
        {Object.values(THEMES).map(t => (
          <button key={t.id} className={`ah-theme-card ${currentTheme===t.id?"ah-theme-card-active":""}`} onClick={()=>changeTheme(t.id)}>
            <div className="ah-theme-card-preview" style={{background:t.bg,borderColor:t.cardBorder}}>
              <div className="ah-tcp-bar" style={{background:t.card,borderColor:t.cardBorder}}>
                <div className="ah-tcp-dot" style={{background:t.accent}}/>
                <div className="ah-tcp-line" style={{background:t.text3}}/>
              </div>
              <div className="ah-tcp-card" style={{background:t.card,borderColor:t.cardBorder}}>
                <div className="ah-tcp-line ah-tcp-line-short" style={{background:t.text3}}/>
                <div className="ah-tcp-accent-bar" style={{background:t.accent}}/>
              </div>
            </div>
            <div className="ah-theme-card-info">
              <span className="ah-theme-card-name" style={{color:currentTheme===t.id?t.accent:"inherit"}}>{t.name}</span>
              <span className="ah-theme-card-desc">{t.desc}</span>
            </div>
            {currentTheme===t.id && <div className="ah-theme-card-check" style={{background:t.accent}}><I.Check/></div>}
          </button>
        ))}
      </div>

      <h3 className="ah-section-title" style={{marginTop:24,marginBottom:12}}>🌍 Global Leaderboard</h3>
      <div className="ah-profile-toggle-row">
        <div>
          <p className="ah-profile-toggle-label">Public Profile</p>
          <p className="ah-profile-toggle-desc">Show your PRs on the global leaderboard so anyone can compete with you</p>
        </div>
        <button className={`ah-toggle ${userData.publicProfile?"ah-toggle-on":""}`} onClick={()=>{
          const u = { ...userData, publicProfile: !userData.publicProfile }; saveData(u); onUpdateData(u);
        }}>
          <span className="ah-toggle-thumb"/>
        </button>
      </div>

      <button className="ah-btn-logout" onClick={onLogout}><I.Logout/> Log Out</button>
    </div>
  );
}

// ─────────────────── ONBOARDING ───────────────────
function OnboardingScreen({ onDismiss }) {
  return (
    <div className="ah-modal-overlay" onClick={onDismiss}>
      <div className="ah-modal ah-onboard-modal" onClick={e=>e.stopPropagation()}>
        <div className="ah-onboard-icon"><I.Calendar s={32}/></div>
        <h2 className="ah-modal-title">Before you begin</h2>
        <p className="ah-onboard-text">Head to the <strong>Split</strong> tab to set up your weekly workout schedule. Name each day (Push, Pull, Legs, etc.) and assign your exercises.</p>
        <p className="ah-onboard-text">This will make your home screen show exactly what you need to do each day.</p>
        <button className="ah-btn-primary" onClick={onDismiss}>Got it</button>
      </div>
    </div>
  );
}

// ─────────────────── TAB BAR ───────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id:"home", label:"Home", icon:<I.Home s={20}/> },
    { id:"prs", label:"PRs", icon:<I.Trophy s={20}/> },
    { id:"split", label:"Split", icon:<I.Calendar s={20}/> },
    { id:"food", label:"Food", icon:<span style={{fontSize:18}}>🍽️</span> },
    { id:"friends", label:"Friends", icon:<I.Users s={20}/> },
    { id:"growth", label:"Growth", icon:<I.Camera s={20}/> },
  ];
  return (
    <div className="ah-tabbar">{tabs.map(t=>(
      <button key={t.id} className={`ah-tabbar-item ${active===t.id?"ah-tabbar-active":""}`} onClick={()=>onChange(t.id)}>
        <span className="ah-tabbar-icon">{t.icon}</span><span className="ah-tabbar-label">{t.label}</span>
      </button>
    ))}</div>
  );
}

// ─────────────────── APP ROOT ───────────────────
export default function AlariHealth() {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState("home");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const syncTimer = useRef(null);

  // Pick up ?import=CODE from the URL (share link)
  const [pendingImportCode] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("import") || "";
  });
  const [importDone, setImportDone] = useState(false);

  // When a share link is opened, jump straight to the Split tab
  useEffect(() => {
    if (pendingImportCode && isLoggedIn && !importDone) setTab("split");
  }, [pendingImportCode, isLoggedIn]);

  // On mount: restore from localStorage instantly, then refresh from cloud
  useEffect(() => {
    const init = async () => {
      const cached = loadData();
      if (cached?.phone) {
        setUserData(cached); setIsLoggedIn(true); applyTheme(cached.theme || "dark_gold");
        const fresh = await loadUserData(cached.phone);
        if (fresh) {
          const merged = { ...fresh, photos: cached.photos || [] };
          saveData(merged); setUserData(merged); applyTheme(merged.theme || "dark_gold");
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Auto-sync any userData change to Supabase (debounced 1.5s) + sync public PRs
  useEffect(() => {
    if (!userData) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncing(true);
      await saveUserData(userData);
      // Keep public PR table up-to-date so friends can see our bests
      if (userData.phone) {
        const prs = buildPublicPRs(userData);
        await syncPublicPRs(userData.phone, userData.name, prs, userData.publicProfile || false);
      }
      setSyncing(false);
    }, 1500);
    return () => clearTimeout(syncTimer.current);
  }, [userData]);

  const handleLogin = async (phone, name) => {
    setLoading(true);
    const cloudData = await loadUserData(phone);
    if (cloudData) {
      const local = loadData();
      const merged = { ...cloudData, photos: local?.photos || [] };
      saveData(merged); setUserData(merged); applyTheme(merged.theme || "dark_gold");
    } else {
      const local = loadData();
      if (local?.phone === phone) {
        setUserData(local); applyTheme(local.theme || "dark_gold");
        await saveUserData(local);
      } else {
        const nd = { phone, name, exerciseList:[], exercises:{}, splits:{}, splitLabels:{}, splitMuscles:{}, photos:[], manualPRs:{}, bodyWeight:[], theme:"dark_gold", joinDate:new Date().toISOString(), onboarded:false };
        saveData(nd); await saveUserData(nd); setUserData(nd); setShowOnboarding(true);
      }
    }
    setIsLoggedIn(true);
    setLoading(false);
  };

  const handleUpdateExerciseData = (exId, data) => {
    const u = { ...userData, exercises: { ...userData.exercises, [exId]: data } }; saveData(u); setUserData(u);
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    const u = { ...userData, onboarded: true }; saveData(u); setUserData(u);
  };

  if (loading) return (
    <><style>{styles}</style>
    <div className="ah-app">
      <div className="ah-loading-screen">
        <div className="ah-loading-logo"><span className="ah-logo-a">A</span><span className="ah-logo-h">H</span></div>
        <div className="ah-loading-spinner"/>
      </div>
    </div></>
  );

  if (!isLoggedIn) return (<><style>{styles}</style><div className="ah-app"><WelcomeScreen onLogin={handleLogin}/></div></>);

  return (
    <><style>{styles}</style>
      <div className="ah-app">
        <div className="ah-content">
          {showProfile ? <ProfilePage userData={userData} onUpdateData={setUserData} onLogout={()=>{setIsLoggedIn(false);setSelectedExercise(null);setShowProfile(false);}} onBack={()=>setShowProfile(false)}/>
          : selectedExercise ? <ExerciseDetail exercise={selectedExercise} userData={userData} onBack={()=>setSelectedExercise(null)} onUpdateData={handleUpdateExerciseData}/>
          : tab==="home" ? <HomeTab userData={userData} onUpdateData={setUserData} onLogout={()=>{setIsLoggedIn(false);setSelectedExercise(null);}} onSelectExercise={setSelectedExercise} onOpenProfile={()=>setShowProfile(true)}/>
          : tab==="prs" ? <PRsTab userData={userData} onUpdateData={setUserData}/>
          : tab==="split" ? <SplitTab userData={userData} onUpdateData={setUserData} importCode={importDone ? "" : pendingImportCode} onImportDone={()=>setImportDone(true)}/>
          : tab==="food" ? <NutritionTab userData={userData} onUpdateData={setUserData}/>
          : tab==="friends" ? <FriendsTab userData={userData} onUpdateData={setUserData}/>
          : <GrowthTab userData={userData} onUpdateData={setUserData}/>}
        </div>
        {syncing && <div className="ah-sync-pill">Saving…</div>}
        {!showProfile && <TabBar active={selectedExercise?"home":tab} onChange={(t)=>{setTab(t);setSelectedExercise(null);}}/>}
        {showOnboarding && <OnboardingScreen onDismiss={handleDismissOnboarding}/>}
      </div>
    </>
  );
}

// ─────────────────── STYLES ───────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');

.ah-app {
  --gold:#C8A84E;--gold-light:#E8D48B;--gold-dim:rgba(200,168,78,0.15);--gold-glow:rgba(200,168,78,0.3);
  --bg:#0A0A0A;--bg2:#111111;--bg3:#1A1A1A;--card:#141414;--card-border:#222;
  --text:#F5F5F0;--text2:#999;--text3:#555;--danger:#E84545;--red:#E84545;--success:#4ADE80;--radius:14px;
  font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);
  min-height:100vh;max-width:480px;margin:0 auto;position:relative;display:flex;flex-direction:column;
}
.ah-content{flex:1;overflow-y:auto;padding-bottom:85px;}
.ah-page{padding:calc(env(safe-area-inset-top, 20px) + 12px) 20px 20px;}

/* ── rest timer ── */
.ah-timer-modal{text-align:center}
.ah-timer-label{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:var(--text2);margin-bottom:16px}
.ah-timer-circle-wrap{position:relative;width:140px;height:140px;margin:0 auto 20px}
.ah-timer-svg{width:100%;height:100%}
.ah-timer-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums}
.ah-timer-presets{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:4px 0 0}
.ah-timer-preset{padding:14px 0;background:var(--bg3);border:1px solid var(--card-border);border-radius:10px;color:var(--text);font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}
.ah-timer-preset:hover{border-color:var(--gold);color:var(--gold)}

/* ── 1RM chip ── */
.ah-1rm-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text2);margin-top:10px;background:var(--bg3);border:1px solid var(--card-border);border-radius:20px;padding:4px 10px}
.ah-1rm-chip strong{color:var(--gold)}
.ah-weight-1rm{font-size:11px;color:var(--text3)}

/* ── today logged note ── */
.ah-today-logged{font-size:12px;color:var(--text3);margin:-6px 0 12px;text-align:center}

/* ── set action buttons ── */
.ah-set-actions{display:flex;gap:2px;margin-left:auto}

/* ── PR card updates ── */
.ah-pr-right{display:flex;align-items:center;gap:8px}
.ah-pr-actions{display:flex;gap:2px}
.ah-pr-1rm{font-size:11px;color:var(--gold);margin-top:2px}

/* ── body weight section ── */
.ah-bw-log-row{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.ah-bw-input{flex:1;margin-bottom:0}
.ah-bw-unit{color:var(--text2);font-size:14px;white-space:nowrap}
.ah-bw-btn{width:auto;padding:14px 20px;margin-top:0}
.ah-bw-chart{width:100%;height:130px;display:block;margin-bottom:12px}
.ah-bw-list{background:var(--card);border:1px solid var(--card-border);border-radius:12px;overflow:hidden;margin-bottom:8px}
.ah-bw-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--card-border);font-size:13px}
.ah-bw-row:last-child{border-bottom:none}
.ah-bw-date{flex:1;color:var(--text2)}
.ah-bw-val{font-weight:600;color:var(--text)}
.ah-bw-val small{font-size:11px;color:var(--text2);margin-left:2px}
.ah-bw-diff{font-size:12px;min-width:36px;text-align:right}
.ah-bw-down{color:#4ADE80}.ah-bw-up{color:var(--danger)}
.ah-btn-photo{width:auto;padding:12px 20px;margin-bottom:16px}

/* ── rep range modal ── */
.ah-rep-range-row{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px}
.ah-rep-range-field{flex:1;margin-bottom:0!important}
.ah-rep-range-dash{font-size:20px;font-weight:300;color:var(--text2);padding-bottom:14px}
.ah-modal-sub{color:var(--text2);font-size:13px;margin:-4px 0 16px;line-height:1.5}

/* ── rep progression dots ── */
.ah-weight-progress{margin-top:14px;padding-top:14px;border-top:1px solid var(--card-border)}
.ah-weight-progress-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text2);display:block;margin-bottom:8px}
.ah-rep-dots{display:flex;flex-wrap:wrap;gap:6px}
.ah-rep-dot{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 6px;border-radius:8px;font-size:13px;font-weight:600;border:1.5px solid transparent}
.ah-rep-dot-low{background:rgba(255,255,255,0.04);border-color:var(--card-border);color:var(--text3)}
.ah-rep-dot-good{background:rgba(200,168,78,0.1);border-color:rgba(200,168,78,0.3);color:var(--gold)}
.ah-rep-dot-gold{background:var(--gold);border-color:var(--gold);color:#0A0A0A}

/* ── log row + override ── */
.ah-log-row{display:flex;gap:10px;margin:16px 0}
.ah-btn-override{padding:0 18px;background:var(--bg3);border:1px solid var(--card-border);border-radius:10px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .2s}
.ah-btn-override:hover{border-color:var(--gold);color:var(--gold)}

/* ── feedback banners ── */
.ah-range-banner{background:rgba(200,168,78,0.1);border:1px solid rgba(200,168,78,0.3);color:var(--gold);border-radius:8px;padding:10px 14px;font-size:13px;font-weight:500;margin-bottom:8px;text-align:center}

/* ── weight history groups ── */
.ah-weight-group{background:var(--card);border:1px solid var(--card-border);border-radius:12px;margin-bottom:10px;overflow:hidden}
.ah-weight-current{border-color:rgba(200,168,78,0.35)}
.ah-weight-group-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px}
.ah-weight-group-kg{font-size:22px;font-weight:700;color:var(--text)}
.ah-weight-group-kg small{font-size:13px;font-weight:400;color:var(--text2);margin-left:2px}
.ah-weight-group-meta{display:flex;align-items:center;gap:6px}
.ah-weight-range-label{font-size:11px;color:var(--text3)}
.ah-hit-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--gold);background:rgba(200,168,78,0.1);padding:2px 7px;border-radius:20px}
.ah-current-badge{font-size:11px;font-weight:600;color:#0A0A0A;background:var(--gold);padding:2px 8px;border-radius:20px}
.ah-weight-set-list{padding:0 14px}
.ah-weight-set-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--card-border);font-size:13px}
.ah-weight-set-row.ah-set-hit{background:transparent}
.ah-weight-set-row.ah-set-hit .ah-set-reps{color:var(--gold);font-weight:600}
.ah-set-date{color:var(--text2);flex:1}
.ah-set-time{color:var(--text3);font-size:11px}
.ah-set-reps{font-weight:600;color:var(--text)}
.ah-weight-best{padding:8px 14px 12px;font-size:12px;color:var(--text3)}

/* ── loading screen ── */
.ah-loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:24px;background:var(--bg)}
.ah-loading-logo{display:inline-flex;gap:2px;font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--gold);border:1.5px solid var(--gold-dim);border-radius:50%;width:56px;height:56px;align-items:center;justify-content:center;}
@keyframes spin{to{transform:rotate(360deg)}}
.ah-loading-spinner{width:28px;height:28px;border:2.5px solid var(--gold-dim);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
.ah-sync-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:12px;background:var(--bg3);border:1px solid var(--card-border);color:var(--text2);font-size:11px;padding:4px 10px;border-radius:20px;z-index:999;pointer-events:none}
.ah-last-entry{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;color:var(--text2)}
.ah-last-entry strong{color:var(--text);font-weight:600}
.ah-last-date{color:var(--text3);font-size:12px}

@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeOut{from{opacity:1}to{opacity:0}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
@keyframes ringPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.15);opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.ah-fade-in{animation:fadeIn .4s ease-out}
.ah-splash-in{animation:fadeIn .8s ease-out}
.ah-splash-out{animation:fadeOut .5s ease-out forwards}
.ah-form-in{animation:slideUp .6s ease-out}

.ah-welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:32px 24px;text-align:center;background:radial-gradient(ellipse at 50% 30%,rgba(200,168,78,0.06) 0%,transparent 70%)}
.ah-welcome-logo{position:relative;width:100px;height:100px;margin-bottom:28px}
.ah-logo-ring{position:absolute;inset:0;border:2px solid var(--gold);border-radius:50%;animation:ringPulse 2.5s ease-in-out infinite}
.ah-logo-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:2px;font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--gold)}
.ah-welcome-title{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:var(--gold);margin:0 0 8px;letter-spacing:1px}
.ah-welcome-sub{color:var(--text2);font-size:14px;font-weight:300;letter-spacing:3px;text-transform:uppercase}
.ah-login-card{width:100%;max-width:380px;text-align:center}
.ah-login-logo-small{display:inline-flex;gap:2px;font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--gold);border:1.5px solid var(--gold-dim);border-radius:50%;width:52px;height:52px;align-items:center;justify-content:center;margin-bottom:24px}
.ah-login-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:600;margin:0 0 8px;line-height:1.3;color:var(--text)}
.ah-login-sub{color:var(--text2);font-size:14px;margin-bottom:28px}
.ah-gold{color:var(--gold)}.ah-red{color:var(--red)}

.ah-input-group{margin-bottom:16px;text-align:left}
.ah-label{display:block;font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
.ah-input{width:100%;padding:14px 16px;background:var(--bg3);border:1px solid var(--card-border);border-radius:10px;color:var(--text);font-family:'Outfit',sans-serif;font-size:15px;outline:none;transition:border-color .2s;box-sizing:border-box}
.ah-input:focus{border-color:var(--gold)}.ah-input::placeholder{color:var(--text3)}.ah-select{cursor:pointer;appearance:none}

.ah-btn-primary{width:100%;padding:15px;background:var(--gold);color:#0A0A0A;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;letter-spacing:.5px;margin-top:8px}
.ah-btn-primary:hover{background:var(--gold-light)}.ah-btn-disabled{opacity:.35;pointer-events:none}
.ah-btn-sm{width:auto;padding:10px 24px;margin-top:0}
.ah-btn-secondary{padding:10px 24px;background:transparent;color:var(--text2);border:1px solid var(--card-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;cursor:pointer;transition:all .2s}
.ah-btn-secondary:hover{border-color:var(--text2);color:var(--text)}
.ah-btn-danger{padding:10px 24px;background:var(--danger);color:white;border:none;border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;cursor:pointer}
.ah-btn-add{width:36px;height:36px;border-radius:10px;background:var(--gold-dim);border:none;color:var(--gold);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.ah-btn-add:hover{background:var(--gold-glow)}
.ah-icon-btn{background:none;border:none;color:var(--text2);cursor:pointer;padding:6px;border-radius:8px;transition:all .2s;display:flex;align-items:center;justify-content:center}
.ah-icon-btn:hover{color:var(--text);background:var(--bg3)}
.ah-btn-log{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0;font-size:15px}

.ah-dash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.ah-dash-greeting{font-size:14px;color:var(--text2);margin:0 0 2px;font-weight:300;letter-spacing:1px}
.ah-dash-name-big{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;margin:0;color:var(--gold);line-height:1.1}
.ah-text-dim{color:var(--text3)!important}

/* Home today's split */
.ah-home-today{background:linear-gradient(135deg,rgba(200,168,78,0.08) 0%,rgba(200,168,78,0.02) 100%);border:1px solid rgba(200,168,78,0.25);border-radius:var(--radius);padding:18px;margin:16px 0 20px}
.ah-home-today-header{margin-bottom:8px}
.ah-home-today-day{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:2px;font-weight:500}
.ah-home-today-label{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);margin:4px 0 0}
.ah-home-today-list{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.ah-home-today-ex{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(0,0,0,0.3);border-radius:10px;cursor:pointer;transition:all .2s}
.ah-home-today-ex:hover{background:rgba(0,0,0,0.5)}
.ah-home-today-ex-info{display:flex;flex-direction:column}
.ah-home-today-ex-name{font-size:14px;font-weight:500}
.ah-home-today-ex-cat{font-size:11px;color:var(--text3);margin-top:1px}
.ah-home-today-ex-right{display:flex;align-items:center;gap:8px}
.ah-home-today-ex-goal{font-size:12px;color:var(--gold)}
.ah-home-today-rest{color:var(--text3);font-size:13px;margin:8px 0 0}
.ah-muscle-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.ah-muscle-tag{font-size:10px;padding:4px 10px;background:var(--gold-dim);color:var(--gold);border-radius:6px;font-weight:500;letter-spacing:.5px}
.ah-stats-row{display:flex;gap:10px;margin-bottom:28px}
.ah-stat-card{flex:1;background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);padding:14px 12px;text-align:center}
.ah-stat-val{display:block;font-size:24px;font-weight:700;color:var(--text)}
.ah-stat-label{display:block;font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:1.2px;margin-top:4px}

.ah-page-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:10px}
.ah-page-sub{color:var(--text2);font-size:13px;margin:0 0 20px}

.ah-section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.ah-section-title{font-size:15px;font-weight:600;margin:0;display:flex;align-items:center;gap:8px;color:var(--text)}
.ah-cat-group{margin-bottom:20px}.ah-cat-label{font-size:10px;font-weight:500;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin:0 0 8px}

.ah-exercise-card{display:flex;justify-content:space-between;align-items:center;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:all .2s}
.ah-exercise-card:hover{border-color:var(--gold-dim);background:var(--bg3)}
.ah-exercise-name{display:block;font-size:15px;font-weight:500}
.ah-exercise-meta{display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap}
.ah-exercise-cat-tag{font-size:10px;padding:2px 8px;background:var(--bg3);border-radius:5px;color:var(--text3);font-weight:500}
.ah-exercise-goal{display:block;font-size:12px;color:var(--gold)}
.ah-exercise-days{font-size:10px;color:var(--text3)}
.ah-no-goal{color:var(--text3)}
.ah-lib-hint{font-size:12px;color:var(--text3);margin:0 0 12px;line-height:1.4}
.ah-lib-list{display:flex;flex-direction:column}
.ah-exercise-right{display:flex;align-items:center;gap:6px}.ah-mini-fire{color:var(--gold);display:flex}
.ah-del-btn{opacity:.4}.ah-del-btn:hover{opacity:1;color:var(--danger)!important}
.ah-empty-state{text-align:center;padding:48px 24px;color:var(--text3);display:flex;flex-direction:column;align-items:center;gap:12px}
.ah-empty-text{color:var(--text3);font-size:13px;text-align:center;padding:16px}

.ah-detail{padding:calc(env(safe-area-inset-top, 20px) + 12px) 20px 20px}
.ah-back-btn{display:flex;align-items:center;gap:4px;background:none;border:none;color:var(--text2);font-family:'Outfit',sans-serif;font-size:14px;cursor:pointer;padding:0;margin-bottom:16px}
.ah-back-btn:hover{color:var(--gold)}
.ah-detail-header{margin-bottom:20px}.ah-detail-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;margin:0 0 4px;color:var(--text)}
.ah-detail-cat{font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:2px}
.ah-card{background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);padding:18px}.ah-goal-card{margin-bottom:4px}
.ah-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.ah-card-label{font-size:10px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:1.5px}
.ah-goal-display{display:flex;align-items:center;justify-content:center;gap:16px}
.ah-goal-num{text-align:center}.ah-big-num{display:block;font-size:36px;font-weight:700;color:var(--gold);line-height:1}
.ah-big-label{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1.5px}.ah-goal-x{color:var(--text3);font-size:20px}
.ah-history-section{margin-top:24px}.ah-history-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.ah-history-item{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px}
.ah-history-hit{border-color:rgba(200,168,78,0.3)}.ah-history-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.ah-history-date{font-size:13px;font-weight:500;color:var(--text)}.ah-history-time{font-size:12px;color:var(--text3)}
.ah-hit-tag{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:11px;color:var(--gold);font-weight:600;letter-spacing:.5px}
.ah-history-stats{display:flex;align-items:center;gap:8px}.ah-stat{font-size:20px;font-weight:600}
.ah-stat small{font-size:12px;font-weight:400;color:var(--text2)}.ah-stat-sep{color:var(--text3)}
.ah-history-goal-ref{font-size:11px;color:var(--text3);margin-top:6px}

.ah-increase-prompt{display:flex;gap:14px;padding:18px;margin:12px 0 4px;background:linear-gradient(135deg,rgba(200,168,78,0.1) 0%,rgba(200,168,78,0.04) 100%);border:1px solid rgba(200,168,78,0.3);border-radius:var(--radius);animation:scaleIn .4s ease-out}
.ah-increase-icon{flex-shrink:0;width:40px;height:40px;border-radius:10px;background:var(--gold-dim);color:var(--gold);display:flex;align-items:center;justify-content:center}
.ah-increase-content{flex:1}.ah-increase-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--gold);margin:0 0 4px}
.ah-increase-desc{font-size:13px;color:var(--text2);margin:0 0 14px;line-height:1.4}.ah-increase-desc strong{color:var(--text);font-weight:600}
.ah-increase-actions{display:flex;gap:8px;flex-wrap:wrap}

.ah-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;z-index:100;animation:fadeIn .2s ease-out}
.ah-modal{background:var(--bg2);border:1px solid var(--card-border);border-radius:20px 20px 0 0;padding:28px 24px 36px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;animation:slideUp .3s ease-out}
.ah-modal-confirm{border-radius:20px;max-width:340px;text-align:center;align-self:center}
.ah-modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;margin:0 0 4px}
.ah-modal-sub{color:var(--text2);font-size:13px;margin:0 0 20px}.ah-modal-exercise{color:var(--gold);font-size:14px;margin:0 0 20px}
.ah-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.ah-goal-badge{display:inline-flex;align-items:center;gap:6px;background:var(--gold-dim);color:var(--gold);font-size:12px;font-weight:500;padding:8px 14px;border-radius:8px;margin-bottom:16px}
.ah-hit-banner{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(200,168,78,0.1);border:1px solid rgba(200,168,78,0.25);border-radius:10px;color:var(--gold);font-size:13px;font-weight:500;animation:scaleIn .3s ease-out}
.ah-tab-row{display:flex;gap:4px;margin-bottom:20px;background:var(--bg3);border-radius:10px;padding:3px}
.ah-tab{flex:1;padding:10px;background:transparent;border:none;border-radius:8px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
.ah-tab-active{background:var(--card);color:var(--text)}
.ah-preset-list{max-height:300px;overflow-y:auto}
.ah-preset-item{display:flex;justify-content:space-between;align-items:center;width:100%;padding:12px 14px;background:var(--card);border:1px solid var(--card-border);border-radius:10px;margin-bottom:6px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;cursor:pointer;transition:all .2s;box-sizing:border-box}
.ah-preset-item:hover{border-color:var(--gold-dim)}.ah-preset-selected{border-color:var(--gold);background:var(--gold-dim)}

.ah-pr-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.ah-pr-empty{opacity:.5}.ah-pr-left{display:flex;flex-direction:column;gap:2px}.ah-pr-name{font-size:15px;font-weight:500}.ah-pr-details{text-align:right}
.ah-pr-manual-tag{font-size:9px;color:var(--gold);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.ah-pr-main{display:flex;align-items:baseline;gap:4px}.ah-pr-weight{font-size:20px;font-weight:700;color:var(--gold)}
.ah-pr-weight small{font-size:12px;font-weight:400;color:var(--text2)}.ah-pr-x{color:var(--text3);font-size:14px;margin:0 2px}
.ah-pr-reps{font-size:20px;font-weight:700}.ah-pr-reps small{font-size:12px;font-weight:400;color:var(--text2)}
.ah-pr-date{font-size:11px;color:var(--text3);margin-top:2px}.ah-pr-none{font-size:12px;color:var(--text3)}

.ah-today-card{background:linear-gradient(135deg,rgba(200,168,78,0.08) 0%,rgba(200,168,78,0.02) 100%);border:1px solid rgba(200,168,78,0.25);border-radius:var(--radius);padding:18px;margin-bottom:20px}
.ah-today-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.ah-today-label{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--gold)}
.ah-today-count{font-size:12px;color:var(--text2)}.ah-today-empty{color:var(--text3);font-size:13px;margin:0}
.ah-today-list{display:flex;flex-direction:column;gap:6px}
.ah-today-exercise{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(0,0,0,0.3);border-radius:10px}
.ah-today-ex-name{font-size:14px;font-weight:500}.ah-today-ex-goal{font-size:12px;color:var(--gold)}
.ah-split-day{background:var(--card);border:1px solid var(--card-border);border-radius:12px;margin-bottom:8px;overflow:hidden}
.ah-split-today{border-color:rgba(200,168,78,0.3)}
.ah-split-day-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer}
.ah-split-day-left{display:flex;flex-direction:column;gap:1px}
.ah-split-day-name{font-size:15px;font-weight:500;display:flex;align-items:center;gap:8px}
.ah-split-day-label{font-size:12px;color:var(--gold);font-weight:500}
.ah-split-day-right{display:flex;align-items:center;gap:6px}
.ah-split-day-muscles{padding:0 16px 8px;display:flex;flex-wrap:wrap;gap:4px}
.ah-muscle-tag-sm{font-size:9px;padding:3px 8px;background:var(--gold-dim);color:var(--gold);border-radius:5px;font-weight:500;letter-spacing:.3px}
.ah-today-split-name{display:block;font-family:'Playfair Display',serif;font-size:13px;color:var(--gold-light);font-weight:400;margin-top:2px}
.ah-date-input{color-scheme:dark}
.ah-preset-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:-8px}
.ah-quick-tag{font-size:11px;padding:6px 12px;background:var(--bg3);border:1px solid var(--card-border);border-radius:8px;color:var(--text2);font-family:'Outfit',sans-serif;cursor:pointer;transition:all .2s}
.ah-quick-tag:hover{border-color:var(--gold-dim)}
.ah-quick-active{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}
.ah-muscle-select{display:flex;flex-direction:column;gap:4px}
.ah-today-dot{width:6px;height:6px;background:var(--gold);border-radius:50%;display:inline-block}
.ah-split-day-count{font-size:12px;color:var(--text2)}
.ah-split-day-exercises{padding:0 16px 12px;display:flex;flex-wrap:wrap;gap:6px}
.ah-split-tag{font-size:11px;padding:4px 10px;background:var(--bg3);border-radius:6px;color:var(--text2)}
.ah-split-expanded{padding:0 0 14px}
.ah-split-ex-list{display:flex;flex-direction:column;gap:4px;padding:8px 16px}
.ah-split-ex-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border-radius:8px}
.ah-split-ex-num{font-size:12px;font-weight:700;color:var(--gold);width:18px;text-align:center;flex-shrink:0}
.ah-split-ex-info{flex:1;display:flex;flex-direction:column;gap:1px}
.ah-split-ex-name{font-size:13px;font-weight:500}
.ah-split-ex-detail{font-size:11px;color:var(--text3)}
.ah-split-no-ex{color:var(--text3);font-size:13px;padding:12px 16px;margin:0}
.ah-split-actions{padding:8px 16px 0}
.ah-split-edit{padding:0 16px 14px;display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--card-border);padding-top:12px}
.ah-split-edit-label{font-size:11px;color:var(--text2);margin:0 0 6px;font-weight:500;text-transform:uppercase;letter-spacing:1px}
.ah-split-toggle{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg3);border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;transition:all .2s}
.ah-split-toggle-cat{font-size:10px;color:var(--text3);margin-left:auto;margin-right:8px}
.ah-btn-add-to-day{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:transparent;border:1px dashed var(--gold-dim);border-radius:8px;color:var(--gold);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;margin-top:4px}
.ah-btn-add-to-day:hover{border-color:var(--gold);background:var(--gold-dim)}
.ah-split-on{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}

/* Reorder */
.ah-reorder-active{color:var(--gold)!important;background:var(--gold-dim)!important}
.ah-reorder-list{padding:0 16px 14px;display:flex;flex-direction:column;gap:4px}
.ah-reorder-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--card-border);border-radius:8px}
.ah-reorder-num{font-size:12px;font-weight:700;color:var(--gold);width:18px;text-align:center}
.ah-reorder-name{flex:1;font-size:13px;font-weight:500}
.ah-reorder-btns{display:flex;flex-direction:column;gap:2px}
.ah-reorder-btn{background:none;border:1px solid var(--card-border);border-radius:6px;color:var(--text2);cursor:pointer;padding:2px 6px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ah-reorder-btn:hover:not(:disabled){border-color:var(--gold);color:var(--gold)}
.ah-reorder-btn:disabled{opacity:.2;cursor:default}

.ah-progress-select{margin-bottom:16px}.ah-chart-area{animation:fadeIn .3s ease-out}
.ah-chart-canvas{width:100%;height:220px;display:block;margin-bottom:12px}
.ah-chart-legend{display:flex;gap:16px;justify-content:center;margin-bottom:16px}
.ah-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)}
.ah-legend-dot{width:8px;height:8px;border-radius:50%}.ah-legend-gold{background:var(--gold)}.ah-legend-grey{background:#666}
.ah-chart-summary{display:flex;gap:10px}
.ah-chart-stat{flex:1;background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);padding:14px;text-align:center}
.ah-chart-stat-val{display:block;font-size:20px;font-weight:700}
.ah-chart-stat-label{display:block;font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:1.2px;margin-top:4px}

.ah-photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ah-photo-card{background:var(--card);border:1px solid var(--card-border);border-radius:12px;overflow:hidden}
.ah-photo-img-wrap{aspect-ratio:3/4;overflow:hidden}.ah-photo-img{width:100%;height:100%;object-fit:cover;display:block}
.ah-photo-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 12px}
.ah-photo-date{font-size:11px;color:var(--text2)}

.ah-tabbar{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;
  display:flex;justify-content:space-around;align-items:center;padding:8px 0 calc(env(safe-area-inset-bottom, 20px) + 4px);
  background:rgba(17,17,17,0.72);
  backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);
  border-top:1px solid rgba(255,255,255,0.08);z-index:50;
}
.ah-tabbar-item{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:var(--text3);font-family:'Outfit',sans-serif;font-size:10px;font-weight:500;cursor:pointer;padding:4px 6px;flex:1;transition:color .2s;letter-spacing:.3px}
.ah-tabbar-active{color:var(--gold)}
.ah-tabbar-icon{display:flex;align-items:center;justify-content:center;height:24px}
.ah-tabbar-label{margin-top:1px}

.ah-app ::-webkit-scrollbar{width:4px}.ah-app ::-webkit-scrollbar-track{background:transparent}.ah-app ::-webkit-scrollbar-thumb{background:var(--card-border);border-radius:4px}

/* ─── PROFILE ─── */
.ah-profile-btn{width:40px;height:40px;border-radius:50%;background:var(--card);border:1px solid var(--card-border);color:var(--text2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.ah-profile-btn:hover{border-color:var(--gold);color:var(--gold)}
.ah-profile-header{text-align:center;padding:20px 0 24px}
.ah-profile-avatar{width:72px;height:72px;border-radius:50%;background:var(--card);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--gold)}
.ah-profile-name-row{display:flex;align-items:center;justify-content:center;gap:8px}
.ah-profile-name{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--gold);margin:0}
.ah-profile-edit-name{display:flex;gap:8px;align-items:center;justify-content:center;max-width:280px;margin:0 auto}
.ah-profile-edit-name .ah-input{flex:1}
.ah-profile-phone{font-size:13px;color:var(--text2);margin:4px 0 0}
.ah-profile-since{font-size:11px;color:var(--text3);margin:4px 0 0;text-transform:uppercase;letter-spacing:1px}
.ah-profile-stats{display:flex;gap:10px;margin-top:8px}
.ah-btn-logout{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;background:transparent;border:1px solid var(--danger);border-radius:10px;color:var(--danger);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;margin-top:32px;transition:all .2s}
.ah-btn-logout:hover{background:rgba(232,69,69,0.1)}

/* ─── THEME PICKER ─── */
/* ── legacy theme (kept for safety) ── */
.ah-theme-list{display:flex;flex-direction:column;gap:8px}

/* ── theme cards ── */
.ah-dash-header-btns{display:flex;gap:8px;align-items:center}
.ah-theme-cards{display:flex;flex-direction:column;gap:10px}
.ah-theme-card{display:flex;align-items:center;gap:14px;padding:14px;background:var(--card);border:1.5px solid var(--card-border);border-radius:14px;cursor:pointer;transition:all .2s;font-family:'Outfit',sans-serif;color:var(--text);width:100%;text-align:left}
.ah-theme-card:hover{border-color:var(--gold)}
.ah-theme-card-active{border-color:var(--gold);background:var(--gold-dim)}
.ah-theme-card-preview{width:64px;height:48px;border-radius:8px;border:1px solid;flex-shrink:0;padding:5px;display:flex;flex-direction:column;gap:4px;overflow:hidden}
.ah-tcp-bar{border-radius:4px;border:1px solid;padding:3px 4px;display:flex;align-items:center;gap:3px}
.ah-tcp-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.ah-tcp-line{flex:1;height:3px;border-radius:2px}
.ah-tcp-card{border-radius:4px;border:1px solid;padding:3px 4px;display:flex;flex-direction:column;gap:2px}
.ah-tcp-line-short{width:60%}
.ah-tcp-accent-bar{height:4px;border-radius:2px;width:80%}
.ah-theme-card-info{flex:1;display:flex;flex-direction:column;gap:2px}
.ah-theme-card-name{font-size:15px;font-weight:600}
.ah-theme-card-desc{font-size:12px;color:var(--text2)}
.ah-theme-card-check{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#000;flex-shrink:0}

/* ── theme bottom sheet ── */
.ah-sheet-overlay{align-items:flex-end!important;background:rgba(0,0,0,0.6)!important}
.ah-theme-sheet{background:var(--bg2);border-radius:24px 24px 0 0;padding:12px 20px 40px;width:100%;max-width:480px}
.ah-sheet-handle{width:40px;height:4px;border-radius:2px;background:var(--text3);margin:0 auto 16px}
.ah-sheet-title{font-size:18px;font-weight:700;margin:0 0 16px;text-align:center}

.ah-theme-card-name{flex:1;font-weight:500}

/* ─── ONBOARDING ─── */
.ah-onboard-modal{border-radius:20px;max-width:360px;text-align:center;align-self:center}
.ah-onboard-icon{width:56px;height:56px;border-radius:14px;background:var(--gold-dim);color:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.ah-onboard-text{font-size:14px;color:var(--text2);margin:0 0 12px;line-height:1.5}
.ah-onboard-text strong{color:var(--gold);font-weight:600}

/* ─── INCREASE WEIGHT INPUT ─── */
.ah-increase-weight-row{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.ah-increase-input{width:100px!important;text-align:center;font-size:18px!important;font-weight:600!important;padding:10px 12px!important}
.ah-increase-kg{font-size:14px;color:var(--text2);font-weight:500}

/* ─── HOME TAB — DAY OVERRIDE BANNER ─── */
.ah-override-banner{display:flex;align-items:center;gap:8px;padding:10px 14px;margin-bottom:14px;background:rgba(200,168,78,0.1);border:1px solid rgba(200,168,78,0.3);border-radius:12px;font-size:13px;color:var(--gold);animation:fadeIn .3s ease-out}
.ah-override-banner span{flex:1;line-height:1.4}
.ah-override-clear{margin-left:auto;background:none;border:1px solid rgba(200,168,78,0.4);border-radius:8px;color:var(--gold);font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;padding:4px 10px;cursor:pointer;transition:all .2s;flex-shrink:0}
.ah-override-clear:hover{background:rgba(200,168,78,0.15)}

/* ─── HOME TAB — WORKOUT HEADING ─── */
.ah-workout-heading{margin-bottom:16px}
.ah-workout-day-label{font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;font-weight:500}
.ah-workout-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--text);margin:0}

/* ─── HOME TAB — REST CARD ─── */
.ah-rest-card{display:flex;flex-direction:column;align-items:center;text-align:center;padding:36px 24px;background:var(--card);border:1px solid var(--card-border);border-radius:16px;margin-bottom:20px;gap:8px}
.ah-rest-emoji{font-size:40px;line-height:1;margin-bottom:4px}
.ah-rest-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin:0;color:var(--text)}
.ah-rest-sub{font-size:13px;color:var(--text3);margin:0 0 8px}
.ah-pick-split-btn{margin-top:4px;display:flex;align-items:center;gap:8px}

/* ─── HOME TAB — EXERCISE CARDS ─── */
.ah-workout-ex-list{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.ah-workout-ex-card{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:16px;cursor:pointer;transition:all .2s;animation:fadeIn .3s ease-out}
.ah-workout-ex-card:hover{border-color:var(--gold-dim);background:var(--bg3)}
.ah-workout-ex-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.ah-workout-ex-name{font-size:16px;font-weight:600;color:var(--text)}
.ah-workout-ex-cat{font-size:10px;color:var(--gold);font-weight:500;text-transform:uppercase;letter-spacing:1px;background:var(--gold-dim);padding:3px 8px;border-radius:6px;white-space:nowrap}
.ah-workout-ex-meta{display:flex;flex-direction:column;gap:4px}
.ah-workout-ex-goal{font-size:13px;color:var(--gold);font-weight:500}
.ah-workout-ex-nogoal{font-size:12px;color:var(--text3)}
.ah-workout-ex-done{font-size:12px;color:#4caf50;font-weight:500}
.ah-workout-ex-last{font-size:12px;color:var(--text2)}
.ah-workout-ex-1rm{margin-top:8px;font-size:11px;color:var(--text3);background:var(--bg3);border-radius:6px;padding:4px 10px;display:inline-block}

/* ─── HOME TAB — SUBTLE PICK SPLIT BUTTON ─── */
.ah-pick-split-subtle{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px;background:transparent;border:1px dashed var(--card-border);border-radius:10px;color:var(--text3);font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer;transition:all .2s;margin-bottom:4px}
.ah-pick-split-subtle:hover{border-color:var(--gold-dim);color:var(--gold)}

/* ─── DAY PICKER SHEET ─── */
.ah-day-pick-btn{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:var(--card);border:1.5px solid var(--card-border);border-radius:12px;color:var(--text);font-family:'Outfit',sans-serif;cursor:pointer;text-align:left;transition:all .2s;box-sizing:border-box}
.ah-day-pick-btn:hover{border-color:var(--gold-dim);background:var(--bg3)}
.ah-day-pick-today{border-color:rgba(200,168,78,0.4);background:var(--gold-dim)}
.ah-day-pick-left{flex:1;display:flex;flex-direction:column;gap:2px}
.ah-day-pick-name{font-size:15px;font-weight:600;color:var(--text)}
.ah-day-pick-sub{font-size:11px;color:var(--text3)}
.ah-day-pick-muscles{display:flex;flex-wrap:wrap;gap:4px;flex-shrink:0}

/* ─── VARIANT CHIPS (home screen) ─── */
.ah-variant-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.ah-variant-chip{padding:6px 14px;background:var(--card);border:1.5px solid var(--card-border);border-radius:20px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.ah-variant-chip:hover{border-color:var(--gold-dim)}
.ah-variant-chip-active{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}

/* ─── VARIANT TABS (split tab) ─── */
.ah-variant-tabs{display:flex;gap:4px;padding:8px 16px 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.ah-variant-tab{flex-shrink:0;padding:7px 14px;background:transparent;border:1.5px solid var(--card-border);border-radius:8px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.ah-variant-tab:hover{border-color:var(--gold-dim);color:var(--text)}
.ah-variant-tab-active{border-color:var(--gold);background:var(--gold-dim);color:var(--gold)}
.ah-variant-tab-add{border-style:dashed;font-size:16px;padding:4px 12px;color:var(--text3)}
.ah-variant-count-badge{font-size:9px;font-weight:600;color:var(--gold);background:var(--gold-dim);padding:2px 6px;border-radius:5px;letter-spacing:.3px}
.ah-split-variant-controls{display:flex;gap:4px;padding:8px 16px 4px;align-items:center}

/* ─── HELP MODAL ─── */
.ah-help-modal{text-align:center;border-radius:20px 20px 0 0;padding-top:24px}
.ah-help-progress{display:flex;gap:4px;justify-content:center;margin-bottom:20px}
.ah-help-dot{width:6px;height:6px;border-radius:50%;background:var(--card-border);transition:all .3s}
.ah-help-dot-active{background:var(--gold);width:18px;border-radius:4px}
.ah-help-dot-done{background:var(--gold-dim)}
.ah-help-icon{font-size:44px;margin-bottom:12px;line-height:1}
.ah-help-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin:0 0 10px;color:var(--text)}
.ah-help-body{font-size:14px;color:var(--text2);line-height:1.6;margin:0 0 24px}
.ah-help-nav{display:flex;align-items:center;gap:10px;justify-content:center}
.ah-help-count{font-size:12px;color:var(--text3);min-width:50px;text-align:center}

/* ─── FRIENDS TAB ─── */
.ah-friend-card{display:flex;align-items:center;justify-content:space-between;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:12px 16px;margin-bottom:8px}
.ah-friend-card-accepted{border-color:rgba(200,168,78,0.2)}
.ah-friend-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.ah-friend-name{font-size:15px;font-weight:500;color:var(--text)}
.ah-friend-phone{font-size:11px;color:var(--text3)}
.ah-friends-status{font-size:12px;margin:8px 0 0;line-height:1.4}
.ah-status-ok{color:var(--success)}
.ah-status-warn{color:var(--gold)}
.ah-status-err{color:var(--danger)}

/* ─── COMPARE MODAL ─── */
.ah-compare-header{display:flex;align-items:center;margin-bottom:8px;padding:0 4px}
.ah-compare-me{flex:1;font-size:12px;font-weight:600;color:var(--gold)}
.ah-compare-ex{flex:1;text-align:center}
.ah-compare-them{flex:1;text-align:right;font-size:12px;font-weight:600;color:var(--text2)}
.ah-compare-row{display:flex;align-items:center;gap:6px;padding:10px 4px;border-bottom:1px solid var(--card-border)}
.ah-compare-row:last-child{border-bottom:none}
.ah-compare-side{display:flex;flex-direction:column;align-items:flex-end;flex:1;gap:2px}
.ah-compare-left{align-items:flex-start}
.ah-compare-win .ah-compare-kg{color:var(--gold)}
.ah-compare-kg{font-size:17px;font-weight:700;color:var(--text)}
.ah-compare-kg small{font-size:11px;font-weight:400;color:var(--text2)}
.ah-compare-orm{font-size:10px;color:var(--text3)}
.ah-compare-trophy{font-size:14px;line-height:1}
.ah-compare-middle{flex:0 0 auto;text-align:center;max-width:120px}
.ah-compare-exname{font-size:11px;font-weight:500;color:var(--text2);text-align:center;display:block;line-height:1.3}

/* ─── GRIP / STRAPS TOGGLE ─── */
.ah-grip-toggle{display:flex;gap:6px;margin-bottom:16px;background:var(--bg3);border-radius:10px;padding:3px}
.ah-grip-btn{flex:1;padding:9px 6px;background:transparent;border:none;border-radius:8px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.ah-grip-active{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,0.3)}

/* Grip badge on history rows */
.ah-grip-badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;flex-shrink:0}
.ah-grip-badge-on{background:rgba(200,168,78,0.15);color:var(--gold)}
.ah-grip-badge-off{background:var(--bg3);color:var(--text3)}

/* Today's grip summary chips */
.ah-today-grip-summary{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;margin-bottom:4px}
.ah-today-grip-chip{font-size:12px;font-weight:500;padding:5px 12px;border-radius:8px}
.ah-grip-nostraps{background:var(--bg3);color:var(--text2);border:1px solid var(--card-border)}
.ah-grip-straps{background:rgba(200,168,78,0.1);color:var(--gold);border:1px solid rgba(200,168,78,0.25)}

/* ─── SPLIT TOP ROW ─── */
.ah-split-top-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px}
.ah-split-action-btn{width:38px;height:38px;border-radius:10px;border:1px solid var(--card-border)!important;color:var(--text2)!important;display:flex;align-items:center;justify-content:center}
.ah-split-action-btn:hover{border-color:var(--gold)!important;color:var(--gold)!important}

/* ─── SHARE SPLIT MODAL ─── */
.ah-share-code-display{display:flex;align-items:center;justify-content:center;background:var(--bg3);border:1px solid var(--card-border);border-radius:14px;padding:20px;margin:16px 0}
.ah-share-code{font-family:'Outfit',sans-serif;font-size:38px;font-weight:800;letter-spacing:0.25em;color:var(--gold);user-select:all}
.ah-share-hint{font-size:12px;color:var(--text3);text-align:center;line-height:1.5;margin:0 0 4px}

/* ─── IMPORT SPLIT MODAL ─── */
.ah-code-input{text-transform:uppercase;letter-spacing:0.2em;font-size:22px!important;font-weight:700!important;text-align:center!important}
.ah-import-preview{display:flex;flex-direction:column;gap:8px;margin:4px 0 16px;max-height:340px;overflow-y:auto}
.ah-import-author{font-size:13px;color:var(--text2);margin:0 0 4px;text-align:center}
.ah-import-author strong{color:var(--gold)}
.ah-import-day{background:var(--bg3);border:1px solid var(--card-border);border-radius:10px;padding:12px 14px}
.ah-import-day-header{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.ah-import-day-name{font-size:14px;font-weight:600;color:var(--text)}
.ah-import-day-label{font-size:11px;color:var(--gold);font-weight:500;background:var(--gold-dim);padding:2px 8px;border-radius:5px}
.ah-import-day-exs{font-size:12px;color:var(--text3);margin:0;line-height:1.5}
.ah-import-warn{font-size:12px;color:var(--text2);background:rgba(200,168,78,0.08);border:1px solid rgba(200,168,78,0.2);border-radius:8px;padding:10px 12px;margin:4px 0 0;line-height:1.4}

/* ─── SPLIT MAKER MODAL ─── */
.ah-maker-modal{max-height:90vh;overflow-y:auto}
.ah-maker-grid{display:flex;flex-direction:column;gap:10px;margin:4px 0 16px}
.ah-maker-card{background:var(--bg3);border:1.5px solid var(--card-border);border-radius:14px;padding:16px;text-align:left;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:4px}
.ah-maker-card:hover{border-color:var(--gold);background:var(--gold-dim)}
.ah-maker-days{font-size:32px;font-weight:800;color:var(--gold);line-height:1}
.ah-maker-card-name{font-size:16px;font-weight:700;color:var(--text)}
.ah-maker-badge{font-size:11px;font-weight:600;color:var(--gold);background:var(--gold-dim);border-radius:6px;padding:2px 8px;width:fit-content}
.ah-maker-card-desc{font-size:12px;color:var(--text3);line-height:1.4;margin-top:2px}
.ah-maker-days-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:4px 0 16px}
.ah-maker-day-btn{padding:10px 0;border-radius:10px;border:1.5px solid var(--card-border);background:var(--bg3);color:var(--text2);font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.ah-maker-day-btn:hover:not(:disabled){border-color:var(--gold);color:var(--gold)}
.ah-maker-day-sel{background:var(--gold)!important;border-color:var(--gold)!important;color:#0A0A0A!important}
.ah-maker-day-full{opacity:.3;cursor:not-allowed}
.ah-maker-preview-list{background:var(--bg3);border-radius:12px;padding:12px;margin:0 0 14px;display:flex;flex-direction:column;gap:8px}
.ah-maker-preview-row{display:flex;align-items:center;gap:8px}
.ah-maker-preview-day{font-size:12px;font-weight:700;color:var(--text2);width:32px;flex-shrink:0}
.ah-maker-preview-label{font-size:13px;font-weight:600;color:var(--text)}
.ah-maker-preview-muscles{font-size:11px;color:var(--text3);flex:1;text-align:right}
.ah-maker-final-list{display:flex;flex-direction:column;gap:8px;margin:4px 0 14px;max-height:380px;overflow-y:auto}
.ah-maker-final-day{background:var(--bg3);border:1px solid var(--card-border);border-radius:12px;padding:12px 14px}
.ah-maker-rest-day{opacity:.45}
.ah-maker-final-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.ah-maker-final-day-name{font-size:14px;font-weight:600;color:var(--text)}
.ah-maker-final-label{font-size:12px;font-weight:600;color:var(--gold);background:var(--gold-dim);padding:2px 8px;border-radius:6px}
.ah-maker-final-muscles{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.ah-maker-final-exs{font-size:11px;color:var(--text3);line-height:1.4}
.ah-maker-warn{font-size:12px;color:var(--text2);background:rgba(232,69,69,0.08);border:1px solid rgba(232,69,69,0.2);border-radius:8px;padding:10px 12px;margin:4px 0 8px;text-align:center}

/* ─── LEADER TABS ─── */
.ah-leader-tabs{display:flex;background:var(--bg3);border-radius:10px;padding:3px;gap:2px;margin-bottom:16px}
.ah-leader-tab{flex:1;padding:9px 4px;background:transparent;border:none;border-radius:8px;color:var(--text2);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s}
.ah-leader-tab-active{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,0.3)}

/* ─── GLOBAL LEADERBOARD ─── */
.ah-global-optin{display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px 16px;text-align:center}
.ah-global-optin-icon{font-size:52px}
.ah-global-optin-title{font-size:20px;font-weight:700;color:var(--text);margin:0}
.ah-global-optin-desc{font-size:14px;color:var(--text2);line-height:1.5;max-width:280px;margin:0}
.ah-global-optin-note{font-size:11px;color:var(--text3);margin:0}
.ah-global-banner{display:flex;align-items:center;justify-content:space-between;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#4ADE80;font-weight:500}
.ah-global-private-btn{background:transparent;border:1px solid rgba(74,222,128,0.3);border-radius:8px;color:#4ADE80;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;padding:5px 10px;cursor:pointer}
.ah-global-ex-select{margin-bottom:14px;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.ah-global-list{display:flex;flex-direction:column;gap:0;background:var(--card);border:1px solid var(--card-border);border-radius:14px;overflow:hidden}
.ah-global-row{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--card-border);transition:background .15s}
.ah-global-row:last-child{border-bottom:none}
.ah-global-row-me{background:rgba(200,168,78,0.07);border-left:3px solid var(--gold)}
.ah-global-rank{font-size:18px;min-width:32px;text-align:center;font-weight:700;color:var(--text3)}
.ah-global-info{flex:1;display:flex;flex-direction:column;gap:2px}
.ah-global-name{font-size:14px;font-weight:600;color:var(--text)}
.ah-global-orm{font-size:11px;color:var(--text3)}
.ah-global-weight{font-size:20px;font-weight:700;color:var(--text)}
.ah-global-weight small{font-size:12px;font-weight:400;color:var(--text3)}
.ah-global-rank-note{text-align:center;font-size:12px;color:var(--text3);margin:10px 0 4px}

/* ─── PROFILE TOGGLE ─── */
.ah-profile-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:16px;margin-bottom:12px}
.ah-profile-toggle-label{font-size:14px;font-weight:600;color:var(--text);margin:0 0 3px}
.ah-profile-toggle-desc{font-size:12px;color:var(--text3);margin:0;line-height:1.4}
.ah-toggle{width:48px;height:28px;border-radius:14px;border:none;background:var(--bg3);position:relative;cursor:pointer;transition:background .25s;flex-shrink:0;box-shadow:inset 0 0 0 1px var(--card-border)}
.ah-toggle-on{background:var(--gold);box-shadow:none}
.ah-toggle-thumb{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .25s;display:block;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.ah-toggle-on .ah-toggle-thumb{transform:translateX(20px)}
` + nutritionStyles;
