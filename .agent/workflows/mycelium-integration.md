# 🌿 MÔRA UI - Procedural Mycelium Integration Plan

## 🎯 Vision
Create a **living, procedurally generated mycelium network** that:
- Grows organically from real data sources
- Renders as an interactive 3D background
- Every orb/node is explorable with sub-folders
- Connects data sources selected in intro flow
- Self-generates like in video games (procedural generation)

---

## 📦 Phase 0: Backend Requirements (Saimor Core Team)

### CORS Fix (CRITICAL - blocks everything!)
```python
# In Saimor Core app.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3005",
        "http://localhost:3002", 
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### New Endpoints Needed
1. **`POST /v1/datasources/connect`** - Connect a new data source
2. **`GET /v1/mycelium/generate`** - Generate procedural graph
3. **`GET /v1/objects/:id/children`** - Get child objects

---

## 🎨 Phase 1: Mycelium as Background (Week 1)
- Convert MyceliumGraph2D to background layer
- Integrate with Organic Flow
- Add camera system

## 🟢 Phase 2: Interactive Môra Orb (Week 1-2)
- Upgrade MoraOrb Component
- Add clickable states
- Command palette integration

## 📊 Phase 3: Hierarchical Orbs & Folders (Week 2-3)
- Expandable nodes
- Load children on demand
- Visual hierarchy (datasources → folders → documents)

## 🎮 Phase 4: Procedural Generation (Week 3-4)
- Force-directed layout algorithm
- Real-time growth
- Seed-based randomness

## 🔗 Phase 5: Data Source Integration (Week 4-5)
- Connector selection UI
- Auth flows
- Live sync

## 🎬 Phase 6: Cinematic Experience (Week 5-6)
- Intro sequence animation
- Smooth transitions
- Sound effects

---

## 🚀 Next Steps (RIGHT NOW)

1. **Get Saimor Core to add CORS headers** (blocking!)
2. Build `MyceliumBackground` component
3. Create procedural layout algorithm
4. Design connector auth flows

Ready to start building? 🌿✨
