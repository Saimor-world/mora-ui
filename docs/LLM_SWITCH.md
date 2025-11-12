# 🧠 LLM Provider Switch - Open Source Path

**Status:** 📋 Dokumentation | Nicht implementiert
**Datum:** 2025-11-10
**Ziel:** Môra von proprietären APIs unabhängig machen

---

## 🎯 Vision

Môra soll flexibel zwischen verschiedenen LLM-Backends wechseln können:
- **Heute:** Claude API über Gateway (proprietär, kostenpflichtig)
- **Morgen:** Lokales Mistral 7B via Ollama/vLLM (Open Source, kostenlos)

---

## 📊 Aktueller Stand

### Heute: Claude API

```
User → mora-ui → saimor-core → Claude API (Anthropic)
                 ↑
                 Gateway mit API Key
```

**Vorteile:**
- ✅ Hohe Qualität
- ✅ Schnelle Antworten
- ✅ Große Kontextfenster

**Nachteile:**
- ❌ Kosten pro Token
- ❌ Abhängigkeit von Anthropic
- ❌ Datenschutz (externe API)
- ❌ Rate Limits

---

## 🚀 Geplant: Open Source LLM

### Mistral 7B (oder ähnlich)

```
User → mora-ui → saimor-core → Ollama/vLLM → Mistral 7B (lokal)
                 ↑
                 Kein API Key nötig
```

**Vorteile:**
- ✅ Kostenlos (nur Hardware)
- ✅ Volle Kontrolle
- ✅ Datenschutz (alles lokal)
- ✅ Keine Rate Limits
- ✅ Open Source

**Nachteile:**
- ⚠️ Braucht GPU (min 8GB VRAM für 7B)
- ⚠️ Langsamere Inferenz als Claude
- ⚠️ Evtl. niedrigere Qualität

---

## ⚙️ Geplante Implementierung

### ENV Variables (saimor-core)

```env
# LLM Provider wählen
LLM_PROVIDER=external      # Claude API (default)
# LLM_PROVIDER=local       # Lokales Modell via Ollama

# Für external (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Für local (Ollama/vLLM)
LLM_LOCAL_BASE_URL=http://localhost:11434
LLM_LOCAL_MODEL=mistral:7b-instruct
LLM_LOCAL_TIMEOUT=60
```

### Code-Struktur (Pseudocode)

```python
# saimor-core/llm/provider.py

class LLMProvider:
    def __init__(self):
        self.provider = os.getenv('LLM_PROVIDER', 'external')

    def generate(self, prompt: str) -> str:
        if self.provider == 'external':
            return self._claude_generate(prompt)
        elif self.provider == 'local':
            return self._ollama_generate(prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def _claude_generate(self, prompt: str) -> str:
        # Anthropic API Call (aktuell)
        ...

    def _ollama_generate(self, prompt: str) -> str:
        # Ollama API Call (neu)
        response = requests.post(
            f"{LLM_LOCAL_BASE_URL}/api/generate",
            json={
                "model": LLM_LOCAL_MODEL,
                "prompt": prompt,
                "stream": False
            }
        )
        return response.json()['response']
```

### Frontend (mora-ui)

**Keine Änderungen nötig!**

Frontend kennt den Provider nicht - es ruft nur `/v1/chat` auf und bekommt eine Antwort.
Der Core entscheidet intern welcher Provider genutzt wird.

---

## 🛠️ Setup Ollama (lokal)

### Installation

```bash
# macOS/Linux
curl https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### Modell herunterladen

```bash
# Mistral 7B Instruct (empfohlen für Môra)
ollama pull mistral:7b-instruct

# Alternatives: Llama 2 13B
ollama pull llama2:13b

# Oder: Mixtral 8x7B (braucht mehr VRAM)
ollama pull mixtral:8x7b
```

### Server starten

```bash
# Startet auf localhost:11434
ollama serve
```

### Test

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral:7b-instruct",
  "prompt": "Erkläre Môra in einem Satz.",
  "stream": false
}'
```

---

## 📈 Vergleich: Claude vs Mistral 7B

| Metrik | Claude (Sonnet) | Mistral 7B |
|--------|----------------|------------|
| **Kosten** | ~$3/1M Tokens | Kostenlos |
| **Latenz** | ~500ms | ~2-5s |
| **Qualität** | Sehr hoch | Gut |
| **Kontext** | 200k Tokens | 8k-32k Tokens |
| **Privacy** | Extern | Lokal |
| **Hardware** | Keine | GPU (8GB+) |

---

## 🎯 Migration Plan

### Phase 1: Vorbereitung (Diese Woche)
- ✅ Dokumentation (diese Datei)
- ⏳ ENV-Variable `LLM_PROVIDER` im Core vorbereiten
- ⏳ Provider-Abstraktion implementieren

### Phase 2: Ollama Integration (Nächste Woche)
- ⏳ Ollama Client im Core implementieren
- ⏳ Fallback-Logic (wenn Ollama down → Claude)
- ⏳ Performance-Tests

### Phase 3: Production (später)
- ⏳ GPU-Server aufsetzen
- ⏳ Load-Balancing zwischen Providern
- ⏳ Monitoring & Metrics

---

## 🔧 Technische Details

### Ollama API Endpoints

```
POST /api/generate     # Einzel-Completion
POST /api/chat         # Chat-Format (multi-turn)
POST /api/embeddings   # Embeddings generieren
GET  /api/tags         # Verfügbare Modelle
```

### Beispiel Chat-Request

```json
POST http://localhost:11434/api/chat
{
  "model": "mistral:7b-instruct",
  "messages": [
    {
      "role": "system",
      "content": "Du bist Môra, eine intelligente Assistentin."
    },
    {
      "role": "user",
      "content": "Suche nach Finance-Dokumenten"
    }
  ],
  "stream": false
}
```

### Response

```json
{
  "model": "mistral:7b-instruct",
  "created_at": "2024-11-10T20:00:00Z",
  "message": {
    "role": "assistant",
    "content": "Ich habe 3 Finance-Dokumente gefunden..."
  },
  "done": true
}
```

---

## ⚠️ Wichtige Hinweise

### Hardware Requirements

**Minimum:**
- CPU: 4+ Cores
- RAM: 16GB
- GPU: 8GB VRAM (z.B. RTX 3060)

**Empfohlen:**
- CPU: 8+ Cores
- RAM: 32GB
- GPU: 24GB VRAM (z.B. RTX 4090, A5000)

### Performance-Tipps

1. **Quantisierung:** Nutze quantisierte Modelle (4-bit, 8-bit) für schnellere Inferenz
2. **Batching:** Mehrere Requests zusammenfassen
3. **Caching:** Häufige Prompts cachen
4. **GPU Offloading:** Alle Layers auf GPU wenn möglich

---

## 📚 Weitere Ressourcen

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Mistral AI Models](https://mistral.ai/)
- [vLLM (Alternative zu Ollama)](https://github.com/vllm-project/vllm)
- [LangChain Ollama Integration](https://python.langchain.com/docs/integrations/llms/ollama)

---

## 🎉 Ausblick

Mit lokalem LLM wird Môra:
- **Unabhängig** von externen APIs
- **Kostengünstiger** im Betrieb
- **Privacy-friendly** für sensible Daten
- **Open Source** von Ende zu Ende

**Next Steps:** ENV-Variable implementieren → Ollama testen → Performance messen

---

**Status:** 📋 **Dokumentiert | Bereit zur Implementierung**
**Priorität:** Medium (nach Core-Stabilität)
**Aufwand:** ~2-3 Tage Entwicklung + Testing
