import React, { useRef, useState } from 'react';
import {
  Pressable, StyleSheet, Text, TouchableOpacity,
  useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Palette (matches calculator.html) ─────────────────────────────
const BG       = '#1c1c1e';
const BTN_NUM  = '#1c1c1e';
const BTN_FUNC = '#2c2c2e';
const BTN_OP   = '#ff9f0a';
const BTN_OP_A = '#ffffff';
const BTN_EQ   = '#ff9f0a';
const ORANGE   = '#ff9f0a';

// ── Types ──────────────────────────────────────────────────────────
type Op = '+' | '−' | '×' | '÷' | null;

interface S {
  display: string;
  expr: string;
  pending: Op;
  pval: string | null;
  fresh: boolean;
  equaled: boolean;
  lastOp: Op;
  lastVal: string | null;
  activeOp: Op;
  // magic
  secretMode: boolean;
  forceLocked: boolean;
  forceNumber: string | null;
  armedMode: boolean;
  armedTaps: number;
  revealPending: boolean;
  revealBase: number | null;
  revealAddend: number | null;
}

const INIT: S = {
  display: '0', expr: '',
  pending: null, pval: null,
  fresh: true, equaled: false,
  lastOp: null, lastVal: null, activeOp: null,
  secretMode: false, forceLocked: false, forceNumber: null,
  armedMode: false, armedTaps: 0,
  revealPending: false, revealBase: null, revealAddend: null,
};

// ── Helpers ────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (!isFinite(n)) return 'Error';
  let s = parseFloat(n.toPrecision(12)).toString();
  if (s.length > 13) s = parseFloat(n.toExponential(6)).toString();
  return s;
}

function compute(a: string, op: Op, b: string): string {
  const fa = parseFloat(a), fb = parseFloat(b);
  if (op === '+') return fmt(fa + fb);
  if (op === '−') return fmt(fa - fb);
  if (op === '×') return fmt(fa * fb);
  if (op === '÷') return fb === 0 ? 'Error' : fmt(fa / fb);
  return b;
}

// ── Component ──────────────────────────────────────────────────────
export default function Calculator() {
  const [s, setS] = useState<S>(INIT);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const lastTap = useRef(0);

  const GAP      = 12;
  const PAD      = 12;
  const btnSize  = Math.floor((width - PAD * 2 - GAP * 3) / 4);
  const fontSize = Math.floor(btnSize * 0.4);

  // ── Button press handler ───────────────────────────────────────
  function press(action: string, val?: string) {
    setS(prev => {
      const p = { ...prev };

      // Armed mode: swallow all presses as countdown taps
      if (p.armedMode) {
        p.armedTaps++;
        if (p.armedTaps >= 3) {
          const base   = parseFloat(p.display) || 0;
          const target = parseFloat(p.forceNumber!);
          const addend = parseFloat((target - base).toPrecision(10));
          p.armedMode     = false;
          p.revealPending = true;
          p.revealBase    = base;
          p.revealAddend  = addend;
          p.expr          = base + ' +';
          p.display       = addend.toString();
          p.pending       = '+';
          p.pval          = base.toString();
          p.fresh         = true;
        }
        return p;
      }

      // Reveal pending: only = works
      if (p.revealPending) {
        if (action === 'equals') {
          p.revealPending = false;
          p.expr          = p.revealBase + ' + ' + p.revealAddend + ' =';
          p.display       = parseFloat(p.forceNumber!).toString();
          p.pending       = null;
          p.pval          = null;
          p.fresh         = true;
          p.equaled       = true;
        }
        return p;
      }

      // Secret mode: restricted input to set force number
      if (p.secretMode) {
        if (action === 'num') {
          if (p.fresh || p.display === '0') { p.display = val!; p.fresh = false; }
          else if (p.display.length < 12) p.display += val!;
        } else if (action === 'dot') {
          if (p.fresh) { p.display = '0.'; p.fresh = false; }
          else if (!p.display.includes('.')) p.display += '.';
        } else if (action === 'clear') {
          if (p.display !== '0' && !p.fresh) { p.display = '0'; p.fresh = true; }
          else {
            // exit without saving
            p.secretMode = false;
            p.expr = '';
          }
        } else if (action === 'equals') {
          const v = parseFloat(p.display);
          if (!isNaN(v) && p.display !== '0') {
            p.forceNumber = p.display;
            p.forceLocked = true;
            p.secretMode  = false;
            p.display     = '0';
            p.expr        = '';
            p.fresh       = true;
            p.equaled     = false;
            p.pending     = null;
            p.pval        = null;
          } else {
            p.secretMode = false;
            p.expr = '';
          }
        }
        return p;
      }

      // Normal calculator logic
      if (action === 'clear') {
        return {
          ...INIT,
          forceLocked: p.forceLocked,
          forceNumber: p.forceNumber,
        };
      }
      if (action === 'num') {
        p.activeOp = null;
        if (p.equaled) { p.display = val!; p.equaled = false; p.expr = ''; p.fresh = false; }
        else if (p.fresh || p.display === '0') { p.display = val!; p.fresh = false; }
        else if (p.display.replace(/[^0-9]/g, '').length < 12) p.display += val!;
        return p;
      }
      if (action === 'dot') {
        p.activeOp = null;
        if (p.fresh || p.equaled) { p.display = '0.'; p.fresh = false; p.equaled = false; }
        else if (!p.display.includes('.') && p.display.length < 13) p.display += '.';
        return p;
      }
      if (action === 'sign') {
        if (p.display !== 'Error') p.display = fmt(-parseFloat(p.display));
        return p;
      }
      if (action === 'percent') {
        if (p.display === 'Error') return p;
        if (p.pending === '+' || p.pending === '−')
          p.display = fmt(parseFloat(p.pval!) * parseFloat(p.display) / 100);
        else
          p.display = fmt(parseFloat(p.display) / 100);
        return p;
      }
      if (action === 'op') {
        const op = val as Op;
        p.activeOp = op;
        if (p.pending && !p.fresh && p.pval !== null) {
          const r = compute(p.pval, p.pending, p.display);
          p.display = r; p.pval = r;
        } else {
          p.pval = p.display;
        }
        p.pending = op; p.fresh = true; p.equaled = false;
        p.expr = p.pval + ' ' + op;
        p.lastOp = op; p.lastVal = p.display;
        return p;
      }
      if (action === 'equals') {
        p.activeOp = null;
        if (p.equaled && p.lastOp && p.lastVal !== null) {
          const r = compute(p.display, p.lastOp, p.lastVal);
          p.expr = p.display + ' ' + p.lastOp + ' ' + p.lastVal + ' =';
          p.display = r; p.fresh = true;
          return p;
        }
        if (p.pending && p.pval !== null) {
          p.lastOp = p.pending; p.lastVal = p.display;
          const r = compute(p.pval, p.pending, p.display);
          p.expr = p.pval + ' ' + p.pending + ' ' + p.display + ' =';
          p.display = r;
          p.pending = null; p.pval = null; p.fresh = true; p.equaled = true;
        }
        return p;
      }
      return p;
    });
  }

  // ── Display area interactions ──────────────────────────────────
  function onDisplayLongPress() {
   
    setS(prev => {
      if (prev.armedMode || prev.revealPending) return prev;
      return {
        ...prev,
        secretMode: true,
        display: '0',
        fresh: true,
        expr: prev.forceLocked ? ('Force: ' + prev.forceNumber) : 'Type number, press =',
      };
    });
  }

  function onDisplayTap() {
    setS(prev => {
      if (prev.secretMode) return prev;
      // In armed mode, a display tap counts as an armed tap
      if (prev.armedMode) {
        const p = { ...prev };
        p.armedTaps++;
        if (p.armedTaps >= 3) {
          const base   = parseFloat(p.display) || 0;
          const target = parseFloat(p.forceNumber!);
          const addend = parseFloat((target - base).toPrecision(10));
          p.armedMode     = false;
          p.revealPending = true;
          p.revealBase    = base;
          p.revealAddend  = addend;
          p.expr          = base + ' +';
          p.display       = addend.toString();
          p.pending       = '+';
          p.pval          = base.toString();
          p.fresh         = true;
        }
        return p;
      }
      if (prev.revealPending) return prev;
      // Double-tap to re-arm when force is locked
      const now = Date.now();
      if (now - lastTap.current < 320) {
        lastTap.current = 0;
        if (prev.forceLocked) {
          return { ...prev, armedMode: true, armedTaps: 0 };
        }
      } else {
        lastTap.current = now;
      }
      return prev;
    });
  }

  // ── Button rows ────────────────────────────────────────────────
  const clearLabel = s.display === '0' && s.fresh && !s.pending ? 'AC' : 'C';

  const ROWS = [
    [
      { label: s.secretMode ? 'C' : clearLabel, action: 'clear', bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '+/−', action: 'sign',    bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '%',   action: 'percent', bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '÷',   action: 'op', val: '÷', bg: BTN_OP, fg: '#fff', flex: 1 },
    ],
    [
      { label: '7', action: 'num', val: '7', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '8', action: 'num', val: '8', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '9', action: 'num', val: '9', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '×', action: 'op', val: '×', bg: BTN_OP,  fg: '#fff', flex: 1 },
    ],
    [
      { label: '4', action: 'num', val: '4', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '5', action: 'num', val: '5', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '6', action: 'num', val: '6', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '−', action: 'op', val: '−', bg: BTN_OP,  fg: '#fff', flex: 1 },
    ],
    [
      { label: '1', action: 'num', val: '1', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '2', action: 'num', val: '2', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '3', action: 'num', val: '3', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '+', action: 'op', val: '+', bg: BTN_OP,  fg: '#fff', flex: 1 },
    ],
    [
      { label: '0', action: 'num', val: '0', bg: BTN_NUM, fg: '#fff', flex: 2 },
      { label: '.', action: 'dot',           bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '=', action: 'equals',        bg: BTN_EQ,  fg: '#fff', flex: 1 },
    ],
  ] as const;

  const displayFontSize = s.display.length > 9 ? btnSize * 0.38 : btnSize * 0.55;
  const displayColor    = s.secretMode ? ORANGE : '#ffffff';

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingBottom: insets.bottom, paddingTop: insets.top }]}>

      {/* Display area — long-press to enter secret mode */}
      <Pressable
        style={styles.display}
        onLongPress={onDisplayLongPress}
        onPress={onDisplayTap}
        delayLongPress={800}
      >
        {/* "SET FORCE NUMBER" label */}
        {s.secretMode && (
          <Text style={styles.secretLabel}>SET FORCE NUMBER</Text>
        )}
        <Text style={styles.expr} numberOfLines={1}>{s.expr}</Text>
        <Text
          style={[styles.number, { fontSize: displayFontSize, color: displayColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {s.display}
        </Text>
      </Pressable>

      {/* Button grid */}
      <View style={[styles.grid, { padding: PAD, gap: GAP }]}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={[styles.row, { gap: GAP }]}>
            {row.map((btn) => {
              const isActive = btn.action === 'op' && s.activeOp === (btn as { val?: string }).val;
              const bg = isActive ? BTN_OP_A : btn.bg;
              const fg = isActive ? ORANGE : btn.fg;
              const w  = btn.flex === 2 ? btnSize * 2 + GAP : btnSize;
              return (
                <TouchableOpacity
                  key={btn.label}
                  onPress={() => press(btn.action, 'val' in btn ? btn.val : undefined)}
                  style={[
                    styles.btn,
                    { width: w, height: btnSize, borderRadius: btnSize / 2, backgroundColor: bg },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnText, { color: fg, fontSize }]}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  display:     { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 12 },
  secretLabel: { position: 'absolute', top: 12, left: 16, fontSize: 10, color: ORANGE, letterSpacing: 2, fontWeight: '700' },
  expr:        { color: '#888888', fontSize: 20, marginBottom: 4 },
  number:      { fontWeight: '300', letterSpacing: -1 },
  grid:        { flexDirection: 'column' },
  row:         { flexDirection: 'row' },
  btn:         { alignItems: 'center', justifyContent: 'center' },
  btnText:     { fontWeight: '400' },
});
