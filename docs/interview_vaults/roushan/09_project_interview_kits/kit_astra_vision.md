# Project Interview Kit: Astra Vision
**Project:** Astra Vision – AI-Powered Developer Assistance Platform  
**Live Demo:** [astra-frontend-mrfinklbba-uc.a.run.app](https://astra-frontend-mrfinklbba-uc.a.run.app/)  
**GitHub:** [github.com/Hey-Astreon/Astra-Vision](https://github.com/Hey-Astreon/Astra-Vision)  
**Tech Stack:** React.js, FastAPI, Monaco Editor, ChromaDB, Tree-Sitter, Python, Node.js

---

## 1. Project Summary
Astra Vision is an AI developer assistance tool featuring repository-scale AST code graphing, semantic vector search, and isolated code execution sandboxing.

## 2. Technical Architecture
*   **AST Code Graphing:** Tree-Sitter compiler in Python parsing source files to extract function declarations, class hierarchies, and imports.
*   **Vector Search:** ChromaDB vector store indexing code symbol embeddings for fast semantic lookup.
*   **Subprocess Sandboxing:** Isolated Python execution environment using `subprocess.Popen`, overriding native import hooks to block OS filesystem/socket access.
*   **Frontend Editor:** Monaco Editor displaying inline compiler diagnostics (`MarkerSeverity`) and Mermaid.js AST diagrams.

## 3. Key Metrics
*   **Execution Isolation:** 100% sandboxed process boundary for untrusted code.
*   **Error Correlation:** Stack trace error parser mapping trace logs to source graphs with >90% accuracy.
