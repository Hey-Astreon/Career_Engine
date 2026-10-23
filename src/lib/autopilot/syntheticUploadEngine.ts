/**
 * syntheticUploadEngine.ts
 * -----------------------------------------------------------------------------
 * AstrePilot Pillar B: Zero-Click Synthetic Resume File Upload Engine
 *
 * Implements:
 * 1. Base64 to typed Uint8Array / Blob / File conversion
 * 2. W3C DataTransfer synthesis for input[type="file"]
 * 3. Synthetic DragEvent dispatching for React/Ashby/Workday dropzone containers
 * 4. ATS signal & keyword classification for file inputs and dropzone wrappers
 * -----------------------------------------------------------------------------
 */

export interface ResumeBinaryPayload {
  success: boolean;
  base64?: string;
  filename?: string;
  variant?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

export interface SyntheticUploadResult {
  success: boolean;
  filename?: string;
  size?: number;
  method?: "DATA_TRANSFER" | "DROP_EVENT" | "FALLBACK";
  error?: string;
}

export interface SyntheticTargetElement {
  tagName?: string;
  type?: string;
  files?: any;
  dispatchEvent(event: any): boolean;
  [key: string]: any;
}

export const RESUME_KEYWORDS: readonly string[] = [
  "resume",
  "cv",
  "curriculum",
  "curriculum vitae",
  "resume_file",
  "cv_file",
  "attach_resume",
  "upload_resume",
  "attach resume",
  "upload resume",
  "resume document",
  "curriculum_vitae",
  "resumecv",
];

/**
 * Converts a base64 encoded string to a Uint8Array byte buffer.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Strip optional data URI prefix if present (e.g. data:application/pdf;base64,)
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "").trim();

  // Handle environments with global atob (Browser) or Buffer (Node / Vitest)
  if (typeof atob === "function") {
    const binary = atob(cleanBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(cleanBase64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }

  throw new Error("No binary decoder available (neither atob nor Buffer found)");
}

/**
 * Converts a base64 encoded string to a W3C Blob.
 */
export function base64ToBlob(base64: string, mimeType = "application/pdf"): Blob {
  const bytes = base64ToUint8Array(base64);
  return new Blob([bytes as unknown as BlobPart], { type: mimeType });
}

/**
 * Synthesizes a W3C File object from binary base64 data.
 */
export function createSyntheticResumeFile(
  base64: string,
  filename = "Candidate_Resume.pdf",
  mimeType = "application/pdf"
): File {
  const blob = base64ToBlob(base64, mimeType);
  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

/**
 * Checks whether text signals (labels, placeholders, attribute names, aria labels)
 * contain affirmative resume / CV file upload indicators.
 */
export function isResumeSignal(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return RESUME_KEYWORDS.some((kw) => lower.includes(kw));
}

export interface InputSignalAttributes {
  tagName?: string;
  type?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  labelText?: string;
  className?: string;
  automationId?: string;
}

/**
 * Determines whether a given input or container element represents a Resume/CV upload target.
 */
export function isResumeUploadTarget(attrs: InputSignalAttributes): boolean {
  const isFile = attrs.type === "file" || (attrs.tagName === "INPUT" && attrs.type === "file");
  const isDropzone =
    (attrs.className && attrs.className.toLowerCase().includes("dropzone")) ||
    (attrs.automationId && attrs.automationId.toLowerCase().includes("upload")) ||
    (attrs.id && attrs.id.toLowerCase().includes("dropzone"));

  const combinedSignals = [
    attrs.id,
    attrs.name,
    attrs.ariaLabel,
    attrs.labelText,
    attrs.className,
    attrs.automationId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // If explicitly labelled as cover letter, transcript, or other document, reject
  if (
    combinedSignals.includes("cover_letter") ||
    combinedSignals.includes("cover letter") ||
    combinedSignals.includes("coverletter") ||
    combinedSignals.includes("transcript") ||
    combinedSignals.includes("portfolio_file")
  ) {
    return false;
  }

  // Affirmative resume match
  if (isResumeSignal(combinedSignals)) return true;

  // If it's a file input with no explicit anti-match, it often defaults to the resume
  if (isFile && !combinedSignals.includes("other") && !combinedSignals.includes("additional")) {
    return true;
  }

  return false;
}

/**
 * Synthetically populates an input[type="file"] using W3C DataTransfer and dispatches
 * input, change, and optional drag-and-drop events on surrounding dropzones.
 */
export function injectSyntheticFile(
  fileInput: SyntheticTargetElement,
  file: File,
  dropzoneContainer?: SyntheticTargetElement | null
): SyntheticUploadResult {
  try {
    if (!fileInput) {
      return { success: false, error: "Missing file input target" };
    }

    // 1. Construct W3C DataTransfer instance if in DOM, or fallback to file array assignment
    let dataTransfer: any = null;
    if (typeof DataTransfer !== "undefined") {
      try {
        dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      } catch (dtErr) {
        fileInput.files = [file];
      }
    } else {
      fileInput.files = [file];
    }

    // 2. Dispatch change & input events on input[type="file"]
    try {
      const inputEvt = typeof Event !== "undefined"
        ? new Event("input", { bubbles: true, cancelable: true })
        : { type: "input", bubbles: true, cancelable: true };
      const changeEvt = typeof Event !== "undefined"
        ? new Event("change", { bubbles: true, cancelable: true })
        : { type: "change", bubbles: true, cancelable: true };

      fileInput.dispatchEvent(inputEvt);
      fileInput.dispatchEvent(changeEvt);
    } catch (e) {
      // Fallback
    }

    // 3. Dispatch DragEvent on dropzone container if provided
    if (dropzoneContainer) {
      try {
        const dropPayload = {
          type: "drop",
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer || { files: [file] },
        };

        if (typeof DragEvent !== "undefined" && dataTransfer) {
          dropzoneContainer.dispatchEvent(
            new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer })
          );
          dropzoneContainer.dispatchEvent(
            new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer })
          );
          dropzoneContainer.dispatchEvent(
            new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer })
          );
        } else {
          dropzoneContainer.dispatchEvent(dropPayload);
        }
      } catch (dragErr) {
        try {
          dropzoneContainer.dispatchEvent({
            type: "drop",
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer || { files: [file] },
          });
        } catch (e) {}
      }
    }

    return {
      success: true,
      filename: file.name,
      size: file.size,
      method: dropzoneContainer ? "DROP_EVENT" : "DATA_TRANSFER",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Synthetic upload failed",
    };
  }
}
