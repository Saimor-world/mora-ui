# CORS Configuration Required for Backend

**Date:** 2025-11-04
**Status:** ⚠️ ACTION REQUIRED

---

## 🎯 Issue

mora-ui runs on **Port 3004** (because port 3000 is in use), but Core API CORS only allows:
- `http://localhost:3000`
- `http://localhost:5173`

This causes CORS errors when mora-ui tries to fetch from `http://localhost:8081/v1/objects`.

---

## ✅ Solution

Add `http://localhost:3004` to Core API CORS allowed origins.

**File:** `C:\Users\mf4hr\saimor-core\core\app.py`

**Current CORS Configuration (line 72-83):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.is_development() else [
        "https://saimor.world",
        "https://*.saimor.world",
        "http://localhost:3000",  # mora-ui (Next.js dev)
        "http://localhost:5173",  # mora-ui (Vite fallback)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Required Change:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.is_development() else [
        "https://saimor.world",
        "https://*.saimor.world",
        "http://localhost:3000",  # mora-ui (Next.js dev)
        "http://localhost:3004",  # mora-ui (Next.js dev - alternate port) ✅ ADD THIS
        "http://localhost:5173",  # mora-ui (Vite fallback)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📋 Action Items

**For Backend Team:**
1. Open `C:\Users\mf4hr\saimor-core\core\app.py`
2. Add `"http://localhost:3004"` to `allow_origins` list (line ~77)
3. Restart Core API server
4. Verify CORS headers allow mora-ui requests

**Alternative (Quick Fix for Development):**
- Core API is already configured with `allow_origins=["*"]` in development mode
- Ensure `config.is_development()` returns `True` during local testing

---

## 🧪 Testing

After CORS fix, verify with:

```bash
# In browser console (http://localhost:3004):
fetch('http://localhost:8081/v1/objects', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected:** JSON response with `{ objects: [...], total: number }`
**Without CORS:** Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

---

## 📊 Impact

**Before Fix:**
- ❌ mora-ui cannot fetch from Core API
- ❌ Fallback to mock data only
- ❌ "Offline" mode even when Core API is running

**After Fix:**
- ✅ mora-ui fetches real data from Core API
- ✅ Live 3D visualization with actual objects
- ✅ Real-time snapshots (t0, t1, t2)
- ✅ "Live" indicator shows green

---

## 🔗 Related Files

**mora-ui:**
- `.env.local` - CORE_BASE_URL = http://localhost:8081
- `lib/api.ts` - API client configuration
- `lib/hooks/useApi.ts` - React Query hooks

**Core API:**
- `core/app.py` - CORS configuration (line 72-83)
- `core/schemas.py` - Response models (ObjectsResponse, SnapshotsResponse)
- `core/mora_mock_data.py` - Mock data for testing

---

**Status:** Waiting for backend CORS update to complete integration
