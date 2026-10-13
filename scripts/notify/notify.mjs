// 毎日のお知らせ（通知）を送る。GitHub の自動実行（.github/workflows/notify.yml）が、決まった時刻に動かす
// ・Firebase の管理用の鍵（サービスアカウント）は GitHub の Secrets「FIREBASE_SERVICE_ACCOUNT」から受け取る（ファイルとして保存しない）
// ・userdata/{uid}/push/{端末id} = { token, enabled, hours:[7,12,20,22] } の端末に送る
// ・SLOT（7/12/20/22）はその回の時刻。FORCE=1 のときは時刻に関係なく全端末へ送る（ためし用）
import admin from "firebase-admin";

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
// 鍵をまだ預けていないあいだは、何もせずに終わる（失敗のお知らせメールが毎日届かないように）
if (!sa.project_id) { console.log("FIREBASE_SERVICE_ACCOUNT がまだ設定されていないので、通知は送りません"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// 日本時間の日付と時刻
const jst = new Date(Date.now() + 9 * 3600 * 1000);
const today = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
const code = today.slice(2).replace(/-/g, ""); // 回答日の記録 ah の形（YYMMDD）
const SLOT_BY_CRON = { "0 22 * * *": 7, "0 3 * * *": 12, "0 11 * * *": 20, "0 13 * * *": 22 };
const slot = Number(process.env.SLOT) || SLOT_BY_CRON[process.env.CRON || ""] || jst.getUTCHours();
const force = process.env.FORCE === "1";
console.log(`日本時間 ${today} の ${slot}時の回${force ? "（ためし：全端末へ）" : ""}`);

const daysUntil = (d) => Math.round((Date.parse(d) - Date.parse(today)) / 86400000);

async function messageFor(uid) {
  const banks = await db.collection(`userdata/${uid}/questionbanks`).get();
  let due = 0, fresh = 0, doneToday = 0;
  banks.forEach((b) => (b.data().questions || []).forEach((q) => {
    if (q.excluded) return;
    if (!q.sr_nextReview) fresh++; else if (q.sr_nextReview <= today) due++;
    if (Array.isArray(q.ah) && q.ah.some((h) => String(h).startsWith(code))) doneToday++;
  }));
  const st = ((await db.doc(`userdata/${uid}`).get()).data() || {}).state || {};
  const exams = (st.qualifications || []).filter((q) => !q.acquired && q.examDate && daysUntil(q.examDate) >= 0).map((q) => ({ name: q.name, d: daysUntil(q.examDate) })).sort((a, b) => a.d - b.d);
  const ex = exams[0];
  const title = slot <= 9 ? "おはようございます ☀" : slot <= 15 ? "ひと休みに、一問いかがですか" : "今日の仕上げの時間です";
  const parts = [];
  if (due > 0) parts.push(`今日の復習があと${due}問あります。`);
  else parts.push(fresh > 0 ? "今日の復習は終わっています。新しい問題に進みましょう。" : "今日の復習は終わっています。おつかれさまでした！");
  if (doneToday > 0 && slot >= 20) parts.push(`今日はもう${doneToday}問解きました。`);
  if (ex) parts.push(ex.d === 0 ? `今日は${ex.name}の試験日です。いってらっしゃい！` : `${ex.name}の試験まであと${ex.d}日。`);
  return { title, body: parts.join(" ") };
}

const snap = await db.collectionGroup("push").get();
const byUser = new Map();
snap.forEach((d) => {
  const v = d.data();
  if (!v.enabled || !v.token) return;
  if (!force && !(v.hours || []).includes(slot)) return;
  const uid = d.ref.parent.parent.id;
  if (!byUser.has(uid)) byUser.set(uid, []);
  byUser.get(uid).push({ ref: d.ref, token: v.token });
});
console.log(`送る相手：${byUser.size}人・${[...byUser.values()].reduce((a, l) => a + l.length, 0)}台`);

let sent = 0, removed = 0;
for (const [uid, devices] of byUser) {
  const m = await messageFor(uid);
  for (const dv of devices) {
    try {
      await admin.messaging().send({
        token: dv.token,
        data: { title: m.title, body: m.body, tag: "sq-daily", url: "https://yukiyu0358-web.github.io/studyquest/" },
        webpush: { headers: { Urgency: "high", TTL: "21600" } },
      });
      sent++;
    } catch (e) {
      const c = (e && e.code) || "";
      console.warn("送れませんでした：", c);
      // もう使えない宛先（アプリを消した・通知を切ったなど）は片付ける
      if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) { await dv.ref.update({ enabled: false, error: c }); removed++; }
    }
  }
}
console.log(`送信 ${sent}件・停止 ${removed}件`);
