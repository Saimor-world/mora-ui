# Phase H: Content Interaction & Semantic Intelligence

**Status:** 🚀 STARTING
**Focus:** Deep Content Interaction, Editing, and Semantic Search

---

## 🎯 Objectives

### H-01: Node Viewer & Editor (High Priority)
- **Goal:** View and edit node content directly in the UI.
- **Features:**
  - Markdown Rendering for text nodes.
  - Code Syntax Highlighting for code nodes.
  - Edit Mode with live preview.
  - Save changes to Core API.

### H-02: Semantic Search Integration (Medium Priority)
- **Goal:** Enable AI-powered search across the knowledge base.
- **Features:**
  - Search Bar in Global Header or Sidebar.
  - Connect to `/v1/semantic/search`.
  - Display results with relevance scores.
  - Click result -> Navigate to Node.

### H-03: Advanced CRUD (Low Priority)
- **Goal:** Complete management of the structure.
- **Features:**
  - Edit/Delete Spaces.
  - Edit/Delete Folders.
  - Move nodes between folders (Drag & Drop?).

---

## 🛠 Implementation Plan

### 1. Node Viewer (`components/content/NodeViewer.tsx`)
- Use `react-markdown` for rendering.
- Use `prism-react-renderer` for code blocks.
- Integrate into `NodeDetailPanel`.

### 2. Semantic Search (`components/search/SemanticSearch.tsx`)
- Create search input component.
- Implement API client for `/v1/semantic/search`.
- Show results in a dropdown or dedicated panel.

### 3. Edit Forms
- Reuse `CreateModal` logic for Editing.
- Add "Edit" and "Delete" buttons to Space/Folder headers.

---

## 📦 Deliverables
- [ ] Fully functional Node Editor.
- [ ] Working Semantic Search.
- [ ] Complete CRUD for all layers.
