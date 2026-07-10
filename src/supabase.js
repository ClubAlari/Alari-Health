import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jyvbhhwgqfawrmujdqtc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dmJoaHdncWZhd3JtdWpkcXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzQxOTIsImV4cCI6MjA5NDM1MDE5Mn0.3mjsDyRA47b0v8oppaDge_zD8mWI2DP3RzW3TrjOsvw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function loadUserData(phone) {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("phone", phone)
      .single();
    if (error) return null;
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function saveUserData(userData) {
  try {
    // Photos are base64 blobs — keep them local only, sync everything else
    const { photos, ...sync } = userData;
    await supabase.from("user_data").upsert({
      phone: userData.phone,
      data: sync,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // localStorage is the fallback; silent fail is intentional
  }
}

// ── Friends & Leaderboard ─────────────────────────────────
export async function sendFriendRequest(fromPhone, fromName, toPhone) {
  try {
    // Check both directions for an existing connection using separate .eq() queries
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("friends").select("id,status").eq("from_phone", fromPhone).eq("to_phone", toPhone),
      supabase.from("friends").select("id,status").eq("from_phone", toPhone).eq("to_phone", fromPhone),
    ]);
    const existing = [...(a || []), ...(b || [])];
    if (existing.length) return { alreadyExists: true, status: existing[0].status };
    const { error } = await supabase.from("friends").insert({ from_phone: fromPhone, from_name: fromName, to_phone: toPhone });
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) { return { error: e.message }; }
}

export async function getFriends(myPhone) {
  try {
    // Two separate queries — avoids .or() string interpolation issues with phone numbers
    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from("friends").select("*").eq("from_phone", myPhone),
      supabase.from("friends").select("*").eq("to_phone", myPhone),
    ]);
    return [...(sent || []), ...(received || [])];
  } catch { return []; }
}

export async function respondFriendRequest(id, accept) {
  try {
    await supabase.from("friends").update({ status: accept ? "accepted" : "rejected" }).eq("id", id);
  } catch {}
}

export async function removeFriend(id) {
  try { await supabase.from("friends").delete().eq("id", id); } catch {}
}

export async function syncPublicPRs(phone, name, prs, isPublic = false) {
  try {
    await supabase.from("public_prs").upsert({ phone, name, prs, is_public: isPublic, updated_at: new Date().toISOString() });
  } catch {}
}

export async function getFriendPRs(phones) {
  if (!phones.length) return [];
  try {
    const { data } = await supabase.from("public_prs").select("phone,name,prs").in("phone", phones);
    return data || [];
  } catch { return []; }
}

export async function getGlobalLeaderboard() {
  try {
    const { data } = await supabase
      .from("public_prs")
      .select("phone,name,prs")
      .eq("is_public", true)
      .limit(500);
    return data || [];
  } catch { return []; }
}

// ── Shared splits ──────────────────────────────────────────
export async function shareSplit(splitData) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { error } = await supabase
    .from("shared_splits")
    .insert({ code, data: splitData });
  if (error) throw error;
  return code;
}

export async function loadSharedSplit(code) {
  try {
    const { data, error } = await supabase
      .from("shared_splits")
      .select("data")
      .eq("code", code.toUpperCase().trim())
      .single();
    if (error) return null;
    return data?.data || null;
  } catch {
    return null;
  }
}
