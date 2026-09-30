import axios from "axios";

export interface LLMResponse {
  text: string;
  provider: "groq" | "nvidia" | "cerebras" | "gemini" | "fallback";
}

/**
 * Strips markdown code blocks (```json ... ```) to guarantee pure JSON string output.
 */
function cleanJsonResponse(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  return text;
}

/**
 * Universal Multi-Provider LLM Router with zero-downtime automatic failover.
 * 
 * Priority Cascade (Oct 2026):
 *  1. Groq          → openai/gpt-oss-120b      (500+ t/s, ultra-fast inference)
 *  2. Gemini        → gemini-3.8-flash          (Google GA, Sept 2 2026, 1M ctx)
 *  3. Cerebras      → qwen-3.8-27b              (Current primary shared inference)
 *  4. NVIDIA NIM    → meta/llama-4-maverick     (Llama 4 series, vision+text)
 */
export async function queryMultiProviderLLM(
  systemPrompt: string,
  userPrompt: string,
  responseJson: boolean = true
): Promise<LLMResponse> {
  const groqKey = process.env.GROQ_API_KEY;
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try Groq (Ultra-Fast 500+ tokens/sec — openai/gpt-oss-120b)
  if (groqKey && !groqKey.includes("YOUR_")) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: responseJson ? { type: "json_object" } : undefined,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );
      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return { text: cleanJsonResponse(text), provider: "groq" };
    } catch (err) {
      console.warn("[LLM Router] Groq failed, falling over to Gemini:", (err as Error).message);
    }
  }

  // 2. Try Gemini 3.8 Flash (Google GA — Sept 2, 2026 — 1M token context, agentic workflows)
  if (geminiKey && !geminiKey.includes("YOUR_")) {
    try {
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: responseJson ? { responseMimeType: "application/json" } : undefined,
        },
        { timeout: 12000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { text: cleanJsonResponse(text), provider: "gemini" };
    } catch (err) {
      console.warn("[LLM Router] Gemini 3.8 Flash failed, falling over to Cerebras:", (err as Error).message);
    }
  }

  // 3. Try Cerebras (qwen-3.8-27b — Current primary shared inference model, Oct 2026)
  if (cerebrasKey && !cerebrasKey.includes("YOUR_")) {
    try {
      const res = await axios.post(
        "https://api.cerebras.ai/v1/chat/completions",
        {
          model: "qwen-3.8-27b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: responseJson ? { type: "json_object" } : undefined,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${cerebrasKey}`,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );
      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return { text: cleanJsonResponse(text), provider: "cerebras" };
    } catch (err) {
      console.warn("[LLM Router] Cerebras failed, falling over to NVIDIA NIM:", (err as Error).message);
    }
  }

  // 4. Try NVIDIA NIM (meta/llama-4-maverick — Llama 4 series, text+vision, Oct 2026)
  if (nvidiaKey && !nvidiaKey.includes("YOUR_")) {
    try {
      const res = await axios.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          model: "meta/llama-4-maverick",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        }
      );
      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return { text: cleanJsonResponse(text), provider: "nvidia" };
    } catch (err) {
      console.warn("[LLM Router] NVIDIA NIM failed:", (err as Error).message);
    }
  }

  return { text: "", provider: "fallback" };
}

