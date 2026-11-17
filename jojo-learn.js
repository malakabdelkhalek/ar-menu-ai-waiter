// ===== JOJO LEARNS FROM CUSTOMERS =====
// Every time a customer finishes the quiz, we save one anonymous "vote": their mood
// (plus drink/food, hot/cold, budget). When they then open a dish, we save that too.
// No names, no phone info, nothing personal.
//
// From those votes Jojo learns two things:
//   1. the mood most people are in right now  -> offered first to new customers
//   2. the dishes people in each mood open    -> ranked higher in Jojo's picks
//
// Where votes are stored:
//   - Supabase (shared by ALL customers) when config.js has the Supabase address and key
//   - otherwise only on this phone (localStorage), so the feature still works in a demo

(function () {
  const URL = (window.JOJO_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const KEY = (window.JOJO_SUPABASE_KEY || "").trim();
  const SHARED = !!(URL && KEY);

  const MIN_MOOD_VOTES = 5;      // don't call a mood "popular" before this many votes for it
  const MIN_DISH_VOTES = 3;      // don't trust dish popularity for a mood before this many opens
  const LOCAL_KEY = "jojo_local_votes";

  let stats = { moods: {}, dishes: {} };       // { moods: {treat: 12}, dishes: {treat: {"cold-02": 7}} }
  let sessionMood = null;                      // the mood this customer picked in the quiz
  const loggedDishes = new Set();              // so one customer counts once per dish

  // ---------- storage helpers ----------
  function headers() {
    const h = { "apikey": KEY, "Content-Type": "application/json" };
    if (KEY.startsWith("eyJ")) h["Authorization"] = "Bearer " + KEY;   // older "anon" keys also need this
    return h;
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || { moods: {}, dishes: {} }; }
    catch (e) { return { moods: {}, dishes: {} }; }
  }
  function writeLocal(s) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch (e) { /* private mode: ignore */ }
  }

  function countMood(s, mood) { s.moods[mood] = (s.moods[mood] || 0) + 1; }
  function countDish(s, mood, dish) {
    s.dishes[mood] = s.dishes[mood] || {};
    s.dishes[mood][dish] = (s.dishes[mood][dish] || 0) + 1;
  }

  async function send(row) {
    if (!SHARED) return;
    try {
      const r = await fetch(URL + "/rest/v1/jojo_events", {
        method: "POST", headers: { ...headers(), "Prefer": "return=minimal" }, body: JSON.stringify(row)
      });
      if (!r.ok) console.warn("Jojo learning: vote not saved (" + r.status + ")");
    } catch (e) {
      console.warn("Jojo learning: vote not saved:", e.message);
    }
  }

  // ---------- load what Jojo has learned so far ----------
  async function load() {
    if (SHARED) {
      try {
        const r = await fetch(URL + "/rest/v1/rpc/jojo_stats", { method: "POST", headers: headers(), body: "{}" });
        if (!r.ok) throw new Error("status " + r.status);
        const data = await r.json();
        stats = { moods: data.moods || {}, dishes: data.dishes || {} };
        return;
      } catch (e) {
        console.warn("Jojo learning: shared votes unavailable, using this phone's votes:", e.message);
      }
    }
    stats = readLocal();
  }
  const ready = typeof fetch !== "undefined" ? load() : Promise.resolve();

  // ---------- saving votes ----------
  // answers = { want: "drink"|"food"|"both", temp: "hot"|"cold"|"any", mood: "...", budget: "low"|"mid"|"any" }
  // countVote = false when the customer just tapped "what most people want": following the crowd
  // shouldn't count as a new vote, or the popular mood would keep feeding itself.
  function logQuiz(answers, countVote = true) {
    sessionMood = answers.mood;
    loggedDishes.clear();
    if (!countVote) return;
    countMood(stats, answers.mood);                         // Jojo knows it right away on this phone
    const local = readLocal(); countMood(local, answers.mood); writeLocal(local);
    send({ kind: "quiz", mood: answers.mood, want: answers.want, temp: answers.temp, budget: answers.budget });
  }

  // Called by the pages whenever a dish is opened. Counts only after the quiz gave us a mood.
  function dishOpened(dishId) {
    if (!sessionMood || loggedDishes.has(dishId)) return;
    loggedDishes.add(dishId);
    countDish(stats, sessionMood, dishId);
    const local = readLocal(); countDish(local, sessionMood, dishId); writeLocal(local);
    send({ kind: "choice", mood: sessionMood, dish_id: dishId });
  }

  // ---------- what Jojo learned ----------
  // The mood most people picked, or null when there aren't enough votes or it's a tie.
  function popularMood() {
    const sorted = Object.entries(stats.moods).sort((a, b) => b[1] - a[1]);
    if (!sorted.length || sorted[0][1] < MIN_MOOD_VOTES) return null;
    if (sorted[1] && sorted[1][1] === sorted[0][1]) return null;
    return sorted[0][0];
  }

  // How popular a dish is among people in this mood: 0 (never opened) to 1 (the favourite).
  function dishBoost(mood, dishId) {
    const d = stats.dishes[mood];
    if (!d) return 0;
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    if (total < MIN_DISH_VOTES) return 0;
    return (d[dishId] || 0) / Math.max(...Object.values(d));
  }

  window.JojoLearn = { ready, logQuiz, dishOpened, popularMood, dishBoost, shared: SHARED, stats: () => stats };
})();
