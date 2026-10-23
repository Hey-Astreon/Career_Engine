import { describe, it, expect, vi } from "vitest";
import {
  base64ToUint8Array,
  base64ToBlob,
  createSyntheticResumeFile,
  isResumeSignal,
  isResumeUploadTarget,
  injectSyntheticFile,
  SyntheticTargetElement,
} from "@/lib/autopilot/syntheticUploadEngine";
import { generateAutopilotToken, verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";

function createMockElement(tagName: string, type?: string): SyntheticTargetElement {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  return {
    tagName,
    type,
    files: null,
    addEventListener(event: string, handler: (e: any) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    dispatchEvent(event: any): boolean {
      const handlers = listeners[event.type || event] || [];
      handlers.forEach((h) => h(event));
      return true;
    },
  };
}

describe("Pillar B: Zero-Click Synthetic Resume File Upload Engine", () => {
  describe("Binary & Base64 Stream Conversion", () => {
    it("converts standard base64 string to Uint8Array byte buffer", () => {
      // "JVBERi0xLjQK" is standard "%PDF-1.4\n" in ASCII
      const samplePdfHeaderB64 = "JVBERi0xLjQK";
      const bytes = base64ToUint8Array(samplePdfHeaderB64);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(9);
      const text = String.fromCharCode(...bytes);
      expect(text).toBe("%PDF-1.4\n");
    });

    it("strips data URI prefixes cleanly before decoding", () => {
      const dataUri = "data:application/pdf;base64,JVBERi0xLjQK";
      const bytes = base64ToUint8Array(dataUri);
      expect(bytes.length).toBe(9);
      expect(String.fromCharCode(...bytes)).toBe("%PDF-1.4\n");
    });

    it("creates a Blob with application/pdf MIME type", () => {
      const b64 = "JVBERi0xLjQK";
      const blob = base64ToBlob(b64, "application/pdf");
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBe(9);
    });

    it("synthesizes a typed File object with metadata", () => {
      const b64 = "JVBERi0xLjQK";
      const file = createSyntheticResumeFile(b64, "Roushan_Kumar_Resume.pdf", "application/pdf");
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("Roushan_Kumar_Resume.pdf");
      expect(file.type).toBe("application/pdf");
      expect(file.size).toBe(9);
      expect(file.lastModified).toBeGreaterThan(0);
    });
  });

  describe("ATS Signal & Target Classification", () => {
    it("identifies resume keywords across common variations", () => {
      expect(isResumeSignal("Attach Resume")).toBe(true);
      expect(isResumeSignal("Upload CV")).toBe(true);
      expect(isResumeSignal("Curriculum Vitae document")).toBe(true);
      expect(isResumeSignal("resume_file")).toBe(true);
      expect(isResumeSignal("Please upload your resume/cv")).toBe(true);
      expect(isResumeSignal("Cover Letter")).toBe(false);
      expect(isResumeSignal("Official University Transcript")).toBe(false);
    });

    it("accurately classifies Greenhouse input[type='file']", () => {
      const target = isResumeUploadTarget({
        tagName: "INPUT",
        type: "file",
        id: "resume",
        name: "resume",
        labelText: "Attach Resume / CV",
      });
      expect(target).toBe(true);
    });

    it("accurately classifies Ashby & Workday upload dropzones", () => {
      const target = isResumeUploadTarget({
        tagName: "DIV",
        className: "ashby-dropzone file-dropzone",
        automationId: "file-upload-dropzone",
        labelText: "Drop resume or CV here",
      });
      expect(target).toBe(true);
    });

    it("strictly rejects non-resume file inputs (cover letter, transcript)", () => {
      const coverLetter = isResumeUploadTarget({
        tagName: "INPUT",
        type: "file",
        id: "cover_letter",
        name: "cover_letter",
        labelText: "Attach Cover Letter",
      });
      expect(coverLetter).toBe(false);

      const transcript = isResumeUploadTarget({
        tagName: "INPUT",
        type: "file",
        id: "transcript",
        name: "academic_transcript",
        labelText: "Upload College Transcript",
      });
      expect(transcript).toBe(false);
    });
  });

  describe("Synthetic File Injection & Event Dispatching", () => {
    it("synthetically populates input[type='file'] and fires input/change events", () => {
      const fileInput = createMockElement("INPUT", "file");
      fileInput.id = "resume-test";

      const inputSpy = vi.fn();
      const changeSpy = vi.fn();
      fileInput.addEventListener("input", inputSpy);
      fileInput.addEventListener("change", changeSpy);

      const file = new File([new Uint8Array([1, 2, 3])], "Test_Resume.pdf", {
        type: "application/pdf",
      });

      const result = injectSyntheticFile(fileInput, file);

      expect(result.success).toBe(true);
      expect(result.filename).toBe("Test_Resume.pdf");
      expect(fileInput.files).toBeDefined();
      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    it("dispatches drop event on enclosing dropzone container", () => {
      const dropzone = createMockElement("DIV");
      dropzone.className = "ashby-dropzone";

      const fileInput = createMockElement("INPUT", "file");

      const dropSpy = vi.fn();
      dropzone.addEventListener("drop", dropSpy);

      const file = new File([new Uint8Array([10, 20, 30])], "Injected_Resume.pdf", {
        type: "application/pdf",
      });

      const result = injectSyntheticFile(fileInput, file, dropzone);

      expect(result.success).toBe(true);
      expect(result.method).toBe("DROP_EVENT");
      expect(dropSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Token & Bearer Header Security", () => {
    it("extracts and verifies Bearer token from authorization headers", () => {
      const testUserId = "astre-founder-user-9926";
      const token = generateAutopilotToken(testUserId);

      const authHeader = `Bearer ${token}`;
      const extracted = extractBearerToken(authHeader);
      expect(extracted).toBe(token);

      const verifiedUserId = verifyAutopilotToken(extracted!);
      expect(verifiedUserId).toBe(testUserId);
    });

    it("returns null on malformed or absent authorization header", () => {
      expect(extractBearerToken(null)).toBeNull();
      expect(extractBearerToken("")).toBeNull();
      expect(extractBearerToken("Basic 123456")).toBeNull();
      expect(extractBearerToken("Bearer")).toBeNull();
    });
  });
});
