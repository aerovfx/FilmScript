# RAG and Configuration

## RAG Retrieval Flow

The system automatically retrieves relevant content from historical chapters during writing to help maintain consistency.

```text
Query → QueryRouter(auto) → vector / bm25 / hybrid / graph_hybrid
                     └→ RRF fusion + Rerank → Top-K
```

- Default mode is `auto`: prefer vector retrieval, auto-fallback to BM25 on failure
- `graph_hybrid` mode also layers in entity-graph associations

### Default Models

| Component | Default Model |
|------|----------|
| Embedding | `Qwen/Qwen3-Embedding-8B` (hosted on ModelScope) |
| Reranker | `jina-reranker-v3` (hosted on Jina AI) |

## Environment Variable Load Order

The system loads config in the following priority order (earlier wins):

1. **Process environment variables** (highest priority)
2. **Book project root** `.env`
3. **User-level global**: `~/.claude/webnovel-writer/.env`

## `.env` Minimal Config

After initializing a project, `.env.example` is auto-generated; copy it to `.env` and fill in the API keys:

```bash
cp .env.example .env
```

Required content:

```bash
EMBED_BASE_URL=https://api-inference.modelscope.cn/v1
EMBED_MODEL=Qwen/Qwen3-Embedding-8B
EMBED_API_KEY=your_embed_api_key

RERANK_BASE_URL=https://api.jina.ai/v1
RERANK_MODEL=jina-reranker-v3
RERANK_API_KEY=your_rerank_api_key
```

## Notes

- When the Embedding key is not configured, semantic retrieval auto-falls back to BM25 (still usable, but weaker than vector retrieval).
- It is recommended to configure `${PROJECT_ROOT}/.env` per book to avoid config bleed between projects.
- The Embedding and Rerank models can be swapped for any OpenAI-compatible API.
