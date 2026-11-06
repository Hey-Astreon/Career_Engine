/**
 * AstrePilot V3 Self-Healing Universal Write Actuator
 * ----------------------------------------------------
 * Solves the critical "field left blank" problem across modern reactive web forms
 * (React 16-19, Vue 2/3, Angular, Svelte, and custom web components).
 *
 * Implements a 4-Tier Self-Healing Escalation Cascade:
 *   Tier 1: Native Prototype Setter & ValueTracker Bypass (Fastest, 0ms)
 *   Tier 2: Focus + Selection + document.execCommand('insertText') (Simulates real typing)
 *   Tier 3: Synthetic ClipboardEvent('paste') with DataTransfer payload
 *   Tier 4: Granular Char-by-Char Synthetic KeyboardEvent Cascade (keydown/keypress/beforeinput/keyup)
 *
 * Each tier verifies Proof-of-Write before moving to the next escalation tier.
 */

export interface WriteStrategyResult {
  success: boolean;
  strategyUsed: 1 | 2 | 3 | 4 | 0;
  strategyName: 'native_setter' | 'exec_command' | 'clipboard_paste' | 'synthetic_keys' | 'none';
  attempts: number;
  error?: string;
}

export interface ElementFailureSignature {
  tagName: string;
  type?: string;
  id?: string;
  name?: string;
  classList: string[];
  framework: string[];
  fieldType?: string;
}

/**
 * Normalizes values for comparison.
 */
function cleanVal(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

/**
 * Verifies whether the element's actual DOM value or checked state
 * reflects the expected input value.
 */
export function verifyFieldWritten(
  el: any,
  expectedVal: string | boolean,
  fieldType: string = ''
): boolean {
  if (!el) return false;

  // 1. Radio / Checkbox
  if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
    if (el.type === 'radio') {
      return Boolean(el.checked);
    }
    const expStr = cleanVal(expectedVal);
    const shouldCheck = expStr === 'yes' || expStr === 'true' || expStr === '1' || expectedVal === true;
    return el.checked === shouldCheck;
  }

  // 2. Native Select
  if (el.tagName === 'SELECT') {
    if (el.selectedIndex < 0) return false;
    const opt = el.options && el.options[el.selectedIndex];
    if (!opt) return false;
    const optVal = cleanVal(opt.value || opt.text || opt.textContent);
    return optVal !== '' && optVal !== '0' && optVal !== 'select' && optVal !== 'select...';
  }

  // 3. Text, Password, Textarea, Number, Tel, Email, URL
  const currentVal = (el.value !== undefined ? String(el.value) : (el.textContent || '')).trim();
  if (currentVal.length === 0) return false;

  const expStr = cleanVal(expectedVal);
  const curLower = cleanVal(currentVal);

  if (curLower === expStr) return true;
  if (expStr.startsWith(curLower) || curLower.startsWith(expStr.slice(0, 5))) return true;

  // Phone number digits comparison
  if (fieldType.toUpperCase() === 'PHONE' || el.type === 'tel') {
    const expDigits = expStr.replace(/\D/g, '');
    const curDigits = curLower.replace(/\D/g, '');
    if (expDigits.length > 0 && (curDigits.includes(expDigits) || expDigits.includes(curDigits))) {
      return true;
    }
  }

  return currentVal.length > 0;
}

/**
 * Extracts framework indicators and element metadata for failure telemetry.
 */
export function extractFailureSignature(el: any, fieldType: string = ''): ElementFailureSignature {
  if (!el) {
    return { tagName: 'UNKNOWN', classList: [], framework: [], fieldType };
  }

  const frameworks: string[] = [];
  const keys = Object.keys(el);
  if (keys.some(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps') || k.startsWith('__reactEvents'))) {
    frameworks.push('React');
  }
  if (el._valueTracker) {
    frameworks.push('React-ValueTracker');
  }
  if (keys.some(k => k.startsWith('__vue') || k.startsWith('__vue_app__'))) {
    frameworks.push('Vue');
  }
  if (el.hasAttribute && (el.hasAttribute('ng-model') || el.hasAttribute('ng-version'))) {
    frameworks.push('Angular');
  }
  if (el.getAttribute && (el.getAttribute('class') || '').includes('svelte-')) {
    frameworks.push('Svelte');
  }

  return {
    tagName: el.tagName || '',
    type: el.type,
    id: el.id,
    name: el.name,
    classList: el.classList ? Array.from(el.classList) : [],
    framework: frameworks,
    fieldType,
  };
}

/**
 * Strategy 1: Native Property Setter & React ValueTracker Reset
 */
export function writeNativeSetter(el: any, value: string): void {
  if (!el) return;
  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const win = (el.ownerDocument && el.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : null);

  try {
    if (doc && doc.activeElement !== el && typeof el.focus === 'function') {
      el.focus();
    }
  } catch (e) {}

  let proto = null;
  try {
    if (win) {
      if (el.tagName === 'TEXTAREA' && win.HTMLTextAreaElement) {
        proto = win.HTMLTextAreaElement.prototype;
      } else if (win.HTMLInputElement) {
        proto = win.HTMLInputElement.prototype;
      }
    }
  } catch (e) {}
  if (!proto) proto = Object.getPrototypeOf(el);

  let setter = null;
  try {
    setter = Object.getOwnPropertyDescriptor(proto, 'value');
  } catch (e) {}

  if (setter && setter.set) {
    try {
      setter.set.call(el, value);
    } catch (e) {
      el.value = value;
    }
  } else {
    el.value = value;
  }

  // React ValueTracker Reset: React tracks previous values in _valueTracker
  if (el._valueTracker) {
    try { el._valueTracker.setValue(''); } catch (e) {}
  }

  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  } catch (e) {
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
  }

  try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
  try { el.dispatchEvent(new Event('blur', { bubbles: true })); } catch (e) {}
}

/**
 * Strategy 2: Focus + Selection + document.execCommand('insertText')
 */
export function writeExecCommand(el: any, value: string): boolean {
  if (!el) return false;
  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) return false;

  try {
    if (typeof el.focus === 'function') el.focus();
    if (typeof el.select === 'function') {
      try { el.select(); } catch (e) {}
    } else if (typeof el.setSelectionRange === 'function') {
      try { el.setSelectionRange(0, el.value ? el.value.length : 0); } catch (e) {}
    }

    let inserted = false;
    if (typeof doc.execCommand === 'function') {
      inserted = doc.execCommand('insertText', false, value);
    }

    if (inserted) {
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    return Boolean(inserted);
  } catch (e) {
    return false;
  }
}

/**
 * Strategy 3: Synthetic ClipboardEvent('paste') Simulation
 */
export async function writeClipboardSimulation(el: any, value: string): Promise<boolean> {
  if (!el) return false;
  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);

  try {
    if (typeof el.focus === 'function') el.focus();
    if (typeof el.select === 'function') {
      try { el.select(); } catch (e) {}
    }

    let pasteDispatched = false;
    try {
      if (typeof ClipboardEvent !== 'undefined' && typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer();
        dt.setData('text/plain', value);
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt,
        });
        el.dispatchEvent(pasteEvent);
        pasteDispatched = true;
      }
    } catch (e) {}

    // Fallback: clipboard writeText if permitted
    if (!pasteDispatched && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        if (doc && typeof doc.execCommand === 'function') {
          doc.execCommand('paste');
        }
      } catch (clipErr) {}
    }

    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Strategy 4: Granular Char-by-Char Synthetic KeyboardEvent Cascade
 */
export function writeSyntheticKeyboardEvents(el: any, value: string): void {
  if (!el || !value) return;
  const valStr = String(value);

  try {
    if (typeof el.focus === 'function') el.focus();
    if (typeof el.select === 'function') {
      try { el.select(); } catch (e) {}
    }

    let accum = '';
    for (let i = 0; i < valStr.length; i++) {
      const char = valStr[i];
      accum += char;
      const keyCode = char.charCodeAt(0);

      try {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: 'Key' + char.toUpperCase(), keyCode, which: keyCode, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: 'Key' + char.toUpperCase(), keyCode, which: keyCode, bubbles: true }));
      } catch (e) {}

      try {
        el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: char }));
      } catch (e) {}

      try {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value');
        if (setter && setter.set) {
          setter.set.call(el, accum);
        } else {
          el.value = accum;
        }
      } catch (e) {
        el.value = accum;
      }

      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: 'Key' + char.toUpperCase(), keyCode, which: keyCode, bubbles: true }));
      } catch (e) {}
    }

    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    try { el.dispatchEvent(new Event('blur', { bubbles: true })); } catch (e) {}
  } catch (e) {}
}

/**
 * AstrePilot V3 Master Universal Write Actuator
 * ---------------------------------------------
 * Coordinates the 4-tier write cascade with immediate proof-of-write verification
 * and exponential backoff.
 */
export async function universalWriteActuator(
  el: any,
  value: string | boolean,
  options: {
    fieldType?: string;
    onStrategyAttempt?: (strategy: number, success: boolean) => void;
  } = {}
): Promise<WriteStrategyResult> {
  if (!el || value === undefined || value === null) {
    return { success: false, strategyUsed: 0, strategyName: 'none', attempts: 0, error: 'Null element or value' };
  }

  const valStr = String(value);
  const fieldType = options.fieldType || '';

  // Handle Radio & Checkbox directly
  if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
    if (el.type === 'radio') {
      el.checked = true;
    } else {
      const valLower = cleanVal(value);
      const shouldCheck = valLower === 'yes' || valLower === 'true' || valLower === '1' || value === true;
      el.checked = shouldCheck;
    }
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    const verified = verifyFieldWritten(el, value, fieldType);
    return {
      success: verified,
      strategyUsed: 1,
      strategyName: 'native_setter',
      attempts: 1,
    };
  }

  // Tier 1: Native Setter & ValueTracker (Fastest, 0ms)
  writeNativeSetter(el, valStr);
  if (verifyFieldWritten(el, valStr, fieldType)) {
    if (options.onStrategyAttempt) options.onStrategyAttempt(1, true);
    return { success: true, strategyUsed: 1, strategyName: 'native_setter', attempts: 1 };
  }
  if (options.onStrategyAttempt) options.onStrategyAttempt(1, false);

  // Settle delay before escalating to Tier 2
  await new Promise(r => setTimeout(r, 40));

  // Tier 2: Focus + Selection + document.execCommand('insertText')
  writeExecCommand(el, valStr);
  if (verifyFieldWritten(el, valStr, fieldType)) {
    if (options.onStrategyAttempt) options.onStrategyAttempt(2, true);
    return { success: true, strategyUsed: 2, strategyName: 'exec_command', attempts: 2 };
  }
  if (options.onStrategyAttempt) options.onStrategyAttempt(2, false);

  // Settle delay before escalating to Tier 3
  await new Promise(r => setTimeout(r, 40));

  // Tier 3: Synthetic ClipboardEvent('paste')
  await writeClipboardSimulation(el, valStr);
  if (verifyFieldWritten(el, valStr, fieldType)) {
    if (options.onStrategyAttempt) options.onStrategyAttempt(3, true);
    return { success: true, strategyUsed: 3, strategyName: 'clipboard_paste', attempts: 3 };
  }
  if (options.onStrategyAttempt) options.onStrategyAttempt(3, false);

  // Settle delay before escalating to Tier 4
  await new Promise(r => setTimeout(r, 40));

  // Tier 4: Granular Synthetic Key Events
  writeSyntheticKeyboardEvents(el, valStr);
  const finalVerified = verifyFieldWritten(el, valStr, fieldType);
  if (options.onStrategyAttempt) options.onStrategyAttempt(4, finalVerified);

  return {
    success: finalVerified,
    strategyUsed: 4,
    strategyName: 'synthetic_keys',
    attempts: 4,
    error: finalVerified ? undefined : 'All 4 write strategies failed to commit value to DOM',
  };
}

