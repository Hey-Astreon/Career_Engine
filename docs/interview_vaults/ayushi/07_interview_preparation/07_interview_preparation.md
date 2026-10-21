# Interview Preparation Master Checklist
**Goal:** Prepare for technical, architectural, and behavioral interview stages for global remote Software Engineer roles.

---

## 1. Coding & Technical Review (DSA / Frontend / Backend)

### Data Structures & Algorithms (DSA)
*   **Heaps / Priority Queues:** Review heap properties, especially K-ary / Max Heaps (reference: **Walmart Simulation**). Know how bitwise shift operators (e.g. `<<`, `>>>`) speed up index arithmetic:
    *   *Parent index:* `(i - 1) >>> shift`
    *   *Child index:* `(i << shift) + 1`
*   **Hash Maps / Sets:** Understand hash collisions, search complexity, and database key indexing.
*   **Graph Traversals:** Depth-First Search (DFS) and Breadth-First Search (BFS). Relevant for traversing semantic dependency imports and AST code nodes (reference: **Astra Vision**).

### Frontend Fundamentals (React / Electron)
*   **State Management:** Virtual DOM re-renders, React state hooks, Redux store middleware. Know how to minimize re-renders when binding heavy UI libraries (reference: Dragula optimization in **Shiptivity Simulation**).
*   **Desktop Environment Bounds:** Electron architecture (Main Process vs. Renderer Process), Inter-Process Communication (IPC), OS window security flags (`setContentProtection`).

### Backend Core Concepts
*   **API Design:** RESTful principles, JSON schemas, stateless session validation.
*   **Concurrency & Real-time Sockets:** WebSockets vs. Server-Sent Events (SSE). Telemetry streaming with non-blocking FastAPI loops (reference: **Axiom AI Gateway**).
*   **Database Transactions:** ACID properties. Atomic rank manipulation (e.g., Kanban card reordering) to prevent write-order unique constraint collisions in SQLite (reference: **Shiptivity Simulation**).

---

## 2. System Design & Architectural Concepts
Prepare to explain these core architectural decisions from your projects:

1.  **Low-Latency Caching (Redis):** How to cache API calls. (e.g. Axiom Gateway multiplexing models, caching identical requests with Redis key-value lookups to cut latency by **65%**).
2.  **Zero-Knowledge Encryption Flow:** 
    ```
    Browser: Master Pass -> PBKDF2 (100k Iterations) -> Derived Key -> AES-GCM Encrypts Vault -> Syncs Encrypted Payload -> Server DB
    ```
    (The server only ever sees the encrypted vault; keys are never transmitted).
3.  **Process Isolation & Security:** Mocking environment variables, overriding native Python/Node import bindings (`require()`) to intercept and throw permission exceptions on host filesystem access (`fs`, `os`).

---

## 3. High-Signal Behavioral Answers (Startups & Remote)

### "Tell me about yourself"
> "I’m an AI-Powered Full Stack Software Engineer specializing in building secure web applications, developer tools, and backend systems. I focus on shipping clean, highly-tested code with high autonomy. Over the past year, I’ve engineered Coco AI, an Electron desktop overlay that integrates real-time Deepgram speech transcription and sub-200ms Cerebras Llama streaming, and Astra Vision, an AST parsing code graph review system with automated self-healing sandboxes. I'm currently in my second year of my BCA at Amity University Noida. Because of my flexible virtual curriculum, I am seeking a global remote software engineering role or internship where I can take complete ownership of features and optimize codebase latency."

### "Why do you want to work at a startup?"
> "I thrive in high-ownership, high-velocity environments. In early-stage startups, every line of code has an immediate impact on the product roadmap and user experience. I enjoy translating abstract requirements into functional, secure software, iterating based on user feedback, and debugging configuration blocks. I'd rather build and ship functional tools than write reports."

### "How do you manage working remotely in a different timezone?"
> "Working remotely requires proactive, asynchronous communication and clear documentation. I establish a daily check-in routine, write self-documenting code, maintain rigorous test suites (aiming for 100% API coverage), and document my features clearly. I make it easy for team members in other timezones to review my pull requests and understand my design decisions without needing a synchronous meeting."
