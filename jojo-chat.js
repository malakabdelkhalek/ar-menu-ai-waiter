// ===== JOJO, THE AI WAITER (step 4a: rule-based brain) =====
// Shared by index.html and ar.html. Needs menu-data.js loaded first.
//
// How it works:
//   1. understand(text)  -> reads the customer's message and finds what they want
//                           (tags to prefer, tags to avoid, a max price)
//   2. recommend(wishes) -> scores every dish against those wishes, keeps the best 3
//   3. the chat panel shows Jojo's answer + tappable dish cards
//   4. window.onJojoPicks(ids) lets each page highlight the picks (on the table in AR)
//
// Step 4b: if API_URL is set, messages go to the AI server (Gemini) first.
// If the server is slow, asleep or down, Jojo falls back to the rule-based brain below.

(function () {
  // ---------- 0. SETTINGS ----------
  // The AI server address is set in config.js. Empty = use only the rule-based brain.
  const API_URL = (window.JOJO_API_URL || "").trim().replace(/\/+$/, "");
  // Free servers fall asleep: wake ours up as soon as the page opens, so it's ready when Jojo is asked.
  if (API_URL && typeof fetch !== "undefined") fetch(API_URL + "/").catch(() => {});
  const API_TIMEOUT_MS = 30000;     // free servers "sleep" and can take ~30-50 s to wake up the first time

  // ---------- 1. WORDS JOJO UNDERSTANDS (English / French / Derja) ----------
  // Each tag from menu-data.js has a list of words that point to it.
  const KEYWORDS = {
    cold:        ["cold", "iced", "ice", "chill", "froid", "glace", "glacé", "bared", "barda", "summer"],
    hot:         ["hot", "warm", "chaud", "chaude", "skhoun", "skhouna", "s5oun", "s5ouna", "winter"],
    sweet:       ["sweet", "sugar", "dessert", "treat", "sucre", "sucré", "gourmand", "hlou", "7lou", "dolce"],
    caffeine:    ["coffee", "cafe", "café", "caffeine", "espresso", "kahwa", "9ahwa", "awake", "energy", "tired"],
    strong:      ["strong", "intense", "fort", "forte", "bitter", "amer", "9wiya"],
    light:       ["light", "small", "léger", "leger", "khfif", "5fif"],
    filling:     ["hungry", "starving", "filling", "meal", "lunch", "dinner", "eat", "food", "faim", "manger", "jiaan", "ji3an", "jou3an"],
    sharing:     ["share", "sharing", "friends", "group", "partager", "family", "famille", "s7ab"],
    morning:     ["breakfast", "morning", "brunch", "matin", "petit dej", "ftour", "sbe7"],
    spicy:       ["spicy", "piquant", "har", "7ar", "harissa"],
    savory:      ["savory", "savoury", "salty", "salé", "sale", "mal7"],
    seafood:     ["seafood", "fish", "shrimp", "fruits de mer", "poisson", "hout", "7out"],
    pistachio:   ["pistachio", "pistache", "fosto9", "fostok"],
    chocolate:   ["chocolate", "chocolat", "choco", "cocoa"],
    nutella:     ["nutella"],
    vanilla:     ["vanilla", "vanille"],
    mint:        ["mint", "menthe", "na3na3", "nanaa"],
    fruity:      ["fruit", "fruity", "fruité"],
    creamy:      ["creamy", "milk", "milky", "lait", "crémeux", "cremeux", "foam"],
    fresh:       ["fresh", "refreshing", "frais", "fraîche"],
    signature:   ["signature", "special", "speciality", "spécialité", "best", "popular", "famous", "house", "recommend", "favorite", "favourite"]
  };

  // Words that are about a kind of item rather than a tag
  const TEA_WORDS = ["tea", "thé", "the", "tay", "infusion"];
  const NEGATIONS = ["no", "not", "without", "sans", "pas", "bla", "blech", "avoid", "except", "hate"];
  const ALLERGY_WORDS = ["allergy", "allergic", "allergie", "allergique", "gluten", "lactose", "nuts", "nut", "noix", "arachide", "peanut"];
  const NUT_INGREDIENTS = ["pistachio", "nutella", "hazelnut", "dried fruits", "speculoos"];

  // lowercase + remove accents, so "Café" and "cafe" match
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function hasWord(text, word) {
    const w = norm(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text);
  }

  // Is this word preceded by a negation within the 3 words before it? ("no coffee", "sans cafe")
  function isNegated(text, word) {
    const words = text.split(/[^a-z0-9]+/).filter(Boolean);
    const target = norm(word).split(" ")[0];
    for (let i = 0; i < words.length; i++) {
      if (words[i] === target) {
        const before = words.slice(Math.max(0, i - 3), i);
        if (before.some(b => NEGATIONS.includes(b))) return true;
      }
    }
    return false;
  }

  // ---------- 2. UNDERSTAND THE MESSAGE ----------
  function understand(message) {
    const text = norm(message);
    const want = new Set(), avoid = new Set();

    for (const [tag, words] of Object.entries(KEYWORDS)) {
      for (const w of words) {
        if (hasWord(text, w)) { (isNegated(text, w) ? avoid : want).add(tag); break; }
      }
    }

    // "no caffeine" / "decaf" / "to sleep" means avoid caffeine
    if (/decaf|sans cafeine|no caffeine|without caffeine|sleep|night|n3ass/.test(text)) {
      want.delete("caffeine"); avoid.add("caffeine");
    }
    // hot and cold can't both be wanted: keep the one mentioned last
    if (want.has("hot") && want.has("cold")) {
      text.lastIndexOf("cold") > text.lastIndexOf("hot") ? want.delete("hot") : want.delete("cold");
    }

    // Budget: "under 10", "less than 10 dt", "moins de 10", "max 10", "10 dt", "budget 10"
    let maxPrice = null;
    const m = text.match(/(?:under|below|less than|max(?:imum)?|moins de|budget|up to|<)\s*(\d+(?:[.,]\d+)?)/)
           || text.match(/(\d+(?:[.,]\d+)?)\s*(?:dt|dinars?|tnd)/);
    if (m) maxPrice = parseFloat(m[1].replace(",", "."));
    if (/cheap|pas cher|budget|rkhis|r5is/.test(text) && maxPrice === null) maxPrice = 8;

    const wantsTea = TEA_WORDS.some(w => hasWord(text, w));
    const allergy = ALLERGY_WORDS.some(w => hasWord(text, w));
    const noNuts = allergy && /nut|noix|arachide|peanut|pistach/.test(text);

    return { want, avoid, maxPrice, wantsTea, allergy, noNuts };
  }

  // ---------- 3. SCORE THE DISHES ----------
  function recommend(w) {
    const scored = [];
    for (const it of window.MENU_ITEMS) {
      const tags = new Set(it.tags);
      const ingredients = it.ingredients.join(" ").toLowerCase();

      // Hard filters: things the customer said no to
      if ([...w.avoid].some(t => tags.has(t))) continue;
      if (w.maxPrice !== null && it.price > w.maxPrice) continue;
      if (w.want.has("hot") && !tags.has("hot")) continue;
      if (w.want.has("cold") && !tags.has("cold")) continue;
      if (w.noNuts && NUT_INGREDIENTS.some(n => ingredients.includes(n))) continue;
      if (w.wantsTea && !/th[eé]/i.test(it.name)) continue;
      // We don't know yet if the frappé base contains coffee: skip it when avoiding caffeine
      if (w.avoid.has("caffeine") && ingredients.includes("frappuccino")) continue;

      // Soft score: +2 for each wish this dish matches
      let score = 0;
      const reasons = [];
      for (const t of w.want) {
        if (tags.has(t)) { score += 2; reasons.push(t); }
      }
      if (w.wantsTea) { score += 2; reasons.push("tea"); }
      if (tags.has("signature")) score += 0.5;            // small boost for house specials
      scored.push({ item: it, score, reasons });
    }

    const nothingAsked = w.want.size === 0 && !w.wantsTea;
    scored.sort((a, b) => b.score - a.score || a.item.price - b.item.price);
    // Keep only dishes that match nearly as well as the best one (no weak "filler" picks)
    const best = scored.length ? scored[0].score : 0;
    const picks = nothingAsked ? scored.slice(0, 3)
      : scored.filter(s => s.reasons.length > 0 && s.score >= best * 0.75).slice(0, 3);
    return { picks, nothingAsked };
  }

  // ---------- 4. WRITE JOJO'S ANSWER ----------
  const GREETINGS = /^(hi|hello|hey|salut|bonjour|bonsoir|salam|aslema|ahla|marhba)\b/;

  function answer(message) {
    const text = norm(message.trim());
    if (GREETINGS.test(text) && text.split(" ").length <= 2) {
      return { text: "Ahla! I'm Jojo ☕ Tell me what you're in the mood for (cold, sweet, strong coffee, hungry, a budget…) and I'll find your story for today.", picks: [] };
    }

    const w = understand(message);
    const { picks, nothingAsked } = recommend(w);
    let intro;

    if (picks.length === 0) {
      intro = "Hmm, I couldn't find something that matches all of that 🤔 Try loosening one wish, like a bigger budget or a different temperature.";
    } else if (nothingAsked && w.maxPrice !== null) {
      intro = `Here are some good choices under ${w.maxPrice} DT:`;
    } else if (nothingAsked) {
      intro = "I'm not sure what you're craving yet, so here are some house favourites. You can also tell me: cold or hot? sweet? hungry?";
    } else {
      intro = picks.length === 1 ? "I have the perfect one for you:" : "Here's what I'd recommend:";
    }

    if (w.allergy) {
      intro += "\n\n⚠️ About allergies: I can't guarantee what's in each dish, so please confirm with the staff before ordering.";
    }
    return { text: intro, picks };
  }

  // ---------- 5. THE CHAT PANEL ----------
  const css = `
    .jojo-panel { position: fixed; inset: 0; z-index: 40; display: none; align-items: flex-end; justify-content: center; background: rgba(0,0,0,.35); }
    .jojo-panel.open { display: flex; }
    .jojo-box { background: #faf6ef; width: 100%; max-width: 520px; height: 78vh; border-radius: 22px 22px 0 0;
                display: flex; flex-direction: column; overflow: hidden; animation: jojoUp .25s ease-out; font-family: Inter, sans-serif; }
    @keyframes jojoUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .jojo-head { background: #1f6b3a; color: white; padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
    .jojo-avatar { width: 38px; height: 38px; border-radius: 50%; background: #c9a14a; display: grid; place-items: center; font-size: 20px; }
    .jojo-head b { font-family: "Playfair Display", serif; font-size: 18px; display: block; }
    .jojo-head small { opacity: .85; font-size: 12px; }
    .jojo-x { margin-left: auto; background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
    .jojo-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .jojo-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; white-space: pre-line; }
    .jojo-msg.bot { background: white; color: #2b2b2b; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .jojo-msg.me  { background: #1f6b3a; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
    .jojo-pick { display: flex; align-items: center; gap: 10px; background: white; border: 2px solid #c9a14a; border-radius: 14px;
                 padding: 8px 12px; cursor: pointer; align-self: flex-start; max-width: 85%; }
    .jojo-pick .ic { font-size: 24px; width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 10px; overflow: hidden; }
    .jojo-pick .ic img { width: 100%; height: 100%; object-fit: cover; }
    .jojo-pick b { font-size: 14px; color: #2b2b2b; display: block; }
    .jojo-pick span { font-size: 12px; color: #7a7a7a; }
    .jojo-pick .pr { color: #c9a14a; font-weight: 600; margin-left: auto; padding-left: 8px; white-space: nowrap; }
    .jojo-chips { display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 10px; }
    .jojo-chips button { flex-shrink: 0; border: 1.5px solid #1f6b3a; background: white; color: #1f6b3a; border-radius: 999px;
                         padding: 7px 12px; font: 500 13px Inter, sans-serif; cursor: pointer; }
    .jojo-input { display: flex; gap: 8px; padding: 10px 14px 18px; background: white; border-top: 1px solid #eee; }
    .jojo-input input { flex: 1; border: 1.5px solid #ddd; border-radius: 999px; padding: 11px 16px; font: 15px Inter, sans-serif; outline: none; }
    .jojo-input input:focus { border-color: #1f6b3a; }
    .jojo-input button { background: #c9a14a; color: white; border: none; border-radius: 999px; padding: 0 18px; font: 600 15px Inter, sans-serif; cursor: pointer; }
  `;

  const SUGGESTIONS = ["Something cold & sweet", "A strong coffee", "I'm hungry", "No caffeine, under 10 DT", "What's special here?"];

  function build() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "jojo-panel";
    panel.innerHTML = `
      <div class="jojo-box">
        <div class="jojo-head">
          <div class="jojo-avatar">☕</div>
          <div><b>Jojo</b><small>Your waiter · here to help you choose</small></div>
          <button class="jojo-x" aria-label="Close">×</button>
        </div>
        <div class="jojo-msgs"></div>
        <div class="jojo-chips">${SUGGESTIONS.map(s => `<button>${s}</button>`).join("")}</div>
        <form class="jojo-input">
          <input placeholder="What are you in the mood for?" autocomplete="off">
          <button type="submit">Ask</button>
        </form>
      </div>`;
    document.body.appendChild(panel);

    const msgs = panel.querySelector(".jojo-msgs");
    const input = panel.querySelector("input");

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = "jojo-msg " + who;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addPick(p) {
      const it = p.item;
      const div = document.createElement("div");
      div.className = "jojo-pick";
      // AI picks come with a "why" sentence; rule-based picks come with matched tags
      const why = p.why || (p.reasons && p.reasons.length ? p.reasons.map(r => "#" + r).join(" ") : "house favourite");
      div.innerHTML = `<span class="ic"></span><div><b></b><span class="why"></span></div><span class="pr"></span>`;
      // textContent (not innerHTML) so text coming from the AI can never inject code into the page
      window.fillPhotoBox(div.querySelector(".ic"), it);       // photo if there is one, icon otherwise
      div.querySelector("b").textContent = it.name;
      div.querySelector(".why").textContent = why;
      div.querySelector(".pr").textContent = it.price.toFixed(2) + " DT";
      // tap a pick: close the chat and open that dish's details
      div.onclick = () => { close(); if (window.openDish) window.openDish(it); };
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    const history = [];               // last turns, so the AI remembers the conversation
    let busy = false;

    function showAnswer(res) {
      addMsg(res.text, "bot");
      res.picks.forEach(addPick);
      if (res.picks.length && window.onJojoPicks) window.onJojoPicks(res.picks.map(p => p.item.id));
    }

    // Ask the AI server. Returns {text, picks} or throws if anything goes wrong.
    async function askServer(text) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
      try {
        const r = await fetch(API_URL + "/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: history.slice(-6) }),
          signal: ctrl.signal
        });
        if (!r.ok) throw new Error("server " + r.status);
        const data = await r.json();
        const picks = (data.picks || [])
          .map(p => ({ item: window.MENU_ITEMS.find(it => it.id === p.id), why: p.why }))
          .filter(p => p.item);                       // ignore any id the page doesn't know
        return { text: data.reply, picks };
      } finally {
        clearTimeout(timer);
      }
    }

    async function ask(text) {
      text = text.trim();
      if (!text || busy) return;
      busy = true;
      addMsg(text, "me");

      if (!API_URL) {                                  // no server: rule-based brain only
        setTimeout(() => { showAnswer(answer(text)); busy = false; }, 350);
        return;
      }

      const thinking = document.createElement("div");
      thinking.className = "jojo-msg bot";
      thinking.textContent = "Jojo is thinking… ☕";
      msgs.appendChild(thinking);
      msgs.scrollTop = msgs.scrollHeight;
      const slow = setTimeout(() => { thinking.textContent = "Warming up the coffee machine, one moment… ☕"; }, 5000);

      let res;
      try {
        res = await askServer(text);
      } catch (e) {
        console.warn("Jojo server unavailable, using the offline brain:", e.message);
        res = answer(text);                            // fallback: Jojo never goes silent
      }
      clearTimeout(slow);
      thinking.remove();
      showAnswer(res);
      history.push({ role: "user", text: text.slice(0, 600) }, { role: "jojo", text: res.text.slice(0, 600) });
      busy = false;
    }

    panel.querySelector("form").onsubmit = e => { e.preventDefault(); ask(input.value); input.value = ""; };
    panel.querySelectorAll(".jojo-chips button").forEach(b => b.onclick = () => ask(b.textContent));
    panel.querySelector(".jojo-x").onclick = close;
    panel.onclick = e => { if (e.target === panel) close(); };

    addMsg("Ahla! I'm Jojo ☕ Not sure what to have? Tell me your mood, or tap an idea below.", "bot");

    function open() { panel.classList.add("open"); setTimeout(() => input.focus(), 300); }
    function close() { panel.classList.remove("open"); }
    window.JojoChat = { open, close };
  }

  // Exposed for testing (node) and for step 4b
  window.JojoBrain = { understand, recommend, answer };
  if (typeof document !== "undefined") {
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", build) : build();
  }
})();
