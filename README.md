# 🌐 Môra UI - MVP

Next.js frontend for the Môra semantic intelligence platform.

**📚 New to Môra UI?** Start here:
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-Minute Setup Guide → Get running fast!
- **[PHASE_G_COMPLETE.md](./PHASE_G_COMPLETE.md)** - Latest Implementation Status (Phase G)
- **[PHASE_G_STATUS.md](./PHASE_G_STATUS.md)** - Technical Deep-Dive

## 🚀 Quick Start

```bash
# Install dependencies
npm install  # or pnpm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your values
# (See Configuration section below)

# Start dev server
npm run dev

# Open http://localhost:3000
```

## ⚙️ Configuration

All configuration is managed through `.env.local`. See `.env.local.example` for all options.

### Required Variables

```env
# Core API URL (where saimor-core runs)
NEXT_PUBLIC_CORE_API_URL=http://localhost:8081

# JWT Token for API authentication
# Generate with: python scripts/generate_token.py
NEXT_PUBLIC_JWT_TOKEN=eyJhbGciOi...

# Chat datasource (objects = simple, semantic = AI-powered)
NEXT_PUBLIC_CHAT_SOURCE=objects
```

### Optional Variables

```env
# Enable diagnostics panel (dev mode only)
NEXT_PUBLIC_ENABLE_DIAGNOSTICS=true

# n8n webhook URLs (for Insights workflows)
NEXT_PUBLIC_N8N_EMAIL_DIGEST=https://...
NEXT_PUBLIC_N8N_BROADCAST_DOC=https://...
NEXT_PUBLIC_N8N_DUPLICATE_HUNTER=https://...
```

## 🔍 Diagnostics Panel

In development mode, a diagnostics panel is available (bottom-left corner) that shows:

- ✅ **Configuration** - Current API URL, JWT token (preview), chat source
- 🏥 **Health Status** - Core API, Database, Qdrant, LLM status
- 💡 **Quick Fixes** - Troubleshooting hints when issues detected

**Features:**
- Auto-checks health on open
- Refresh button to re-check
- Color-coded status (green = ok, yellow = warning, red = error)
- Specific error messages with fix suggestions

## 💬 Chat Datasource

Môra Chat can use different datasources (controlled by `NEXT_PUBLIC_CHAT_SOURCE`):

### `objects` (Default)
- Direct queries to `/v1/objects`
- Fast, simple keyword search
- Good for MVP and testing
- No AI/embeddings required

### `semantic` (Future)
- Uses `/v1/semantic/search`
- AI-powered semantic search
- Requires vector database (Qdrant)
- Better relevance and understanding

**Switching:**
```env
# Use objects (fast, simple)
NEXT_PUBLIC_CHAT_SOURCE=objects

# Use semantic (AI-powered)
NEXT_PUBLIC_CHAT_SOURCE=semantic
```

The UI code remains the same - only the data source changes!

## 🎭 Orb Views

Orbs are filtered views of your data by department/context:

- **Leitung** - Leadership/management view
- **Service** - Service department view
- **HR** - Human resources view

**Implementation:**
Tabs in the UI trigger API queries with `?orb=<slug>` parameter.
No agent duplication - just filtered context.

## 🛠️ Development

```bash
# Dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## 📦 Project Structure

```
mora-ui/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/
│   ├── chat/              # Môra Chat Assistant
│   ├── canvas/            # Main visualization (Field/Folder Mode)
│   ├── lens/              # Sidebar (filters, search)
│   ├── insights/          # Workflows panel
│   └── diagnostics/       # Dev diagnostics panel
├── lib/
│   ├── config.ts          # Centralized configuration
│   ├── api.ts             # Robust API client
│   ├── hooks/
│   │   ├── useApi.ts      # React Query hooks
│   │   └── useChatData.ts # Abstracted chat datasource
│   └── types.ts           # TypeScript types
└── .env.local.example     # Environment template
```

## 🔒 Authentication

Currently uses **static JWT tokens**:

1. Generate token with Core API's `MORA_JWT_SECRET`
2. Add to `.env.local` as `NEXT_PUBLIC_JWT_TOKEN`
3. Token sent as `Bearer` header on all API requests

**Future:** User login, sessions, OAuth, etc.

## 🚨 Troubleshooting

### "Failed to fetch"

1. Check Core API is running: `http://localhost:8081/v1/health`
2. Check `.env.local` has correct `NEXT_PUBLIC_CORE_API_URL`
3. Check CORS allows `localhost:3000`
4. Open Diagnostics panel for detailed status

### 401 Unauthorized

1. Check JWT token in `.env.local`
2. Verify token matches Core API's `MORA_JWT_SECRET`
3. Check token hasn't expired
4. Regenerate token if needed

### Diagnostics shows errors

The diagnostics panel will show specific issues:
- **unreachable** - Core API not responding (is it running?)
- **error** - Server error (check logs)
- **unauthorized** - Invalid JWT token

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - How to deploy to production
- [Session Summary](../FINAL_STATUS_NOV8.md) - Latest session achievements
- [Complete Status](../MORA_UI_COMPLETE_STATUS.md) - Full feature matrix

## 🎯 Feature Toggle

Chat datasource switching is implemented as a **feature toggle**:

```typescript
// lib/hooks/useChatData.ts
const source = getChatSource(); // 'objects' or 'semantic'

if (source === 'semantic') {
  // Use AI-powered semantic search
  const results = await api.semanticSearch(query);
} else {
  // Use simple object search
  const results = searchObjects(query);
}
```

Change `NEXT_PUBLIC_CHAT_SOURCE` in `.env.local` - no code changes needed!

## 🏗️ Build & Deploy

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full deployment instructions.

**Quick deploy to Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_CORE_API_URL
# - NEXT_PUBLIC_JWT_TOKEN
# - NEXT_PUBLIC_CHAT_SOURCE
```

## 📝 License

Part of the Saimor/Môra ecosystem.

## 🤝 Contributing

1. Create feature branch: `git checkout -b feat/your-feature`
2. Make changes
3. Test locally: `npm run dev`
4. Build test: `npm run build`
5. Commit: `git commit -m "feat: your feature"`
6. Push & create PR

---

**Status:** ✅ MVP Complete | 🚀 Production-Ready | 🧪 Testing Phase

Made with ❤️ for intelligent knowledge management.

