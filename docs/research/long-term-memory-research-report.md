# Long-Term Memory: Papers and Project Research Report

## Document Goal

This document summarizes representative papers, benchmarks, and open-source projects in the LLM long-term memory direction, focusing on four questions:

- What exactly is the long-term memory problem solving?
- What are the mainstream technical routes in this field over the past two years?
- Which projects have achieved strong engineering landing?
- What capabilities are most worth borrowing for the current `webnovel-writer`?

Notes:

- This report prioritizes paper originals, arXiv pages, and official project repos.
- The report is not an exhaustive survey, but an engineering investigation oriented to architecture decisions.
- As of the latest search, references up to March 2026 are covered.

## One-Line Conclusion

The long-term memory direction has clearly formed three main lines:

1. `External memory + retrieval`: store history externally, recall on demand.
2. `Layered memory + orchestration`: manage recent context, historical evidence, and long-term summaries in layers.
3. `Graph structure / temporal memory`: use knowledge graphs or temporal graphs to handle fact updates, relationship changes, and temporal reasoning.

What is most directly useful to our project is not "a bigger context", but:

- an independent long-term summary layer
- a unified memory orchestration layer
- fact-update-oriented state management

## Why Long-Term Memory Remains a Separate Problem

Representative benchmarks all show the same thing:

- Simply increasing the context window does not stably solve long-term memory.
- Models still degrade easily on multi-session, multi-time-point, fact-update, cross-chapter integration.
- A memory system's core is not just "store", but also "write, compress, retrieve, update, conflict-adjudicate".

This is repeatedly validated in the following benchmarks:

- `LoCoMo`
- `LongMemEval`
- `BEAM`

## Evaluation Benchmarks

### 1. LoCoMo

Paper:

- `Evaluating Very Long-Term Conversational Memory of LLM Agents`
- arXiv:2402.17753
- Link: <https://arxiv.org/abs/2402.17753>

Key points:

- Dataset focuses on "ultra-long conversational memory"
- Average ~`300 turns` per dialogue
- Average ~`9K tokens`
- Covers up to `35 sessions`
- Evaluates QA, event summarization, multimodal dialogue generation

Value:

- Common benchmark many later memory systems compare against
- Emphasizes multi-turn conversation and long-term continuity, not just single-document retrieval

Source: LoCoMo paper abstract page <https://arxiv.org/abs/2402.17753>

### 2. LongMemEval

Paper:

- `LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory`
- arXiv:2410.10813
- Link: <https://arxiv.org/abs/2410.10813>

Key points:

- Explicitly splits five long-term memory capabilities:
  - information extraction
  - multi-session reasoning
  - temporal reasoning
  - knowledge update
  - refusal to answer
- Contains `500` carefully constructed questions
- The paper notes commercial assistants and long-context models show ~`30%` accuracy drop on sustained interaction

Value:

- Closer to real assistant scenarios than pure "recall rate"
- Very suitable for measuring "fact update" and "cross-session reasoning"

Source: LongMemEval paper abstract page <https://arxiv.org/abs/2410.10813>

### 3. BEAM

Paper:

- `Beyond a Million Tokens: Benchmarking and Enhancing Long-Term Memory in LLMs`
- arXiv:2510.27246
- Link: <https://arxiv.org/abs/2510.27246>

Key points:

- Generates coherent dialogue up to `10M tokens`
- Builds `100` dialogue segments and `2000` validation questions
- Simultaneously proposes the `LIGHT` memory framework
- Authors report LIGHT improves `3.5% - 12.69%` over strong baselines on average

Value:

- More clearly separates "ultra-long context" from "long-term memory"
- Very valuable for a long-form creative system like ours

Source: BEAM/LIGHT paper abstract page <https://arxiv.org/abs/2510.27246>

## Representative Papers

### A. Early external-memory route

#### MemoryBank

- Paper: `MemoryBank: Enhancing Large Language Models with Long-Term Memory`
- arXiv:2305.10250
- Link: <https://arxiv.org/abs/2305.10250>

Core idea:

- Turn conversation history into external memory
- Retrieve relevant memory to participate in answering
- Introduce a "forgetting curve"-like update mechanism
- Emphasize user profile and long-term companion-style interaction

Significance:

- Early proposal that "memory is not pure archive, but must update and forget"
- Fits persona, companion, personalization scenarios

Limitations:

- Leans toward conversational companionship
- Relatively early engineering structure, insufficient abstraction granularity

#### LongMem

- Paper: `Augmenting Language Models with Long-Term Memory`
- arXiv:2306.07174
- Link: <https://arxiv.org/abs/2306.07174>

Core idea:

- Freeze the backbone LLM as a memory encoder
- Introduce a retriever/reader side-network
- Cache long-term context as external memory

Significance:

- Represents the "model-architecture-level long-term memory" route
- Not just prompt engineering, but explicitly introduces a memory module

Limitations:

- For a plugin-style engineering system like our current project, less reusable than external-storage solutions

### B. Layered memory and virtual-context route

#### MemGPT

- Paper: `MemGPT: Towards LLMs as Operating Systems`
- arXiv:2310.08560
- Link: <https://arxiv.org/abs/2310.08560>

Core idea:

- View the LLM as the "application layer"
- Through OS-like virtual memory management, switch different memory layers between context and external storage
- Manage history beyond the window with memory tiers and control flow

Significance:

- Key representative of the "layered memory orchestration" route
- Emphasizes memory paging, layered storage, self-management

Limitations:

- Leans agent runtime
- Directly copying into a novel-writing system is costly

#### LIGHT

- Paper: `Beyond a Million Tokens: Benchmarking and Enhancing Long-Term Memory in LLMs`
- arXiv:2510.27246
- Link: <https://arxiv.org/abs/2510.27246>

Core idea:

- Explicitly split into three layers:
  - `episodic memory`
  - `working memory`
  - `scratchpad`
- Combine the three with a unified orchestrator

Significance:

- Closest to our project's current improvement direction
- Very suitable for "long-form writing context"

Limitations:

- Still fairly new research
- More like an engineering prototype, not a ready-made platform

### C. Productionized memory-layer route

#### Mem0

- Paper: `Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory`
- arXiv:2504.19413
- Link: <https://arxiv.org/abs/2504.19413>
- Official repo: <https://github.com/mem0ai/mem0>

Core idea:

- Dynamically extract salient info from conversations
- Do memory consolidation
- Prioritize refined memory over full history at retrieval
- Also has a graph-based variant

Officially claims:

- `+26%` over OpenAI Memory on LoCoMo
- Lower latency and token cost than full-context

Engineering value:

- Strongly emphasizes production metrics: latency, token cost, SDK access
- Representative project for "memory-layer productization"

Limitations:

- More suited to general agents/assistants
- Still needs customization for structured novel-plot state

Source:

- Paper abstract page <https://arxiv.org/abs/2504.19413>
- Official repo README <https://github.com/mem0ai/mem0>

#### Zep

- Paper: `Zep: A Temporal Knowledge Graph Architecture for Agent Memory`
- arXiv:2501.13956
- Link: <https://arxiv.org/abs/2501.13956>

Core idea:

- Use `Graphiti` as a temporal knowledge-graph engine
- Fuse conversation and business data into a history-traceable temporal graph
- Emphasize dynamic knowledge integration, historical-relationship maintenance, low-latency retrieval

Paper reports:

- Outperforms MemGPT on DMR
- Up to `18.5%` improvement on LongMemEval
- `90%` latency reduction vs baseline

Engineering value:

- Very suitable for scenarios where "facts change, relationships change, time has strong semantics"
- Very relevant for novel problems like character relationships, faction changes, setting revisions

Source: Zep paper abstract page <https://arxiv.org/abs/2501.13956>

#### MIRIX

- Paper: `MIRIX: Multi-Agent Memory System for LLM-Based Agents`
- arXiv:2507.07957
- Link: <https://arxiv.org/abs/2507.07957>

Core idea:

- Design six memory types:
  - Core
  - Episodic
  - Semantic
  - Procedural
  - Resource Memory
  - Knowledge Vault
- Use multi-agent collaboration to manage updates and retrieval
- Extend to multimodal memory

Significance:

- Shows the trend of "memory division continuing to refine"
- Proves future memory systems need not only three layers

Limitations:

- More complex architecture
- Valuable as reference for the current project, but not for direct stage-1 introduction

Source: MIRIX paper abstract page <https://arxiv.org/abs/2507.07957>

## Representative Open-Source Projects

### 1. Letta

- Repo: <https://github.com/letta-ai/letta>
- Note: the original MemGPT project has merged into Letta

Official positioning:

- `stateful agents`
- Emphasize agents persisting, learning, self-improving across sessions

Points of interest:

- Long-lived agents
- memory blocks
- persistent agent runtime

Inspiration for us:

- Suitable as reference for a "long-lived creative Agent"
- But it is more like a complete agent platform, not suitable to embed directly into the current plugin architecture

Source:

- Letta repo README <https://github.com/letta-ai/letta>
- Official note <https://www.letta.com/blog/memgpt-and-letta>

### 2. Mem0

- Repo: <https://github.com/mem0ai/mem0>

Official positioning:

- `Universal memory layer for AI Agents`

Points of interest:

- High SDK maturity
- Supports self-hosted and managed
- Emphasizes multi-layer memory, user preferences, session and agent state

Inspiration for us:

- Very suitable as engineering reference for an "independent memory layer"
- Especially good to study how it does API, access layer, and memory-extraction flow

Source: Mem0 official repo README <https://github.com/mem0ai/mem0>

### 3. Graphiti

- Repo: <https://github.com/getzep/graphiti>

Official positioning:

- `Build Real-Time Knowledge Graphs for AI Agents`

Features:

- Temporal knowledge graph
- Supports entities, fact relationships, raw episodes, ontology
- Suitable for agent memory in dynamic environments

Inspiration for us:

- Very suitable for character relationships, faction structure, event timeline
- If we later want a "plot knowledge graph", Graphiti/Zep is the most worth studying

Source: Graphiti official repo README <https://github.com/getzep/graphiti>

## Research Trend Summary

### Trend 1: From "long context" to "memory system"

The clearest conclusion in the past two years:

- Long context is not long-term memory
- Truly effective solutions do external memory, structured extraction, layered orchestration

### Trend 2: From "retrieve fragments" to "memory write and update"

Early systems focused on:

- how to retrieve history

Recent focus has become:

- what to write to memory
- when to merge
- when to mark expired
- how to adjudicate on conflict

### Trend 3: From "flat vector store" to "graph structure and temporal structure"

Beyond pure vector retrieval, more systems emphasize:

- entity / relation
- temporal validity
- provenance
- update / invalidation

This is critical for any system where "facts change".

### Trend 4: Production systems start caring about cost and latency

Projects like Mem0 and Zep no longer only talk accuracy, but simultaneously emphasize:

- p95 latency
- token cost
- developer integration cost
- managed hosting and observability

## Most Useful Conclusions for the Current Project

### The most worth borrowing is not one project, but three capability classes

#### 1. LIGHT's layered idea

The core abstraction still best suited to our current project is:

- `working memory`
- `episodic memory`
- `scratchpad`

Reason:

- We already have working and episodic foundations
- What we most lack is precisely the scratchpad

#### 2. Zep/Graphiti's temporal fact handling

Especially important for novel systems:

- The same character state changes
- The same relationship evolves
- The same setting may be revised

So vector retrieval alone is not enough; fact state and temporal semantics are mandatory.

#### 3. Mem0's engineering landing

Mem0 is very worth borrowing for:

- independent memory layer
- clear SDK/interface
- production focus on latency and token cost

This helps us make long-term memory an independent module.

## Mapping Suggestions for `webnovel-writer`

### Parts to absorb directly

- LIGHT: three-layer memory structure
- Mem0: independent memory-layer design
- Zep/Graphiti: relationship and timeline modeling

### Parts not recommended to copy directly

- Letta: complete stateful agent platform, too large
- MIRIX: too fine-grained classification, too heavy for stage 1
- LongMem: more model-architecture-level change, not suited to current plugin engineering

## My Priority Ranking

If ranked by "benefit to current project / retrofit cost", I suggest prioritizing:

1. `LIGHT`
2. `Mem0`
3. `Zep / Graphiti`
4. `MemGPT / Letta`
5. `MIRIX`
6. `MemoryBank`
7. `LongMem`

## Conclusion

The long-term memory direction is now very clear:

- The context window is only infrastructure, not the final answer
- What truly works is "layered memory + continuous write + smart retrieval + conflict management"

For the current project, the most realistic route is not to build a general agent platform, but:

- Keep existing `state.json / index.db / vectors.db`
- Add a `scratchpad` long-term summary layer
- Add a unified `memory orchestrator`

This route is most consistent with recent paper conclusions and best fits the current system foundation.

## Reference Links

- MemoryBank: <https://arxiv.org/abs/2305.10250>
- LongMem: <https://arxiv.org/abs/2306.07174>
- MemGPT: <https://arxiv.org/abs/2310.08560>
- LoCoMo: <https://arxiv.org/abs/2402.17753>
- LongMemEval: <https://arxiv.org/abs/2410.10813>
- Zep: <https://arxiv.org/abs/2501.13956>
- Mem0 paper: <https://arxiv.org/abs/2504.19413>
- Mem0 repo: <https://github.com/mem0ai/mem0>
- MIRIX: <https://arxiv.org/abs/2507.07957>
- Graphiti repo: <https://github.com/getzep/graphiti>
- Letta repo: <https://github.com/letta-ai/letta>
- Letta / MemGPT migration note: <https://www.letta.com/blog/memgpt-and-letta>
- LIGHT / BEAM: <https://arxiv.org/abs/2510.27246>
