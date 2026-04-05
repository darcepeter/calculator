import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Color palette (matches calculator.html) ────────────────────────
const BG       = '#1c1c1e';
const BTN_NUM  = '#1c1c1e';
const BTN_FUNC = '#2c2c2e';
const BTN_OP   = '#ff9f0a';
const BTN_OP_A = '#ffffff'; // active op bg (inverted)
const BTN_EQ   = '#ff9f0a';

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
}

const INIT: S = {
  display: '0', expr: '',
  pending: null, pval: null,
  fresh: true, equaled: false,
  lastOp: null, lastVal: null, activeOp: null,
};

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

export default function Calculator() {
  const [s, setS] = useState<S>(INIT);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const GAP = 12;
  const PAD = 12;
  // Circles: diameter determined by available width, 4 per row
  const btnSize = Math.floor((width - PAD * 2 - GAP * 3) / 4);
  const fontSize = Math.floor(btnSize * 0.4);

  function press(action: string, val?: string) {
    setS(prev => {
      const p = { ...prev };

      if (action === 'clear') return { ...INIT };

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

  const ROWS = [
    [
      { label: s.display === '0' && s.fresh && !s.pending ? 'AC' : 'C', action: 'clear', bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '+/−', action: 'sign', bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '%', action: 'percent', bg: BTN_FUNC, fg: '#fff', flex: 1 },
      { label: '÷', action: 'op', val: '÷', bg: BTN_OP, fg: '#fff', flex: 1 },
    ],
    [
      { label: '7', action: 'num', val: '7', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '8', action: 'num', val: '8', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '9', action: 'num', val: '9', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '×', action: 'op', val: '×', bg: BTN_OP, fg: '#fff', flex: 1 },
    ],
    [
      { label: '4', action: 'num', val: '4', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '5', action: 'num', val: '5', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '6', action: 'num', val: '6', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '−', action: 'op', val: '−', bg: BTN_OP, fg: '#fff', flex: 1 },
    ],
    [
      { label: '1', action: 'num', val: '1', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '2', action: 'num', val: '2', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '3', action: 'num', val: '3', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '+', action: 'op', val: '+', bg: BTN_OP, fg: '#fff', flex: 1 },
    ],
    [
      { label: '0', action: 'num', val: '0', bg: BTN_NUM, fg: '#fff', flex: 2 },
      { label: '.', action: 'dot', bg: BTN_NUM, fg: '#fff', flex: 1 },
      { label: '=', action: 'equals', bg: BTN_EQ, fg: '#fff', flex: 1 },
    ],
  ] as const;

  const displayFontSize = s.display.length > 9 ? btnSize * 0.38 : btnSize * 0.55;

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      {/* Display */}
      <View style={styles.display}>
        <Text style={styles.expr} numberOfLines={1}>{s.expr}</Text>
        <Text
          style={[styles.number, { fontSize: displayFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {s.display}
        </Text>
      </View>

      {/* Buttons */}
      <View style={[styles.grid, { padding: PAD, gap: GAP }]}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={[styles.row, { gap: GAP }]}>
            {row.map((btn) => {
              const isActive = btn.action === 'op' && s.activeOp === btn.val;
              const bg = isActive ? BTN_OP_A : btn.bg;
              const fg = isActive ? '#ff9f0a' : btn.fg;
              const w = btn.flex === 2 ? btnSize * 2 + GAP : btnSize;
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
  root:    { flex: 1 },
  display: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 12 },
  expr:    { color: '#9E9E9E', fontSize: 20, marginBottom: 4 },
  number:  { color: '#FFFFFF', fontWeight: '300', letterSpacing: -1 },
  grid:    { flexDirection: 'column' },
  row:     { flexDirection: 'row' },
  btn:     { alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '400' },
});
