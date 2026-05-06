# SAIMOR Content Model

`node` is an internal storage primitive, not a product word.

In the user-facing OS we use:

- `Dokument` for readable/editable workspace content.
- `Notiz` for lightweight authored text.
- `Datei` for the original uploaded binary/source file.
- `Eintrag` only as a neutral fallback when the type is unknown.

The backend can keep `/nodes`, `node_id`, `NodeService`, and the `nodes` table because they are stable contracts shared by search, relations, embeddings, calendar, artifacts, and file ingestion. Renaming those contracts would create broad migration risk without improving the product.

Rule: new UI copy, Mora replies, toasts, confirmations, and dashboard labels must not expose `node`. Translate at the boundary.

Boundary examples:

- API payload: `node_id`
- UI label: `Dokument-ID` or just `ID`
- API entity type: `node`
- User action: `Dokument oeffnen`
- Source file relation: `Originaldatei` or `Quelle`
