# STAR Story Library: Behavioral Interview Answers
**Goal:** Provide structured, high-impact responses using the STAR (Situation, Task, Action, Result) method, aligned with the AI-Powered Full Stack SWE brand.

---

## 1. Technical Complexity (Project: Coco AI)
*   **Theme:** Solving complex technical integrations, performance optimization, and OS-level limitations.

*   **Situation:** I wanted to build Coco AI, a desktop interview copilot overlay. The primary challenge was making the UI overlay completely invisible to videoconferencing software (Zoom, Teams, Google Meet) to ensure privacy, while streaming real-time speech transcription and AI completions under a strict latency budget.
*   **Task:** I had to implement screen-share invisibility, capture system loopback audio without installing virtual drivers, and orchestrate real-time APIs (Deepgram and Cerebras Llama-3.3) to keep perceived response times under 200ms.
*   **Action:** 
    1.  *Visual Stealth:* I developed the wrapper as an Electron application and leveraged the Win32 API window configuration, setting `setContentProtection(true)` in the main process to instruct the OS window compositor to exclude the overlay frame from screen capture streams.
    2.  *Audio Capture:* Instead of routing through virtual microphones (which trigger security alerts), I set up low-latency loopback audio capture via WASAPI to capture system output directly.
    3.  *API Latency:* Wired the WASAPI stream to a Deepgram WebSocket connection for live speech transcription, and piped transcription payloads to Cerebras's Llama-3.3 70B streaming API.
*   **Result:** The application achieved a sub-**200ms** perceived response latency for streaming AI answers. The overlay interface remained completely invisible in video calls during verification runs.

---

## 2. Ambiguity & Autonomy (Project: Astra Vision)
*   **Theme:** Designing a feature from scratch, working with complex abstractions, and handling security.

*   **Situation:** While building Astra Vision, a repository-scale code graphing tool, I needed a feature that could execute LLM-generated code corrections autonomously to confirm they resolved compiler warnings. However, running untrusted code on a developer's host machine poses severe security risks.
*   **Task:** I had to design a secure, isolated sandbox execution framework that could run JavaScript and Python scripts, mock system dependencies (like the DOM), and block unauthorized OS calls.
*   **Action:** 
    1.  *Process Isolation:* I built a Python-based sandbox controller that spawns code verification tasks inside isolated subprocesses.
    2.  *Module Interception:* To secure the execution, I wrote wrapper scripts that override Node's `require()` hook to raise error exceptions on host packages like `fs`, `child_process`, and `net`, and locked down Python's `builtins.open` and `import` to block `os` and network sockets.
    3.  *DOM Mocking:* I pre-pended mock variables (`window`, `document`, `localStorage`) to incoming code strings, allowing client-side scripts to run without reference errors.
*   **Result:** The sandbox safely validated generated code fixes. During testing, it blocked multiple attempts to access local files and successfully applied verified patches to the code editor.

---

## 3. Security-First Engineering (Project: Alyra Lock)
*   **Theme:** Cryptography, API security, and database constraints.

*   **Situation:** I built Alyra Lock, a secure zero-knowledge password manager. The engineering challenge was enabling users to sync their credentials across multiple clients without ever exposing the master password or plain-text vault to the server database.
*   **Task:** I had to design and implement client-side cryptographic workflows and sync routes that kept database read/write latencies under 200ms.
*   **Action:**
    1.  *Client-Side Encryption:* I utilized the native browser Web Crypto API to derive a cryptographic key from the user's master password using PBKDF2 with 100,000 iterations and a local salt.
    2.  *Symmetric Encryption:* I encrypted the vault payload using AES-GCM (256-bit) directly in the browser before transmission, ensuring key derivation remained offline.
    3.  *Sync Integration:* Engineered Express.js REST endpoints with JWT authorization header checks to handle the storage and sync of the encrypted payloads.
*   **Result:** The server received and stored only the encrypted payloads, maintaining a zero-knowledge structure. Sync transaction speeds remained under **200ms**.

---

## 4. Debugging Under Pressure (Technical Simulation: Shiptivity)
*   **Theme:** Troubleshooting environment configurations, build tools, and query constraints.

*   **Situation:** During a Kanban board simulation, the development server crashed repeatedly upon startup due to environment compatibility mismatches between Node.js 25.9's runtime and legacy Webpack/OpenSSL configurations.
*   **Task:** I had to fix the build environment bottleneck, restore compile processes, and implement database task-reordering priorities without causing unique constraint crashes.
*   **Action:**
    1.  *Build Infrastructure:* I identified that Node 25.9's default OpenSSL 3 provider blocked legacy cryptographic algorithms. I configured Webpack environment keys and added JavaScript polyfills for the networking parser layer.
    2.  *Query Transactions:* To handle Kanban drag-and-drop actions without database collisions, I refactored sequential SQL updates into a single atomic SQLite transaction using priority shift arithmetic.
*   **Result:** The build blocks were resolved, restoring local compilation. The transactional reordering logic eliminated task index collisions, cutting UI re-render cycles by **30%**.
