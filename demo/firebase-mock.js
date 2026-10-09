// ============ デモモード用：Firebase の代わり（見た目の確認専用） ============
// `npm.cmd run demo` のときだけ src/firebase.js の代わりに読み込まれる。
// 本物のクラウドには一切つながず、メモリの中だけでデータを持つ（再読込で元に戻る）。
import { DEMO_USER, DEMO_STATE, DEMO_BANKS } from "./demo-data.js";

const store = new Map(); // パス → データ
store.set(`userdata/${DEMO_USER.uid}`, { state: DEMO_STATE });
for (const b of DEMO_BANKS) store.set(`userdata/${DEMO_USER.uid}/questionbanks/${b.id}`, b);

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const snapOf = (path) => ({ id: path.split("/").pop(), exists: store.has(path), data: () => clone(store.get(path)), metadata: { hasPendingWrites: false, fromCache: true } });

function docRef(path) {
  return {
    id: path.split("/").pop(), path,
    collection: (name) => colRef(`${path}/${name}`),
    get: async () => snapOf(path),
    set: async (data, opts) => { store.set(path, opts && opts.merge ? { ...(store.get(path) || {}), ...clone(data) } : clone(data)); },
    update: async (data) => { store.set(path, { ...(store.get(path) || {}), ...clone(data) }); },
    delete: async () => { store.delete(path); },
    onSnapshot: () => () => {},
  };
}
function colRef(path) {
  const children = () => [...store.keys()].filter((k) => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/"));
  const q = {
    doc: (id) => docRef(`${path}/${id || Math.random().toString(36).slice(2)}`),
    get: async () => { const docs = children().map(snapOf); return { docs, empty: docs.length === 0, size: docs.length, forEach: (f) => docs.forEach(f) }; },
    onSnapshot: () => () => {},
    where: () => q, orderBy: () => q, limit: () => q,
  };
  return q;
}

export const fbAuth = {
  currentUser: DEMO_USER,
  onAuthStateChanged: (cb) => { setTimeout(() => cb(DEMO_USER), 0); return () => {}; },
  signInWithEmailAndPassword: async () => ({ user: DEMO_USER }),
  createUserWithEmailAndPassword: async () => ({ user: DEMO_USER }),
  signOut: async () => { alert("デモモードではログアウトできません"); },
};
export const fbDb = {
  collection: (name) => colRef(name),
  batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => r.set(d, o)), update: (r, d) => ops.push(() => r.update(d)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const op of ops) await op(); } }; },
  enableNetwork: async () => {},
  disableNetwork: async () => {},
};
export const fbFieldValue = {
  serverTimestamp: () => new Date().toISOString(),
  arrayUnion: (...items) => items,
  delete: () => undefined,
};
export default { auth: () => fbAuth, firestore: () => fbDb };
