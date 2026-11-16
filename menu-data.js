// ===== LA STORIA DI JOJO — MENU DATA =====
// Shared by index.html (plain menu) and ar.html (AR menu).
// Demo data from their digital menu, not yet confirmed by the restaurant.

window.MENU_ITEMS = [
  {"id":"hot-01","name":"Caffé di JOJO","category":"Hot","price":8.00,"description":"The house signature coffee blend.","ingredients":["coffee"],"tags":["hot","caffeine","signature"]},
  {"id":"hot-02","name":"Cappuccino","category":"Hot","price":5.50,"description":"Classic Italian coffee: espresso, steamed milk and milk foam in equal parts.","ingredients":["espresso","steamed milk","milk foam"],"tags":["hot","caffeine","creamy","morning"]},
  {"id":"hot-03","name":"Café Turc","category":"Hot","price":5.00,"description":"Traditional Turkish coffee.","ingredients":["turkish coffee"],"tags":["hot","caffeine","strong","bitter"]},
  {"id":"hot-04","name":"Thé aux Fruits Secs","category":"Hot","price":8.50,"description":"Tea with dried fruits.","ingredients":["tea","dried fruits"],"tags":["hot","fruity"]},
  {"id":"hot-05","name":"Thé Vert à la Menthe","category":"Hot","price":2.60,"description":"Green tea with fresh mint.","ingredients":["green tea","fresh mint"],"tags":["hot","fresh","mint","light"]},
  {"id":"hot-06","name":"Pistachio Hot Chocolate","category":"Hot","price":12.00,"description":"Hot chocolate with pistachio flavor.","ingredients":["hot chocolate","pistachio"],"tags":["hot","sweet","creamy","chocolate","pistachio","no-caffeine","treat"]},
  {"id":"cold-01","name":"Affogato Viennois","category":"Cold","price":7.00,"description":"Vanilla ice cream with 2 shots of espresso.","ingredients":["vanilla ice cream","2 espresso shots"],"tags":["cold","sweet","caffeine","vanilla","treat"]},
  {"id":"cold-02","name":"Affogato Pistachio","category":"Cold","price":9.00,"description":"Pistachio ice cream with 2 shots of espresso.","ingredients":["pistachio ice cream","2 espresso shots"],"tags":["cold","sweet","caffeine","pistachio","treat"]},
  {"id":"cold-03","name":"Affogato Liégois","category":"Cold","price":8.90,"description":"Hazelnut or chocolate ice cream with 2 shots of espresso.","ingredients":["hazelnut or chocolate ice cream","2 espresso shots"],"tags":["cold","sweet","caffeine","chocolate","treat"]},
  {"id":"cold-04","name":"Frappé Pistachio","category":"Cold","price":13.50,"description":"Classic Frappuccino with pistachio flavor.","ingredients":["ice","milk","frappuccino base","pistachio"],"tags":["cold","sweet","creamy","pistachio","treat"]},
  {"id":"cold-05","name":"Frappé Nutella Speculoos","category":"Cold","price":10.00,"description":"Classic Frappuccino with Nutella and Speculoos.","ingredients":["ice","milk","frappuccino base","nutella","speculoos"],"tags":["cold","sweet","creamy","nutella","treat"]},
  {"id":"cold-06","name":"Frappé Nutella Oreo","category":"Cold","price":9.00,"description":"Classic Frappuccino with Nutella and Oreo.","ingredients":["ice","milk","frappuccino base","nutella","oreo"],"tags":["cold","sweet","creamy","nutella","chocolate","treat"]},
  {"id":"food-01","name":"Brunch","category":"Breakfast","price":55.00,"description":"Brunch for sharing: 2 coffees, water, a savory board (eggs cocotte, grilled escalope skewers, charcuterie, cheeses, bruschettas, ricotta, salad) and a sweet board (cheesecake or tiramisu, granola bowls, toasts, pancakes and more).","ingredients":["2 coffees","water 1L","eggs","escalope","charcuterie","cheese","bruschetta","ricotta","salad","cheesecake or tiramisu","granola","toasts","pancakes"],"tags":["sharing","filling","morning","savory","sweet"]},
  {"id":"food-02","name":"Ojja Merguez","category":"Savory","price":17.00,"description":"Tomato sauce, peppers, onion, 5 merguez sausages and 4 eggs.","ingredients":["tomato sauce","pepper","onion","5 merguez","4 eggs"],"tags":["savory","spicy","filling"]},
  {"id":"food-03","name":"Fruits de Mer","category":"Savory","price":25.00,"description":null,"ingredients":["seafood"],"tags":["savory","seafood","filling"]}
];

// The 3 tabs we show, and which restaurant categories go in each
window.MENU_TABS = {
  "Hot":  { label: "☕ Hot",  match: ["Hot"] },
  "Cold": { label: "🧊 Cold", match: ["Cold"] },
  "Food": { label: "🍽️ Food", match: ["Breakfast", "Savory"] }
};

// Placeholder icon per category until we have real photos
window.MENU_ICONS = { Hot: "☕", Cold: "🥤", Breakfast: "🥐", Savory: "🍳" };

// ===== DISH PHOTOS =====
// Put a photo for a dish in the "photos" folder, named after the dish id:
//   photos/hot-01.jpg, photos/cold-04.jpg, photos/food-02.jpg ...
// Dishes without a photo keep the icon above. No code change is needed.
window.dishPhotoUrl = (id) => "photos/" + id + ".jpg";

// Loads a dish photo once and remembers the result. Gives null when there is no photo.
const _photoCache = {};
window.loadDishPhoto = (id) => {
  if (!_photoCache[id]) {
    _photoCache[id] = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = window.dishPhotoUrl(id);
    });
  }
  return _photoCache[id];
};

// Fills a ".photo" box: shows the icon first, then swaps in the real photo if one exists.
window.fillPhotoBox = (box, item) => {
  box.textContent = window.MENU_ICONS[item.category] || "🍽️";
  window.loadDishPhoto(item.id).then((img) => {
    if (!img) return;
    const el = document.createElement("img");
    el.src = img.src;
    el.alt = item.name;
    box.textContent = "";
    box.appendChild(el);
  });
};
