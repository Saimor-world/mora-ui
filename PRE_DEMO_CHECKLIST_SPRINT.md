# 🚀 Pre-Demo Checklist: Sprint G

**Target:** KI Garage Heilbronn Demo
**System:** Môra UI + Saimôr Core

---

## 1. System Start Sequence

### Backend (Terminal 1)
- [ ] Navigate: `cd c:\saimor\saimor-core\core`
- [ ] Activate Venv: `.\venv\Scripts\activate` (if applicable)
- [ ] Start: `python run.py`
- [ ] Verify: Open `http://localhost:8081/health` -> `{"status": "ok"}`

### Frontend (Terminal 2)
- [ ] Navigate: `cd c:\saimor\mora-ui`
- [ ] Start: `npm run dev`
- [ ] Verify: Open `http://localhost:3002`

---

## 2. Feature Verification

### 🧠 Intelligence
- [ ] **Synthesis Panel**: Check top-right corner. Should show "Risk Level" (not "Loading...").
- [ ] **ChatDock**: Click "Môra AI". Type "Hello". Check if it replies.
- [ ] **Context**: Navigate to a Space. Ask "Where am I?". AI should know.

### ⚡ Interaction
- [ ] **Navigation**: Click Department -> Space -> Folder.
- [ ] **MÔRA Scan**: Inside a Folder, click the "MÔRA SCAN" button (lightning icon).
  - [ ] Button should pulse "SCANNING...".
  - [ ] Background (Mycelium) should flash (Intel-Blitz).
  - [ ] Console should log `[MÔRA Scan] Intel report created`.

### 🎨 Visuals
- [ ] **Mycelium**: Check background animation.
- [ ] **Pulse**: Navigate to different folders. Background should pulse slightly.

---

## 3. Troubleshooting

| Issue | Fix |
| :--- | :--- |
| **"Connection Error"** | Check Backend terminal. Is it running? Check `.env.local` URL. |
| **AI not replying** | Check `.env.local` API Key. Check internet connection. |
| **No "MÔRA Scan" button** | Ensure you are inside a **Folder** (not Space or Department). |
| **Visuals laggy** | Close other browser tabs. Ensure Hardware Acceleration is ON. |

---

## 4. Demo Flow Script

1.  **Intro**: "This is Môra. The organic OS."
2.  **Nav**: "I dive into the structure..." (Click Dept -> Space -> Folder)
3.  **Intel**: "I need intelligence here." (Click **MÔRA SCAN**) -> *Wait for Flash*
4.  **Chat**: "Let's ask Môra." (Open ChatDock) -> "What did we find?"
5.  **Outro**: "Everything is connected." (Show Mycelium)

---

**Status:** ✅ READY TO GO
