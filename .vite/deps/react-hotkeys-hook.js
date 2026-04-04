import { i as __toESM, t as require_react } from "./react-3_O8oni9.js";
import { t as require_jsx_runtime } from "./jsx-runtime-GjJA3eXS.js";
//#region node_modules/react-hotkeys-hook/dist/index.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var j = [
	"shift",
	"alt",
	"meta",
	"mod",
	"ctrl",
	"control"
], Q = {
	esc: "escape",
	return: "enter",
	left: "arrowleft",
	right: "arrowright",
	up: "arrowup",
	down: "arrowdown",
	ShiftLeft: "shift",
	ShiftRight: "shift",
	AltLeft: "alt",
	AltRight: "alt",
	MetaLeft: "meta",
	MetaRight: "meta",
	OSLeft: "meta",
	OSRight: "meta",
	ControlLeft: "ctrl",
	ControlRight: "ctrl"
};
function K(e) {
	return (Q[e.trim()] || e.trim()).toLowerCase().replace(/key|digit|numpad/, "");
}
function D(e) {
	return j.includes(e);
}
function H(e, r = ",") {
	return e.toLowerCase().split(r);
}
function P(e, r = "+", o = ">", i = !1, c, a) {
	let n = [], y = !1;
	e = e.trim(), e.includes(o) ? (y = !0, n = e.toLocaleLowerCase().split(o).map((f) => K(f))) : n = e.toLocaleLowerCase().split(r).map((f) => K(f));
	const u = {
		alt: n.includes("alt"),
		ctrl: n.includes("ctrl") || n.includes("control"),
		shift: n.includes("shift"),
		meta: n.includes("meta"),
		mod: n.includes("mod"),
		useKey: i
	}, l = n.filter((f) => !j.includes(f));
	return {
		...u,
		keys: l,
		description: c,
		isSequence: y,
		hotkey: e,
		metadata: a
	};
}
typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.code !== void 0 && _([K(e.code)]);
}), document.addEventListener("keyup", (e) => {
	e.code !== void 0 && I([K(e.code)]);
})), typeof window < "u" && (window.addEventListener("blur", () => {
	L.clear();
}), window.addEventListener("contextmenu", () => {
	setTimeout(() => {
		L.clear();
	}, 0);
}));
var L = /* @__PURE__ */ new Set();
function R(e) {
	return Array.isArray(e);
}
function U(e, r = ",") {
	return (R(e) ? e : e.split(r)).every((i) => L.has(i.trim().toLowerCase()));
}
function _(e) {
	const r = Array.isArray(e) ? e : [e];
	L.has("meta") && L.forEach((o) => {
		D(o) || L.delete(o.toLowerCase());
	}), r.forEach((o) => {
		L.add(o.toLowerCase());
	});
}
function I(e) {
	e === "meta" ? L.clear() : (Array.isArray(e) ? e : [e]).forEach((o) => {
		L.delete(o.toLowerCase());
	});
}
function V(e, r, o) {
	(typeof o == "function" && o(e, r) || o === !0) && e.preventDefault();
}
function X(e, r, o) {
	return typeof o == "function" ? o(e, r) : o === !0 || o === void 0;
}
var Y = [
	"input",
	"textarea",
	"select",
	"searchbox",
	"slider",
	"spinbutton",
	"menuitem",
	"menuitemcheckbox",
	"menuitemradio",
	"option",
	"radio",
	"textbox"
];
function Z(e) {
	return F(e, Y);
}
function F(e, r = !1) {
	const { target: o, composed: i } = e;
	let c, a;
	return ee(o) && i ? (c = e.composedPath()[0] && e.composedPath()[0].tagName, a = e.composedPath()[0] && e.composedPath()[0].role) : (c = o && o.tagName, a = o && o.role), R(r) ? !!(c && r && r.some((n) => n.toLowerCase() === c.toLowerCase() || n === a)) : !!(c && r && r);
}
function ee(e) {
	return !!e.tagName && !e.tagName.startsWith("-") && e.tagName.includes("-");
}
function te(e, r) {
	return e.length === 0 && r ? !1 : r ? e.some((o) => r.includes(o)) || e.includes("*") : !0;
}
var re = (e, r, o = !1) => {
	const { alt: i, meta: c, mod: a, shift: n, ctrl: y, keys: u, useKey: l } = r, { code: f, key: t, ctrlKey: d, metaKey: m, shiftKey: g, altKey: k } = e, p = K(f);
	if (l && u?.length === 1 && u.includes(t.toLowerCase())) return !0;
	if (!u?.includes(p) && ![
		"ctrl",
		"control",
		"unknown",
		"meta",
		"alt",
		"shift",
		"os"
	].includes(p)) return !1;
	if (!o) {
		if (i !== k && p !== "alt" || n !== g && p !== "shift") return !1;
		if (a) {
			if (!m && !d) return !1;
		} else if (c !== m && p !== "meta" && p !== "os" || y !== d && p !== "ctrl" && p !== "control") return !1;
	}
	return u && u.length === 1 && u.includes(p) ? !0 : u && u.length > 0 ? u.includes(p) ? U(u) : !1 : !u || u.length === 0;
}, $ = (0, import_react.createContext)(void 0), oe = () => (0, import_react.useContext)($);
function ne({ addHotkey: e, removeHotkey: r, children: o }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($.Provider, {
		value: {
			addHotkey: e,
			removeHotkey: r
		},
		children: o
	});
}
function x(e, r) {
	return e && r && typeof e == "object" && typeof r == "object" ? Object.keys(e).length === Object.keys(r).length && Object.keys(e).reduce((o, i) => o && x(e[i], r[i]), !0) : e === r;
}
var W = (0, import_react.createContext)({
	hotkeys: [],
	activeScopes: [],
	toggleScope: () => {},
	enableScope: () => {},
	disableScope: () => {}
}), se = () => (0, import_react.useContext)(W), de = ({ initiallyActiveScopes: e = ["*"], children: r }) => {
	const [o, i] = (0, import_react.useState)(e), [c, a] = (0, import_react.useState)([]), n = (0, import_react.useCallback)((t) => {
		i((d) => d.includes("*") ? [t] : Array.from(/* @__PURE__ */ new Set([...d, t])));
	}, []), y = (0, import_react.useCallback)((t) => {
		i((d) => d.filter((m) => m !== t));
	}, []), u = (0, import_react.useCallback)((t) => {
		i((d) => d.includes(t) ? d.filter((m) => m !== t) : d.includes("*") ? [t] : Array.from(/* @__PURE__ */ new Set([...d, t])));
	}, []), l = (0, import_react.useCallback)((t) => {
		a((d) => [...d, t]);
	}, []), f = (0, import_react.useCallback)((t) => {
		a((d) => d.filter((m) => !x(m, t)));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(W.Provider, {
		value: {
			activeScopes: o,
			hotkeys: c,
			enableScope: n,
			disableScope: y,
			toggleScope: u
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ne, {
			addHotkey: l,
			removeHotkey: f,
			children: r
		})
	});
};
function ie(e) {
	const r = (0, import_react.useRef)(void 0);
	return x(r.current, e) || (r.current = e), r.current;
}
var N = (e) => {
	e.stopPropagation(), e.preventDefault(), e.stopImmediatePropagation();
}, ce = typeof window < "u" ? import_react.useLayoutEffect : import_react.useEffect;
function fe(e, r, o, i) {
	const c = (0, import_react.useRef)(null), a = (0, import_react.useRef)(!1), n = Array.isArray(o) ? Array.isArray(i) ? void 0 : i : o, y = R(e) ? e.join(n?.delimiter) : e, u = Array.isArray(o) ? o : Array.isArray(i) ? i : void 0, l = (0, import_react.useCallback)(r, u ?? []), f = (0, import_react.useRef)(l);
	u ? f.current = l : f.current = r;
	const t = ie(n), { activeScopes: d } = se(), m = oe();
	return ce(() => {
		if (t?.enabled === !1 || !te(d, t?.scopes)) return;
		let g = [], k;
		const p = (s, B = !1) => {
			if (!(Z(s) && !F(s, t?.enableOnFormTags))) {
				if (c.current !== null) {
					const v = c.current.getRootNode();
					if ((v instanceof Document || v instanceof ShadowRoot) && v.activeElement !== c.current && !c.current.contains(v.activeElement)) {
						N(s);
						return;
					}
				}
				s.target?.isContentEditable && !t?.enableOnContentEditable || H(y, t?.delimiter).forEach((v) => {
					if (v.includes(t?.splitKey ?? "+") && v.includes(t?.sequenceSplitKey ?? ">")) {
						console.warn(`Hotkey ${v} contains both ${t?.splitKey ?? "+"} and ${t?.sequenceSplitKey ?? ">"} which is not supported.`);
						return;
					}
					const h = P(v, t?.splitKey, t?.sequenceSplitKey, t?.useKey, t?.description, t?.metadata);
					if (h.isSequence) {
						k = setTimeout(() => {
							g = [];
						}, t?.sequenceTimeoutMs ?? 1e3);
						const C = h.useKey ? s.key : K(s.code);
						if (D(C.toLowerCase())) return;
						g.push(C);
						if (C !== h.keys?.[g.length - 1]) {
							g = [], k && clearTimeout(k);
							return;
						}
						g.length === h.keys?.length && (f.current(s, h), k && clearTimeout(k), g = []);
					} else if (re(s, h, t?.ignoreModifiers) || h.keys?.includes("*")) {
						if (t?.ignoreEventWhen?.(s) || B && a.current) return;
						if (V(s, h, t?.preventDefault), !X(s, h, t?.enabled)) {
							N(s);
							return;
						}
						f.current(s, h), B || (a.current = !0);
					}
				});
			}
		}, O = (s) => {
			s.code !== void 0 && (_(K(s.code)), (t?.keydown === void 0 && t?.keyup !== !0 || t?.keydown) && p(s));
		}, q = (s) => {
			s.code !== void 0 && (I(K(s.code)), a.current = !1, t?.keyup && p(s, !0));
		}, E = c.current || n?.document || document;
		return E.addEventListener("keyup", q, n?.eventListenerOptions), E.addEventListener("keydown", O, n?.eventListenerOptions), m && H(y, t?.delimiter).forEach((s) => {
			m.addHotkey(P(s, t?.splitKey, t?.sequenceSplitKey, t?.useKey, t?.description, t?.metadata));
		}), () => {
			E.removeEventListener("keyup", q, n?.eventListenerOptions), E.removeEventListener("keydown", O, n?.eventListenerOptions), m && H(y, t?.delimiter).forEach((s) => {
				m.removeHotkey(P(s, t?.splitKey, t?.sequenceSplitKey, t?.useKey, t?.description, t?.metadata));
			}), g = [], k && clearTimeout(k);
		};
	}, [
		y,
		t,
		d
	]), c;
}
function le(e = !1) {
	const [r, o] = (0, import_react.useState)(/* @__PURE__ */ new Set()), [i, c] = (0, import_react.useState)(!1), a = (0, import_react.useCallback)((l) => {
		l.code !== void 0 && (l.preventDefault(), l.stopPropagation(), o((f) => {
			const t = new Set(f);
			return t.add(K(e ? l.key : l.code)), t;
		}));
	}, [e]), n = (0, import_react.useCallback)(() => {
		typeof document < "u" && (document.removeEventListener("keydown", a), c(!1));
	}, [a]);
	return [r, {
		start: (0, import_react.useCallback)(() => {
			o(/* @__PURE__ */ new Set()), typeof document < "u" && (n(), document.addEventListener("keydown", a), c(!0));
		}, [a, n]),
		stop: n,
		resetKeys: (0, import_react.useCallback)(() => {
			o(/* @__PURE__ */ new Set());
		}, []),
		isRecording: i
	}];
}
//#endregion
export { de as HotkeysProvider, U as isHotkeyPressed, fe as useHotkeys, se as useHotkeysContext, le as useRecordHotkeys };

//# sourceMappingURL=react-hotkeys-hook.js.map