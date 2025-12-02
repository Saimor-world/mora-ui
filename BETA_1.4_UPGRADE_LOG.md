# 🚀 BETA 1.4 - SYSTEM UPGRADE LOG

## Build Date: 2025-12-02
## Version: Beta 1.4 (Dev)

---

## ✅ COMPLETED UPGRADES

### 1. WELCOME SCREEN (Animated & Session-Aware)
**Status**: ✅ COMPLETE & FIXED
**Files**:
- `components/auth/WelcomeScreen.tsx` (REWRITTEN)
- `app/layout.tsx` (FIXED - removed global auth block)
- `app/page.tsx` (UPDATED - now shows WelcomeScreen at root)

**Features**:
- 🎭 Animated Orb
- ✨ Floating particles
- 📊 "Welcome Back" session card
- 🔐 Privacy-conscious (local storage)
- 🎨 Smooth transitions
- 📱 Responsive

**CRITICAL FIX**:
- ❌ OLD: `layout.tsx` blocked ALL routes if not authenticated
- ✅ NEW: `/` shows Welcome, `/home` shows MoraShell
- ✅ Buttons now work (console logging added for debugging)
- ✅ Direct fetch() calls instead of corePost (more reliable)

**Technical Implementation**:
- Direct API calls to `localhost:8083/v1/auth/*`
- Session info in localStorage
- Cookie-based tokens
- Console logging for debugging

---

## 🔄 IN PROGRESS

### 2. COMPANY/WORKSPACE SYSTEM
**Status**: 🔄 PLANNED
**Target Files**:
- `lib/types/core.ts` (add Company type)
- `lib/store/moraState.ts` (add companies state)
- `lib/api/coreClient.ts` (company CRUD methods)
- Backend: New Company model & endpoints

**Requirements**:
- Company sits above Departments
- Multi-company support for Owner accounts
- Demo uses "Simple Coffee Group" company
- Owner can create multiple companies

---

### 3. TENANT ISOLATION
**Status**: 🔄 PLANNED
**Tenants**:
- `demo-simple-coffee` → Demo mode only
- `owner-default` → Owner workspace
- Future: `company-{id}` for multi-company

**Implementation**:
- All API calls should include tenant_id
- Demo data strictly in demo tenant
- UI filters data by active tenant

---

### 4. INTELLIGENCE FIELD CONTEXT AWARENESS
**Status**: 🔄 PLANNED
**Requirements**:
- Intelligence Bar only shows when Space/Folder active
- Context text changes based on location
- Synthesis Panel data is context-specific

---

### 5. VERSION UPDATES
**Status**: ⏳ TODO
**Files to Update**:
- `package.json` → "1.4.0-beta"
- `components/ui/SettingsPane.tsx` → "1.4.0-beta"
- Any footer/about sections

---

## 📋 PENDING TASKS

- [ ] Implement Company system (backend + frontend)
- [ ] Add Company selector to sidebar
- [ ] Create tenant isolation middleware
- [ ] Make Intelligence Bar context-aware
- [ ] Update all version strings to Beta 1.4
- [ ] Clean up unused components (old LoginScreen, etc.)
- [ ] Add "Create First Company" flow for new users
- [ ] Test Demo → Owner → Demo switching

---

## 🗑️ DEPRECATED/REMOVED

- `LoginScreen.tsx` → Replaced by `WelcomeScreen.tsx`
- `MoraDock.tsx` → Already removed (replaced by MoraIntelligenceBar)

---

## 🎯 NEXT SESSION PRIORITIES

1. **Company System** (highest priority)
2. **Tenant Isolation** in API layer
3. **Intelligence Context** logic
4. **UI Polish** (sidebar redesign for companies)
5. **Testing** across all modes

---

## 📝 NOTES

- New WelcomeScreen creates much better first impression
- Session persistence is working well
- Need to decide on Company database schema before proceeding
- Consider using `company_slug` for cleaner URLs

---

_Last Updated: 2025-12-02 09:40 CET_
