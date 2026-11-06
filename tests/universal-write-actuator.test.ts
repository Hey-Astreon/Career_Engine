import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  universalWriteActuator,
  verifyFieldWritten,
  extractFailureSignature,
  writeNativeSetter,
  writeExecCommand,
  writeClipboardSimulation,
  writeSyntheticKeyboardEvents,
} from '@/lib/autopilot/universalWriteActuator';

function createMockElement(tagName = 'INPUT', type = 'text', initialValue = '') {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const classes = new Set<string>();

  const el: any = {
    tagName,
    type,
    value: initialValue,
    checked: false,
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
      [Symbol.iterator]: () => classes.values(),
    },
    addEventListener: vi.fn((evt: string, fn: any) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    }),
    dispatchEvent: vi.fn((evt: any) => {
      if (listeners[evt.type]) {
        listeners[evt.type].forEach(fn => fn(evt));
      }
      return true;
    }),
    focus: vi.fn(),
    select: vi.fn(),
  };

  el.ownerDocument = {
    activeElement: null,
    execCommand: vi.fn(),
  };

  return el;
}

describe('Phase 89: Self-Healing Universal Write Actuator', () => {
  describe('Proof-of-Write Auditor (verifyFieldWritten)', () => {
    it('verifies exact and trimmed text matches on input elements', () => {
      const input = createMockElement('INPUT', 'text', 'Roushan Kumar');
      expect(verifyFieldWritten(input, 'Roushan Kumar')).toBe(true);
      expect(verifyFieldWritten(input, 'roushan kumar')).toBe(true);
      expect(verifyFieldWritten(input, '  Roushan Kumar  ')).toBe(true);
    });

    it('verifies phone numbers regardless of formatting differences', () => {
      const input = createMockElement('INPUT', 'tel', '+91 94314-83512');
      expect(verifyFieldWritten(input, '9431483512', 'PHONE')).toBe(true);
      expect(verifyFieldWritten(input, '+919431483512', 'PHONE')).toBe(true);
    });

    it('verifies radio and checkbox checked states', () => {
      const radio = createMockElement('INPUT', 'radio');
      radio.checked = true;
      expect(verifyFieldWritten(radio, 'yes')).toBe(true);

      const checkbox = createMockElement('INPUT', 'checkbox');
      checkbox.checked = false;
      expect(verifyFieldWritten(checkbox, 'yes')).toBe(false);
      checkbox.checked = true;
      expect(verifyFieldWritten(checkbox, 'yes')).toBe(true);
      expect(verifyFieldWritten(checkbox, true)).toBe(true);
    });

    it('rejects empty or uncommitted inputs', () => {
      const input = createMockElement('INPUT', 'text', '');
      expect(verifyFieldWritten(input, 'Roushan')).toBe(false);
    });
  });

  describe('Tier 1: Native Property Setter (writeNativeSetter)', () => {
    it('writes value and clears React _valueTracker', () => {
      const input = createMockElement('INPUT', 'text', '');
      let trackerReset = false;
      input._valueTracker = {
        setValue: () => { trackerReset = true; }
      };

      writeNativeSetter(input, 'Patna');

      expect(input.value).toBe('Patna');
      expect(trackerReset).toBe(true);
      expect(input.dispatchEvent).toHaveBeenCalled();
    });

    it('writes values to TEXTAREA elements cleanly', () => {
      const textarea = createMockElement('TEXTAREA', '', '');
      writeNativeSetter(textarea, 'Engineered high-performance cloud applications.');
      expect(textarea.value).toBe('Engineered high-performance cloud applications.');
    });
  });

  describe('Tier 2: Focus + Selection + document.execCommand (writeExecCommand)', () => {
    it('calls execCommand insertText when available', () => {
      const input = createMockElement('INPUT', 'text', '');
      input.ownerDocument.execCommand = vi.fn().mockImplementation((command, _ui, val) => {
        if (command === 'insertText') {
          input.value = val;
          return true;
        }
        return false;
      });

      const res = writeExecCommand(input, 'Senior Software Developer');
      expect(input.ownerDocument.execCommand).toHaveBeenCalledWith('insertText', false, 'Senior Software Developer');
      expect(res).toBe(true);
      expect(input.value).toBe('Senior Software Developer');
    });
  });

  describe('Tier 3: Synthetic Clipboard Simulation (writeClipboardSimulation)', () => {
    it('dispatches paste event simulation', async () => {
      const input = createMockElement('INPUT', 'text', '');
      input.addEventListener('paste', () => {
        input.value = 'https://github.com/Hey-Astreon';
      });

      await writeClipboardSimulation(input, 'https://github.com/Hey-Astreon');
      expect(input.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('Tier 4: Granular Synthetic Key Events (writeSyntheticKeyboardEvents)', () => {
    it('dispatches key events and accumulates characters', () => {
      const input = createMockElement('INPUT', 'text', '');
      writeSyntheticKeyboardEvents(input, 'Amity');

      expect(input.value).toBe('Amity');
      expect(input.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('Master Actuator (universalWriteActuator)', () => {
    it('succeeds on Tier 1 when standard input allows native setter', async () => {
      const input = createMockElement('INPUT', 'text', '');
      const result = await universalWriteActuator(input, 'Ayushi Raj');

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(1);
      expect(result.strategyName).toBe('native_setter');
      expect(input.value).toBe('Ayushi Raj');
    });

    it('handles radio buttons and checkboxes directly', async () => {
      const radio = createMockElement('INPUT', 'radio');
      const res = await universalWriteActuator(radio, 'yes');

      expect(res.success).toBe(true);
      expect(radio.checked).toBe(true);
      expect(res.strategyUsed).toBe(1);
    });

    it('reports failure accurately when input rejects all values', async () => {
      const input = createMockElement('INPUT', 'text', '');
      // Freeze input value so it cannot be written
      Object.defineProperty(input, 'value', {
        get: () => '',
        set: () => {},
      });

      const res = await universalWriteActuator(input, 'Failing Value');
      expect(res.success).toBe(false);
      expect(res.strategyUsed).toBe(4);
      expect(res.error).toBeDefined();
    });
  });

  describe('Failure Signature Extractor (extractFailureSignature)', () => {
    it('detects React, React-ValueTracker, and Svelte markers', () => {
      const el = createMockElement('INPUT', 'email');
      el.id = 'target-input';
      el.name = 'email';
      el.classList.add('form-control');
      el.classList.add('svelte-1ab2c3');
      el.getAttribute = (attr: string) => attr === 'class' ? 'form-control svelte-1ab2c3' : null;
      el.__reactFiber$xyz = {};
      el._valueTracker = { setValue: () => {} };

      const sig = extractFailureSignature(el, 'EMAIL');

      expect(sig.tagName).toBe('INPUT');
      expect(sig.id).toBe('target-input');
      expect(sig.name).toBe('email');
      expect(sig.fieldType).toBe('EMAIL');
      expect(sig.framework).toContain('React');
      expect(sig.framework).toContain('React-ValueTracker');
      expect(sig.framework).toContain('Svelte');
    });
  });
});
