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
