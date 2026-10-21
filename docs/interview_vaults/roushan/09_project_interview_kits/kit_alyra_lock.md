# Project Interview Kit: Alyra Lock
**Project:** Alyra Lock – Secure Zero-Knowledge Password Manager  
**Live Demo:** [alyra-lock.vercel.app](https://alyra-lock.vercel.app/)  
**GitHub:** [github.com/Hey-Astreon/Zero-Knowledge-Password-Manager](https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager)  
**Tech Stack:** React.js, TypeScript, Node.js, Express.js, MongoDB, Web Crypto API

---

## 1. Project Summary
Alyra Lock is a zero-knowledge password management web application engineered to protect user credentials by executing cryptographic key derivation and encryption entirely on the client side.

## 2. Problem Statement
Traditional password managers often transmit master keys or unencrypted vault payloads to backend servers, creating high-risk single points of failure for data breaches.

## 3. Technical Architecture
*   **Client Encryption:** Web Crypto API executing AES-GCM (256-bit key size) encryption and PBKDF2 key derivation (100,000 iterations with salt) in the browser.
*   **Backend Sync API:** Express.js REST API providing JWT-authenticated endpoints for storing encrypted vault blobs in MongoDB.
*   **Zero-Knowledge Protocol:** The master password and raw derived keys never leave local browser memory.

## 4. Key Performance & Security Metrics
*   **Zero Knowledge:** 100% of master keys isolated on the client.
*   **Sync Latency:** Database read/write sync actions completed under 200ms.
*   **Security Verification:** Enforced strict CORS and secure HTTP headers to prevent XSS.

## 5. Common Interview Questions & Talking Points
*   *Q: How do you handle master password resets in zero-knowledge systems?*  
    *A: In true zero-knowledge systems, master passwords cannot be reset by the server. Emergency recovery kits require local recovery keys generated during vault creation.*
