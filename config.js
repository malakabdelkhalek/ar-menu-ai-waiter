// ===== SETTINGS =====

// 1. THE AI SERVER (optional). After deploying it on Render, paste its address between the quotes,
//    for example:  window.JOJO_API_URL = "https://jojo-server.onrender.com";
//    Leave it empty and Jojo uses the built-in (offline) brain only.
window.JOJO_API_URL = "";

// 2. SHARED LEARNING (optional). From your Supabase project: Settings > API Keys.
//    Paste the Project URL and the PUBLISHABLE key (it starts with "sb_publishable_").
//    That key is made to be public, so it is safe here. NEVER paste a "secret" key in this file.
//    Leave both empty and Jojo only learns on each phone separately.
window.JOJO_SUPABASE_URL = "https://supabase.com/dashboard/project/uxdgwpouinpgovyurfvr/sql/936b2eea-8da9-47da-a408-d58b1c369832";
window.JOJO_SUPABASE_KEY = "sb_publishable_dVsoA1m_DYsdIe0aQ2VIqA_1FUtI_io";
