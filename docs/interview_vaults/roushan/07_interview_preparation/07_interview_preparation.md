# Interview Preparation Framework for Roushan Kumar

Comprehensive technical and behavioral interview preparation guide.

---

## 1. Core Technical Elevator Pitch (60 Seconds)
> "I’m a Systems Software Engineer specializing in backend REST services, database design, and AI-powered developer tooling. Across my projects and technical simulations, I focus on low-latency execution, clean software architecture, and test-driven development. I’ve built enterprise C#/.NET Web API controllers for CommBank simulations, zero-knowledge cryptographic password managers, Tree-Sitter AST code indexers in Python FastAPI, and AI financial platforms in TypeScript. I focus on building reliable, secure software backed by automated test suites."

---

## 2. Technical Core Deep Dives

### A. C# / .NET & MongoDB (CommBank Simulation)
*   **MongoDB Partial Updates:** Used `$set` update operators in MongoDB driver to update specific fields without overwriting root documents.
*   **xUnit & Moq:** Configured mock repository behaviors using `Mock<IRepository>` and verified method calls with `Verify()`.

### B. Bitwise Optimization & Heaps (Walmart Simulation)
*   **K-ary Max Heap Indexing:** In a K-ary heap, child indices for parent `$i$` with exponent `$k=2^p$` are calculated as `(i << p) + 1 + j`. Parent index is `(i - 1) >>> p`.

### C. Zero-Knowledge Cryptography (Alyra Lock)
*   **Web Crypto API:** Executed PBKDF2 key derivation (100,000 iterations) with SHA-256 and AES-GCM 256-bit encryption in the browser. Master password never leaves the client.

### D. Tree-Sitter AST & Sandbox Isolation (Astra Vision)
*   **Tree-Sitter Parsing:** Parsed source AST nodes to extract function names and namespaces into ChromaDB.
*   **Subprocess Sandboxing:** Isolated guest code execution via `subprocess.Popen`, overriding `sys.modules` and native import hooks to block OS filesystem/socket access.

---

## 3. Behavioral Framework (STAR Method)
Always structure answers as: **Situation → Task → Action → Result**.
Highlight quantitative metrics (e.g., 35% speedup, 100% test coverage, 200ms latency).
