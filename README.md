# 🍝 AR Menu + "Jojo" the AI Waiter

An augmented-reality restaurant menu built for **La Storia di Jojo**. Point your phone at the table placemat and the dishes appear in AR. Not sure what to order? **Jojo**, the AI waiter, asks you a few quick questions and recommends the 3 dishes that fit you best.

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![A-Frame](https://img.shields.io/badge/A--Frame-EF2D5E?style=flat-square&logo=aframe&logoColor=white)
![MindAR](https://img.shields.io/badge/MindAR-image%20tracking-555?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)


---

## Features

- **Mobile menu** (`index.html`): phone-first menu with categories, prices and dish cards.
- **AR view** (`ar.html`): image tracking on the placemat (`placemat.png`) with MindAR + A-Frame; Jojo's picks are highlighted on the table.
- **Jojo, the AI waiter** (`jojo-chat.js`):
  - Understands requests like *"something spicy under 20 DT, no meat"* (tags to prefer, tags to avoid, max price).
  - Scores every dish and returns the best 3.
  - Starts the conversation with a short tap-to-answer quiz (drink or food, hot or cold, mood, budget).
  - Can call an optional LLM server; if it is slow or offline, Jojo falls back to the built-in rule-based brain, so the demo always works.
- **Learning from customers** (`jojo-learn.js`): choices are saved to Supabase, and popular picks get ranked higher for the next customers.

## How it works

```
Customer message ─► understand()  ─► wishes {prefer, avoid, maxPrice}
                                       │
                     recommend() ◄─────┘  scores menu-data.js + learned stats
                         │
                         ▼
              top 3 dish cards  ─► highlighted in AR
```

## Run it locally

AR needs the camera, so serve it over HTTPS or `localhost`:

```bash
npx serve .
# open http://localhost:3000 on your computer, or use your deployed HTTPS link on your phone
```

Optional settings live in `config.js` (AI server URL, Supabase project URL and **publishable** key).

## Project files

| File | Role |
|---|---|
| `index.html` | Mobile menu page |
| `ar.html` | AR page (MindAR image target) |
| `menu-data.js` | Dishes, prices, tags |
| `jojo-chat.js` | Chat panel and recommendation logic |
| `jojo-learn.js` | Shared learning via Supabase |
| `placemat.png` / `placemat.mind` | AR target image and compiled tracking file |

## Author

**Malak Abdelkhalek** — [GitHub](https://github.com/malakabdelkhalek) · [LinkedIn](https://www.linkedin.com/in/YOUR-LINKEDIN/)
