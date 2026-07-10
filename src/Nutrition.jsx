import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const MEAL_EMOJI = { Breakfast: "☀️", Lunch: "🌤️", Dinner: "🌙", Snacks: "🍎" };
const WATER_QUICK = [150, 200, 250, 330, 500, 750];
const STORAGE_KEY = "alari_health_data";

// ─── Helpers ───────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function genId() { return Math.random().toString(36).slice(2, 10); }
function r0(n) { return Math.round(n); }
function r1(n) { return Math.round(n * 10) / 10; }

function offsetDate(base, delta) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const today = todayStr();
  if (iso === today) return "Today";
  if (iso === offsetDate(today, -1)) return "Yesterday";
  if (iso === offsetDate(today, 1)) return "Tomorrow";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function parseServingGrams(str) {
  if (!str) return null;
  const m = String(str).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function foodMacros(food) {
  const factor = ((food.servingSize || 100) * (food.quantity || 1)) / 100;
  const p = food.per100 || {};
  return {
    calories: r0((p.calories || 0) * factor),
    protein:  r1((p.protein  || 0) * factor),
    carbs:    r1((p.carbs    || 0) * factor),
    fat:      r1((p.fat      || 0) * factor),
  };
}

function dayTotals(dayLog) {
  const foods = MEAL_TYPES.flatMap(m => dayLog?.meals?.[m] || []);
  return foods.reduce((a, f) => {
    const m = foodMacros(f);
    return { calories: a.calories + m.calories, protein: r1(a.protein + m.protein), carbs: r1(a.carbs + m.carbs), fat: r1(a.fat + m.fat) };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function offToFood(p) {
  const n = p.nutriments || {};
  const servingSize = parseFloat(p.serving_quantity) || parseServingGrams(p.serving_size) || 100;
  return {
    name: (p.product_name || "Unknown").trim(),
    brand: (p.brands || "").split(",")[0].trim(),
    barcode: p.code || "",
    imageThumb: p.image_thumb_url || "",
    per100: {
      calories: parseFloat((n["energy-kcal_100g"] || 0).toFixed(1)),
      protein:  parseFloat((n["proteins_100g"]     || 0).toFixed(2)),
      carbs:    parseFloat((n["carbohydrates_100g"] || 0).toFixed(2)),
      fat:      parseFloat((n["fat_100g"]           || 0).toFixed(2)),
      fiber:    parseFloat((n["fiber_100g"]         || 0).toFixed(2)),
    },
    servingSize,
    quantity: 1,
  };
}

// ─── API ───────────────────────────────────────────────────────────────────
async function searchOFF(query) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=25&fields=code,product_name,brands,nutriments,serving_size,serving_quantity,image_thumb_url&sort_by=unique_scans_n`;
    const r = await fetch(url);
    const d = await r.json();
    return (d.products || []).filter(p => p.product_name && (p.nutriments?.["energy-kcal_100g"] > 0));
  } catch { return []; }
}

async function barcodeOFF(code) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const d = await r.json();
    if (d.status !== 1) return null;
    return d.product;
  } catch { return null; }
}

// ─── CalorieSummary ────────────────────────────────────────────────────────
function CalorieSummary({ totals, goals }) {
  const calPct = Math.min(1, totals.calories / (goals.calories || 2000));
  const R = 54; const C = 2 * Math.PI * R;
  const remaining = Math.max(0, (goals.calories || 2000) - totals.calories);
  const over = totals.calories > (goals.calories || 2000);

  const bars = [
    { label: "Protein", value: totals.protein, goal: goals.protein || 150, color: "#4ADE80" },
    { label: "Carbs",   value: totals.carbs,   goal: goals.carbs   || 200, color: "#60A5FA" },
    { label: "Fat",     value: totals.fat,      goal: goals.fat     || 65,  color: "#FB923C" },
  ];

  return (
    <div className="nc-summary-card">
      <div className="nc-summary-ring-wrap">
        <svg viewBox="0 0 128 128" className="nc-ring-svg">
          <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.07)" />
          <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10"
            stroke={over ? "var(--danger)" : "var(--gold)"}
            strokeDasharray={`${calPct * C} ${C}`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
            style={{ transition: "stroke-dasharray .5s ease" }}
          />
        </svg>
        <div className="nc-ring-center">
          <span className="nc-ring-cal">{totals.calories.toLocaleString()}</span>
          <span className="nc-ring-label">kcal eaten</span>
        </div>
      </div>

      <div className="nc-summary-stats">
        <div className="nc-stat">
          <span className="nc-stat-val">{(goals.calories || 2000).toLocaleString()}</span>
          <span className="nc-stat-key">Goal</span>
        </div>
        <div className="nc-stat-divider"/>
        <div className="nc-stat">
          <span className="nc-stat-val" style={{ color: over ? "var(--nc-danger)" : "var(--gold)" }}>
            {over ? `+${(totals.calories - (goals.calories||2000)).toLocaleString()}` : remaining.toLocaleString()}
          </span>
          <span className="nc-stat-key">{over ? "Over" : "Left"}</span>
        </div>
      </div>

      <div className="nc-macro-bars">
        {bars.map(b => {
          const pct = Math.min(1, b.value / b.goal);
          return (
            <div key={b.label} className="nc-macro-row">
              <span className="nc-macro-label">{b.label}</span>
              <div className="nc-macro-track">
                <div className="nc-macro-fill" style={{ width: `${pct * 100}%`, background: b.color }} />
              </div>
              <span className="nc-macro-nums">{b.value}g <span className="nc-macro-goal">/ {b.goal}g</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WaterTracker ──────────────────────────────────────────────────────────
function WaterTracker({ water, goal, onAdd, onReset }) {
  const goalMl = goal || 2000;
  const pct = Math.min(1, water / goalMl);
  const glasses = Math.round(water / 250);

  return (
    <div className="nc-water-card">
      <div className="nc-water-header">
        <span className="nc-water-icon">💧</span>
        <span className="nc-water-title">Water</span>
        <span className="nc-water-amount">{water >= 1000 ? `${r1(water/1000)}L` : `${water}ml`} <span className="nc-water-goal">/ {goalMl >= 1000 ? `${goalMl/1000}L` : `${goalMl}ml`}</span></span>
        {water > 0 && <button className="nc-water-reset" onClick={onReset}>↺</button>}
      </div>
      <div className="nc-water-track"><div className="nc-water-fill" style={{ width: `${pct*100}%` }}/></div>
      <div className="nc-water-glasses">
        {Array.from({ length: Math.max(8, glasses + 2) }, (_, i) => (
          <span key={i} className={`nc-glass ${i < glasses ? "nc-glass-full" : ""}`}>🥛</span>
        ))}
      </div>
      <div className="nc-water-btns">
        {WATER_QUICK.map(ml => (
          <button key={ml} className="nc-water-btn" onClick={() => onAdd(ml)}>+{ml}ml</button>
        ))}
      </div>
    </div>
  );
}

// ─── MealSection ───────────────────────────────────────────────────────────
function MealSection({ mealType, foods, onAdd, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const mealTotals = (foods || []).reduce((a, f) => {
    const m = foodMacros(f); return { calories: a.calories + m.calories, protein: r1(a.protein + m.protein), carbs: r1(a.carbs + m.carbs), fat: r1(a.fat + m.fat) };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="nc-meal-card">
      <div className="nc-meal-header" onClick={() => setCollapsed(c => !c)}>
        <span className="nc-meal-icon">{MEAL_EMOJI[mealType]}</span>
        <span className="nc-meal-name">{mealType}</span>
        <span className="nc-meal-total">{mealTotals.calories} kcal</span>
        <button className="nc-meal-add" onClick={e => { e.stopPropagation(); onAdd(); }}>+</button>
        <span className="nc-meal-chevron" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
      </div>

      {!collapsed && (
        <>
          {(foods || []).length === 0 && (
            <div className="nc-meal-empty">Tap + to add food</div>
          )}
          {(foods || []).map(food => {
            const m = foodMacros(food);
            return (
              <div key={food.id} className="nc-food-row">
                <div className="nc-food-info">
                  <span className="nc-food-name">{food.name}</span>
                  {food.brand && <span className="nc-food-brand">{food.brand}</span>}
                  <span className="nc-food-serving">{food.quantity > 1 ? `${food.quantity} × ` : ""}{food.servingSize}g · {m.calories} kcal</span>
                  <span className="nc-food-macros">P {m.protein}g · C {m.carbs}g · F {m.fat}g</span>
                </div>
                <button className="nc-food-del" onClick={() => onDelete(food.id)}>×</button>
              </div>
            );
          })}
          {(foods || []).length > 0 && (
            <div className="nc-meal-footer">
              <span>Total: <strong>{mealTotals.calories} kcal</strong></span>
              <span className="nc-meal-footer-macros">P {mealTotals.protein}g · C {mealTotals.carbs}g · F {mealTotals.fat}g</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── BarcodeScanner ────────────────────────────────────────────────────────
function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const detectorRef = useRef(null);
  const scannedRef = useRef(null);
  const [phase, setPhase] = useState("starting"); // starting | active | unsupported | denied | found | error

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const scan = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      timerRef.current = setTimeout(scan, 400);
      return;
    }
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0) {
        const val = codes[0].rawValue;
        if (val !== scannedRef.current) {
          scannedRef.current = val;
          stopCamera();
          setPhase("found");
          onScan(val);
        }
        return;
      }
    } catch {}
    timerRef.current = setTimeout(scan, 400);
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (!("BarcodeDetector" in window)) { setPhase("unsupported"); return; }

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        detectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"]
        });
        setPhase("active");
        timerRef.current = setTimeout(scan, 600);
      } catch (e) {
        setPhase(e.name === "NotAllowedError" ? "denied" : "error");
      }
    };
    start();
    return () => stopCamera();
  }, [scan, stopCamera]);

  return (
    <div className="nc-scanner-overlay" onClick={onClose}>
      <div className="nc-scanner-box" onClick={e => e.stopPropagation()}>
        <video ref={videoRef} playsInline muted className="nc-scanner-video" />

        {phase === "active" && (
          <div className="nc-scanner-ui">
            <div className="nc-scanner-frame" />
            <p className="nc-scanner-hint">Point camera at a barcode</p>
          </div>
        )}

        {phase === "found" && (
          <div className="nc-scanner-status">
            <div className="nc-scanner-success">✓ Barcode detected — looking up…</div>
          </div>
        )}

        {phase === "starting" && (
          <div className="nc-scanner-status"><div className="nc-spinner-sm" /></div>
        )}

        {(phase === "unsupported" || phase === "denied" || phase === "error") && (
          <div className="nc-scanner-msg">
            {phase === "unsupported" && <>
              <p>Barcode scanning not supported.</p>
              <p className="nc-scanner-sub">Requires Chrome on Android or Safari iOS 17+</p>
            </>}
            {phase === "denied" && <>
              <p>Camera access denied.</p>
              <p className="nc-scanner-sub">Allow camera in browser settings, then try again.</p>
            </>}
            {phase === "error" && <p>Could not start camera.</p>}
          </div>
        )}

        <button className="nc-scanner-close" onClick={() => { stopCamera(); onClose(); }}>✕ Close</button>
      </div>
    </div>
  );
}

// ─── FoodDetailModal ───────────────────────────────────────────────────────
function FoodDetailModal({ food, mealType, onConfirm, onClose }) {
  const [servingSize, setServingSize] = useState(String(food.servingSize || 100));
  const [quantity, setQuantity] = useState("1");

  const sz = parseFloat(servingSize) || 100;
  const qty = parseFloat(quantity) || 1;
  const preview = foodMacros({ ...food, servingSize: sz, quantity: qty });

  const confirm = () => {
    onConfirm({ ...food, servingSize: sz, quantity: qty, id: genId() });
  };

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={e => e.stopPropagation()}>
        <div className="nc-modal-header">
          <span className="nc-modal-title">Add to {mealType}</span>
          <button className="nc-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="nc-detail-food-name">{food.name}</div>
        {food.brand && <div className="nc-detail-food-brand">{food.brand}</div>}

        <div className="nc-detail-row">
          <div className="nc-detail-field">
            <label className="nc-label">Serving size (g)</label>
            <input className="nc-input" type="number" min="1" value={servingSize}
              onChange={e => setServingSize(e.target.value)} />
          </div>
          <div className="nc-detail-field">
            <label className="nc-label">Servings</label>
            <input className="nc-input" type="number" min="0.1" step="0.5" value={quantity}
              onChange={e => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className="nc-detail-macros">
          <div className="nc-detail-macro nc-detail-cal">
            <span className="nc-detail-macro-val">{preview.calories}</span>
            <span className="nc-detail-macro-key">kcal</span>
          </div>
          <div className="nc-detail-macro">
            <span className="nc-detail-macro-val" style={{ color: "#4ADE80" }}>{preview.protein}g</span>
            <span className="nc-detail-macro-key">Protein</span>
          </div>
          <div className="nc-detail-macro">
            <span className="nc-detail-macro-val" style={{ color: "#60A5FA" }}>{preview.carbs}g</span>
            <span className="nc-detail-macro-key">Carbs</span>
          </div>
          <div className="nc-detail-macro">
            <span className="nc-detail-macro-val" style={{ color: "#FB923C" }}>{preview.fat}g</span>
            <span className="nc-detail-macro-key">Fat</span>
          </div>
        </div>

        <p className="nc-detail-per100">Per 100g: {food.per100?.calories || 0} kcal · P {food.per100?.protein || 0}g · C {food.per100?.carbs || 0}g · F {food.per100?.fat || 0}g</p>

        <button className="nc-btn-primary" onClick={confirm}>
          Add to {mealType}
        </button>
      </div>
    </div>
  );
}

// ─── CustomFoodModal ────────────────────────────────────────────────────────
function CustomFoodModal({ mealType, onConfirm, onClose }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servingSize, setServingSize] = useState("100");

  const valid = name.trim() && parseFloat(calories) >= 0;

  const confirm = () => {
    const sz = parseFloat(servingSize) || 100;
    const cal = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const carb = parseFloat(carbs) || 0;
    const fatV = parseFloat(fat) || 0;
    // Normalise to per-100g
    const factor = 100 / sz;
    onConfirm({
      id: genId(), name: name.trim(), brand: brand.trim(), barcode: "",
      per100: { calories: r1(cal * factor), protein: r1(prot * factor), carbs: r1(carb * factor), fat: r1(fatV * factor), fiber: 0 },
      servingSize: sz, quantity: 1,
    });
  };

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={e => e.stopPropagation()}>
        <div className="nc-modal-header">
          <span className="nc-modal-title">Custom Food</span>
          <button className="nc-modal-close" onClick={onClose}>✕</button>
        </div>
        <label className="nc-label">Food name *</label>
        <input className="nc-input" placeholder="e.g. Grilled Chicken" value={name} onChange={e => setName(e.target.value)} />
        <label className="nc-label" style={{ marginTop: 10 }}>Brand (optional)</label>
        <input className="nc-input" placeholder="e.g. Home cooked" value={brand} onChange={e => setBrand(e.target.value)} />
        <label className="nc-label" style={{ marginTop: 10 }}>Serving size (g) *</label>
        <input className="nc-input" type="number" min="1" value={servingSize} onChange={e => setServingSize(e.target.value)} />
        <div className="nc-custom-macros-grid">
          {[["Calories (kcal)", calories, setCalories], ["Protein (g)", protein, setProtein], ["Carbs (g)", carbs, setCarbs], ["Fat (g)", fat, setFat]].map(([lbl, val, set]) => (
            <div key={lbl}>
              <label className="nc-label">{lbl}</label>
              <input className="nc-input" type="number" min="0" step="0.1" value={val} onChange={e => set(e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>
        <button className="nc-btn-primary" onClick={confirm} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>
          Add to {mealType}
        </button>
      </div>
    </div>
  );
}

// ─── FoodLogModal ──────────────────────────────────────────────────────────
function FoodLogModal({ mealType, recentFoods, customFoods, onLog, onClose }) {
  const [activeTab, setActiveTab] = useState("search"); // search | scan | recent | custom
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // null | "looking" | "found" | "notfound"
  const [scanResult, setScanResult] = useState(null);
  const searchTimer = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const r = await searchOFF(q);
    setResults(r);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (activeTab !== "search") return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 600);
    return () => clearTimeout(searchTimer.current);
  }, [query, activeTab, doSearch]);

  const handleBarcodeScan = useCallback(async (code) => {
    setShowScanner(false);
    setScanStatus("looking");
    setScanResult(null);
    const product = await barcodeOFF(code);
    if (product && product.nutriments?.["energy-kcal_100g"] > 0) {
      const food = offToFood(product);
      setScanResult(food);
      setScanStatus("found");
      setSelected(food);
    } else {
      setScanStatus("notfound");
    }
  }, []);

  const handleSelect = (product) => {
    setSelected(offToFood(product));
  };

  const handleLog = (food) => {
    onLog(food);
    setSelected(null);
    setScanResult(null);
    setScanStatus(null);
  };

  const tabs = [
    { id: "search", label: "Search" },
    { id: "scan",   label: "Scan" },
    { id: "recent", label: "Recent" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <>
      <div className="nc-modal-overlay" onClick={onClose}>
        <div className="nc-modal nc-modal-tall" onClick={e => e.stopPropagation()}>
          <div className="nc-modal-header">
            <span className="nc-modal-title">Add Food · {mealType}</span>
            <button className="nc-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="nc-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`nc-tab ${activeTab === t.id ? "nc-tab-active" : ""}`}
                onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* ── Search ── */}
          {activeTab === "search" && (
            <div className="nc-tab-content">
              <input className="nc-input nc-search-input" placeholder="Search foods…" value={query}
                onChange={e => setQuery(e.target.value)} autoFocus />
              {searching && <div className="nc-searching">Searching…</div>}
              {!searching && results.length === 0 && query.length > 1 && (
                <div className="nc-no-results">No results — try another name or use Custom</div>
              )}
              <div className="nc-results-list">
                {results.map((p, i) => {
                  const n = p.nutriments || {};
                  const cal = Math.round((n["energy-kcal_100g"] || 0) * ((parseFloat(p.serving_quantity) || 100) / 100));
                  return (
                    <div key={p.code || i} className="nc-result-row" onClick={() => handleSelect(p)}>
                      {p.image_thumb_url ? <img className="nc-result-img" src={p.image_thumb_url} alt="" /> : <div className="nc-result-img-ph">🍽️</div>}
                      <div className="nc-result-info">
                        <span className="nc-result-name">{p.product_name}</span>
                        {p.brands && <span className="nc-result-brand">{p.brands.split(",")[0]}</span>}
                        <span className="nc-result-cal">~{cal} kcal per serving · {Math.round(n["energy-kcal_100g"] || 0)} kcal/100g</span>
                      </div>
                      <span className="nc-result-arrow">›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Scan ── */}
          {activeTab === "scan" && (
            <div className="nc-tab-content nc-scan-tab">
              {!scanStatus && (
                <>
                  <div className="nc-scan-icon">📷</div>
                  <p className="nc-scan-desc">Scan the barcode on food packaging</p>
                  <button className="nc-btn-primary" onClick={() => setShowScanner(true)}>Open Camera</button>
                  <p className="nc-scan-note">Works on Chrome (Android) · Safari iOS 17+</p>
                </>
              )}
              {scanStatus === "looking" && (
                <div className="nc-scan-looking">
                  <div className="nc-spinner-lg" />
                  <p>Looking up barcode…</p>
                </div>
              )}
              {scanStatus === "notfound" && (
                <>
                  <div className="nc-scan-icon">❓</div>
                  <p className="nc-scan-desc">Product not found in database.</p>
                  <button className="nc-btn-sec" onClick={() => { setScanStatus(null); setShowScanner(true); }}>Try Again</button>
                  <button className="nc-btn-sec" style={{marginTop:8}} onClick={() => setActiveTab("custom")}>Enter Manually</button>
                </>
              )}
            </div>
          )}

          {/* ── Recent ── */}
          {activeTab === "recent" && (
            <div className="nc-tab-content">
              {(!recentFoods || recentFoods.length === 0) && (
                <div className="nc-no-results">No recent foods yet</div>
              )}
              <div className="nc-results-list">
                {(recentFoods || []).map((food, i) => (
                  <div key={i} className="nc-result-row" onClick={() => setSelected({ ...food, id: undefined })}>
                    <div className="nc-result-img-ph">🕐</div>
                    <div className="nc-result-info">
                      <span className="nc-result-name">{food.name}</span>
                      {food.brand && <span className="nc-result-brand">{food.brand}</span>}
                      <span className="nc-result-cal">{food.per100?.calories || 0} kcal/100g</span>
                    </div>
                    <span className="nc-result-arrow">›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Custom ── */}
          {activeTab === "custom" && (
            <div className="nc-tab-content">
              <div className="nc-scan-icon" style={{fontSize:40}}>✏️</div>
              <p className="nc-scan-desc">Enter nutrition info manually</p>
              <button className="nc-btn-primary" onClick={() => setShowCustom(true)}>Create Custom Food</button>
              {(customFoods || []).length > 0 && (
                <>
                  <p className="nc-custom-saved-label">Saved foods</p>
                  <div className="nc-results-list">
                    {(customFoods || []).map((food, i) => (
                      <div key={i} className="nc-result-row" onClick={() => setSelected({ ...food, id: undefined })}>
                        <div className="nc-result-img-ph">📝</div>
                        <div className="nc-result-info">
                          <span className="nc-result-name">{food.name}</span>
                          <span className="nc-result-cal">{food.per100?.calories || 0} kcal/100g</span>
                        </div>
                        <span className="nc-result-arrow">›</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

      {selected && (
        <FoodDetailModal food={selected} mealType={mealType}
          onConfirm={f => handleLog(f)}
          onClose={() => { setSelected(null); setScanResult(null); setScanStatus(null); }} />
      )}

      {showCustom && (
        <CustomFoodModal mealType={mealType}
          onConfirm={food => { setShowCustom(false); onLog(food); }}
          onClose={() => setShowCustom(false)} />
      )}
    </>
  );
}

// ─── NutritionGoalsModal ───────────────────────────────────────────────────
function NutritionGoalsModal({ goals, onSave, onClose }) {
  const [cal,   setCal]   = useState(String(goals.calories || 2000));
  const [prot,  setProt]  = useState(String(goals.protein  || 150));
  const [carb,  setCarb]  = useState(String(goals.carbs    || 200));
  const [fat,   setFat]   = useState(String(goals.fat      || 65));
  const [water, setWater] = useState(String(goals.water    || 2000));

  const save = () => {
    onSave({
      calories: parseInt(cal) || 2000,
      protein:  parseInt(prot) || 150,
      carbs:    parseInt(carb) || 200,
      fat:      parseInt(fat) || 65,
      water:    parseInt(water) || 2000,
    });
  };

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={e => e.stopPropagation()}>
        <div className="nc-modal-header">
          <span className="nc-modal-title">Nutrition Goals</span>
          <button className="nc-modal-close" onClick={onClose}>✕</button>
        </div>
        {[
          ["Daily Calories (kcal)", cal, setCal],
          ["Protein (g)",           prot, setProt],
          ["Carbs (g)",             carb, setCarb],
          ["Fat (g)",               fat,  setFat],
          ["Water (ml)",            water, setWater],
        ].map(([lbl, val, set]) => (
          <div key={lbl} style={{ marginBottom: 12 }}>
            <label className="nc-label">{lbl}</label>
            <input className="nc-input" type="number" min="0" value={val} onChange={e => set(e.target.value)} />
          </div>
        ))}
        <button className="nc-btn-primary" onClick={save}>Save Goals</button>
      </div>
    </div>
  );
}

// ─── NutritionTab (main export) ────────────────────────────────────────────
export function NutritionTab({ userData, onUpdateData }) {
  const [date, setDate]           = useState(todayStr());
  const [addingMeal, setAddingMeal] = useState(null);
  const [showGoals, setShowGoals] = useState(false);

  const nutrition    = userData.nutrition || {};
  const dayLog       = nutrition[date]    || { meals: {}, water: 0 };
  const goals        = userData.nutritionGoals || { calories: 2000, protein: 150, carbs: 200, fat: 65, water: 2000 };
  const totals       = dayTotals(dayLog);
  const water        = dayLog.water || 0;
  const recentFoods  = userData.recentFoods  || [];
  const customFoods  = userData.customFoods  || [];

  const updateDay = useCallback((fn) => {
    const updated = fn(dayLog);
    const u = { ...userData, nutrition: { ...nutrition, [date]: updated } };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
    onUpdateData(u);
  }, [userData, dayLog, nutrition, date, onUpdateData]);

  const handleAddFood = (meal, food) => {
    // Update recent foods (deduplicated by name+brand, max 30)
    const recent = recentFoods.filter(f => !(f.name === food.name && f.brand === food.brand));
    const { id: _id, ...foodWithoutId } = food;

    const u = {
      ...userData,
      nutrition: {
        ...nutrition,
        [date]: {
          ...dayLog,
          meals: { ...dayLog.meals, [meal]: [...(dayLog.meals?.[meal] || []), food] },
        }
      },
      recentFoods: [foodWithoutId, ...recent].slice(0, 30),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
    onUpdateData(u);
    setAddingMeal(null);
  };

  const handleDeleteFood = (meal, foodId) => {
    updateDay(d => ({ ...d, meals: { ...d.meals, [meal]: (d.meals?.[meal] || []).filter(f => f.id !== foodId) } }));
  };

  const handleAddWater = (ml) => {
    updateDay(d => ({ ...d, water: (d.water || 0) + ml }));
  };

  const handleResetWater = () => {
    updateDay(d => ({ ...d, water: 0 }));
  };

  const handleSaveGoals = (newGoals) => {
    const u = { ...userData, nutritionGoals: newGoals };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
    onUpdateData(u);
    setShowGoals(false);
  };

  return (
    <div className="ah-page nc-page">
      {/* ── Header ── */}
      <div className="nc-header">
        <h2 className="nc-title">Nutrition</h2>
        <button className="nc-goals-btn" onClick={() => setShowGoals(true)}>Goals ⚙️</button>
      </div>

      {/* ── Date navigator ── */}
      <div className="nc-date-nav">
        <button className="nc-date-arrow" onClick={() => setDate(d => offsetDate(d, -1))}>‹</button>
        <span className="nc-date-label">{fmtDate(date)}</span>
        <button className="nc-date-arrow" onClick={() => setDate(d => offsetDate(d, 1))}
          disabled={date >= todayStr()} style={{ opacity: date >= todayStr() ? 0.3 : 1 }}>›</button>
      </div>

      {/* ── Calorie + Macro summary ── */}
      <CalorieSummary totals={totals} goals={goals} />

      {/* ── Water ── */}
      <WaterTracker water={water} goal={goals.water} onAdd={handleAddWater} onReset={handleResetWater} />

      {/* ── Meals ── */}
      {MEAL_TYPES.map(meal => (
        <MealSection
          key={meal}
          mealType={meal}
          foods={dayLog.meals?.[meal] || []}
          onAdd={() => setAddingMeal(meal)}
          onDelete={id => handleDeleteFood(meal, id)}
        />
      ))}

      {/* ── Modals ── */}
      {addingMeal && (
        <FoodLogModal
          mealType={addingMeal}
          recentFoods={recentFoods}
          customFoods={customFoods}
          onLog={food => handleAddFood(addingMeal, food)}
          onClose={() => setAddingMeal(null)}
        />
      )}

      {showGoals && (
        <NutritionGoalsModal goals={goals} onSave={handleSaveGoals} onClose={() => setShowGoals(false)} />
      )}
    </div>
  );
}

// ─── CSS ───────────────────────────────────────────────────────────────────
export const nutritionStyles = `
/* ── Nutrition page ── */
.nc-page { padding-top: calc(env(safe-area-inset-top, 20px) + 12px); }
.nc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.nc-title { font-size:22px; font-weight:700; color:var(--text); margin:0; }
.nc-goals-btn { background:var(--bg3); border:1px solid var(--card-border); border-radius:10px; color:var(--text2); font-family:'Outfit',sans-serif; font-size:13px; font-weight:500; padding:8px 14px; cursor:pointer; transition:all .2s; }
.nc-goals-btn:hover { border-color:var(--gold); color:var(--gold); }

/* ── Date nav ── */
.nc-date-nav { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:16px; }
.nc-date-arrow { width:36px; height:36px; border-radius:50%; border:1px solid var(--card-border); background:var(--bg3); color:var(--text); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.nc-date-arrow:hover:not(:disabled) { border-color:var(--gold); color:var(--gold); }
.nc-date-label { font-size:15px; font-weight:600; color:var(--text); min-width:120px; text-align:center; }

/* ── Summary card ── */
.nc-summary-card { background:var(--glass); backdrop-filter:blur(20px) saturate(1.8); -webkit-backdrop-filter:blur(20px) saturate(1.8); border:1px solid var(--glass-border); border-radius:var(--radius); padding:20px; margin-bottom:14px; }
.nc-summary-ring-wrap { position:relative; width:128px; height:128px; margin:0 auto 16px; }
.nc-ring-svg { width:100%; height:100%; }
.nc-ring-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.nc-ring-cal { font-size:24px; font-weight:700; color:var(--text); line-height:1; }
.nc-ring-label { font-size:10px; color:var(--text2); margin-top:3px; text-transform:uppercase; letter-spacing:1px; }

.nc-summary-stats { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:18px; }
.nc-stat { flex:1; text-align:center; }
.nc-stat-val { display:block; font-size:20px; font-weight:700; color:var(--text); }
.nc-stat-key { display:block; font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
.nc-stat-divider { width:1px; height:36px; background:var(--card-border); margin:0 12px; }

.nc-macro-bars { display:flex; flex-direction:column; gap:10px; }
.nc-macro-row { display:flex; align-items:center; gap:10px; }
.nc-macro-label { font-size:12px; color:var(--text2); width:52px; flex-shrink:0; }
.nc-macro-track { flex:1; height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; }
.nc-macro-fill { height:100%; border-radius:3px; transition:width .4s ease; }
.nc-macro-nums { font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; min-width:80px; text-align:right; }
.nc-macro-goal { font-weight:400; color:var(--text3); }

/* ── Water ── */
.nc-water-card { background:var(--glass); backdrop-filter:blur(20px) saturate(1.8); -webkit-backdrop-filter:blur(20px) saturate(1.8); border:1px solid var(--glass-border); border-radius:var(--radius); padding:16px; margin-bottom:14px; }
.nc-water-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.nc-water-icon { font-size:18px; }
.nc-water-title { font-size:15px; font-weight:600; color:var(--text); flex:1; }
.nc-water-amount { font-size:14px; font-weight:600; color:var(--text); }
.nc-water-goal { font-weight:400; color:var(--text3); }
.nc-water-reset { background:transparent; border:none; color:var(--text3); font-size:16px; cursor:pointer; padding:0 4px; }
.nc-water-track { height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; margin-bottom:10px; }
.nc-water-fill { height:100%; background:#60A5FA; border-radius:3px; transition:width .4s ease; }
.nc-water-glasses { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px; }
.nc-glass { font-size:16px; opacity:0.2; transition:opacity .2s; }
.nc-glass-full { opacity:1; }
.nc-water-btns { display:flex; flex-wrap:wrap; gap:6px; }
.nc-water-btn { padding:6px 12px; background:var(--bg3); border:1px solid var(--card-border); border-radius:8px; color:var(--text2); font-family:'Outfit',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all .2s; }
.nc-water-btn:hover { border-color:#60A5FA; color:#60A5FA; }

/* ── Meal cards ── */
.nc-meal-card { background:var(--glass); backdrop-filter:blur(20px) saturate(1.8); -webkit-backdrop-filter:blur(20px) saturate(1.8); border:1px solid var(--glass-border); border-radius:var(--radius); margin-bottom:10px; overflow:hidden; }
.nc-meal-header { display:flex; align-items:center; gap:8px; padding:14px 16px; cursor:pointer; user-select:none; }
.nc-meal-icon { font-size:16px; }
.nc-meal-name { font-size:15px; font-weight:600; color:var(--text); flex:1; }
.nc-meal-total { font-size:13px; color:var(--text2); }
.nc-meal-add { width:30px; height:30px; border-radius:8px; border:1px solid var(--card-border); background:transparent; color:var(--gold); font-size:20px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.nc-meal-add:hover { background:var(--gold-dim); }
.nc-meal-chevron { font-size:14px; color:var(--text3); transition:transform .2s; }
.nc-meal-empty { padding:12px 16px; font-size:13px; color:var(--text3); text-align:center; }
.nc-food-row { display:flex; align-items:flex-start; gap:10px; padding:10px 16px; border-top:1px solid var(--card-border); }
.nc-food-info { flex:1; display:flex; flex-direction:column; gap:2px; }
.nc-food-name { font-size:14px; font-weight:500; color:var(--text); }
.nc-food-brand { font-size:11px; color:var(--text3); }
.nc-food-serving { font-size:12px; color:var(--text2); }
.nc-food-macros { font-size:11px; color:var(--text3); }
.nc-food-del { background:transparent; border:none; color:var(--text3); font-size:20px; cursor:pointer; padding:0; line-height:1; flex-shrink:0; margin-top:2px; transition:color .2s; }
.nc-food-del:hover { color:var(--danger); }
.nc-meal-footer { padding:10px 16px; border-top:1px solid var(--card-border); font-size:13px; color:var(--text2); display:flex; justify-content:space-between; align-items:center; background:var(--bg3); }
.nc-meal-footer strong { color:var(--text); }
.nc-meal-footer-macros { font-size:11px; color:var(--text3); }

/* ── Scanner ── */
.nc-scanner-overlay { position:fixed; inset:0; background:#000; z-index:1000; display:flex; flex-direction:column; }
.nc-scanner-box { flex:1; position:relative; display:flex; flex-direction:column; }
.nc-scanner-video { width:100%; height:100%; object-fit:cover; }
.nc-scanner-ui { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.nc-scanner-frame { width:220px; height:140px; border:2.5px solid var(--gold); border-radius:14px; box-shadow:0 0 0 9999px rgba(0,0,0,0.5); }
.nc-scanner-hint { color:#fff; font-size:14px; margin-top:20px; text-align:center; text-shadow:0 1px 4px #000; }
.nc-scanner-status { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7); }
.nc-scanner-success { color:var(--gold); font-size:16px; font-weight:600; text-align:center; }
.nc-scanner-msg { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); color:#fff; text-align:center; padding:24px; gap:8px; }
.nc-scanner-sub { font-size:12px; color:rgba(255,255,255,0.5); }
.nc-scanner-close { position:absolute; bottom:calc(env(safe-area-inset-bottom,20px) + 16px); left:50%; transform:translateX(-50%); padding:14px 32px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:50px; color:#fff; font-family:'Outfit',sans-serif; font-size:15px; font-weight:500; cursor:pointer; }

/* ── Modals (nutrition) ── */
.nc-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:900; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0; animation:fadeInOverlay .2s ease; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
.nc-modal { background:var(--glass); backdrop-filter:blur(40px) saturate(2); -webkit-backdrop-filter:blur(40px) saturate(2); border:1px solid var(--glass-border); border-radius:24px 24px 0 0; padding:28px 20px calc(env(safe-area-inset-bottom,24px) + 20px); width:100%; max-width:480px; max-height:92vh; overflow-y:auto; display:flex; flex-direction:column; gap:4px; animation:slideUp .35s cubic-bezier(0.32,0.72,0,1); position:relative; }
.nc-modal::before { content:''; display:block; width:36px; height:4px; background:rgba(255,255,255,0.22); border-radius:2px; margin:-10px auto 20px; flex-shrink:0; }
.nc-modal-tall { max-height:92vh; }
.nc-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.nc-modal-title { font-size:16px; font-weight:700; color:var(--text); }
.nc-modal-close { background:transparent; border:none; color:var(--text2); font-size:20px; cursor:pointer; padding:0; }

/* ── Tabs (inside modal) ── */
.nc-tabs { display:flex; background:var(--bg3); border-radius:10px; padding:3px; gap:2px; margin-bottom:14px; }
.nc-tab { flex:1; padding:8px 4px; background:transparent; border:none; border-radius:8px; color:var(--text2); font-family:'Outfit',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.nc-tab-active { background:var(--card); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.3); }

/* ── Search tab ── */
.nc-tab-content { display:flex; flex-direction:column; flex:1; min-height:300px; }
.nc-search-input { margin-bottom:10px; }
.nc-searching { text-align:center; color:var(--text2); font-size:13px; padding:20px; }
.nc-no-results { text-align:center; color:var(--text3); font-size:13px; padding:20px; }
.nc-results-list { display:flex; flex-direction:column; gap:0; overflow-y:auto; flex:1; }
.nc-result-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--card-border); cursor:pointer; transition:background .15s; }
.nc-result-row:last-child { border-bottom:none; }
.nc-result-row:active { background:var(--bg3); }
.nc-result-img { width:44px; height:44px; border-radius:8px; object-fit:cover; flex-shrink:0; background:var(--bg3); }
.nc-result-img-ph { width:44px; height:44px; border-radius:8px; background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.nc-result-info { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
.nc-result-name { font-size:14px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nc-result-brand { font-size:11px; color:var(--text3); }
.nc-result-cal { font-size:12px; color:var(--text2); }
.nc-result-arrow { color:var(--text3); font-size:20px; flex-shrink:0; }

/* ── Scan tab ── */
.nc-scan-tab { align-items:center; padding-top:24px; gap:12px; text-align:center; }
.nc-scan-icon { font-size:56px; }
.nc-scan-desc { font-size:14px; color:var(--text2); line-height:1.5; max-width:260px; margin:0; }
.nc-scan-note { font-size:11px; color:var(--text3); margin:4px 0 0; }
.nc-scan-looking { display:flex; flex-direction:column; align-items:center; gap:16px; padding-top:40px; color:var(--text2); font-size:14px; }
.nc-spinner-sm { width:32px; height:32px; border:3px solid var(--card-border); border-top-color:var(--gold); border-radius:50%; animation:spin .8s linear infinite; }
.nc-spinner-lg { width:48px; height:48px; border:4px solid var(--card-border); border-top-color:var(--gold); border-radius:50%; animation:spin .8s linear infinite; }

/* ── Custom saved label ── */
.nc-custom-saved-label { font-size:12px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin:16px 0 8px; text-align:left; width:100%; }

/* ── Food detail modal ── */
.nc-detail-food-name { font-size:18px; font-weight:700; color:var(--text); margin-bottom:4px; }
.nc-detail-food-brand { font-size:13px; color:var(--text3); margin-bottom:14px; }
.nc-detail-row { display:flex; gap:12px; margin-bottom:16px; }
.nc-detail-field { flex:1; display:flex; flex-direction:column; gap:4px; }
.nc-detail-macros { display:flex; gap:8px; margin-bottom:8px; }
.nc-detail-macro { flex:1; background:var(--bg3); border:1px solid var(--card-border); border-radius:10px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:2px; }
.nc-detail-cal { border-color:rgba(200,168,78,0.3); background:rgba(200,168,78,0.07); }
.nc-detail-macro-val { font-size:17px; font-weight:700; color:var(--text); }
.nc-detail-macro-key { font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:0.5px; }
.nc-detail-per100 { font-size:11px; color:var(--text3); text-align:center; margin:0 0 14px; }

/* ── Custom food grid ── */
.nc-custom-macros-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0 14px; }

/* ── Shared input/button styles ── */
.nc-label { font-size:12px; color:var(--text2); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; display:block; }
.nc-input { width:100%; background:var(--glass); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid var(--glass-border); border-radius:12px; color:var(--text); font-family:-apple-system,'SF Pro Display','Outfit',sans-serif; font-size:15px; font-weight:500; padding:13px 14px; outline:none; box-sizing:border-box; transition:border-color .2s; }
.nc-input:focus { border-color:var(--gold); }
.nc-btn-primary { width:100%; padding:15px; background:var(--gold); border:none; border-radius:14px; color:#0A0A0A; font-family:-apple-system,'SF Pro Display','Outfit',sans-serif; font-size:15px; font-weight:700; cursor:pointer; margin-top:8px; transition:transform .12s,opacity .12s; -webkit-tap-highlight-color:transparent; }
.nc-btn-primary:hover { opacity:.9; }.nc-btn-primary:active { transform:scale(0.97); opacity:.85; }
.nc-btn-sec { width:100%; padding:13px; background:var(--glass); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid var(--glass-border); border-radius:14px; color:var(--text); font-family:-apple-system,'SF Pro Display','Outfit',sans-serif; font-size:14px; font-weight:500; cursor:pointer; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.nc-btn-sec:hover { border-color:var(--gold); color:var(--gold); }.nc-btn-sec:active { transform:scale(0.97); }
`;
