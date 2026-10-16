# 択一の強化書（Word）から、アプリに取り込める一問一答のCSVを作る
# 使い方：py scripts/kijutsu/build_takuitsu_csv.py
#   読む：資格対策/成果物/ の 民法_強化書_H17-R6（300肢）・民法_強化書_図解版（判例・言い回し）・調査士法_強化書_図解版（言い回し）
#   書く：資格対策/成果物/StudyQuest_択一_民法_過去問300肢.csv・StudyQuest_択一_判例と言い回し.csv
import os, sys, re, csv
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from docx_blocks import blocks
SRC = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Desktop', '資格対策', '成果物')

def era(label):
    m = re.match(r'(平成|令和)(\d+|元)年度', label)
    n = '1' if m.group(2) == '元' else m.group(2)
    return ('H' if m.group(1) == '平成' else 'R') + n

def hdr(v): return [' '.join(c) for c in v[0]][:3]

# ── 民法 300肢（第5部 論点別） ──
B = blocks(os.path.join(SRC, '土地家屋調査士_択一式_民法_強化書_H17-R6_A5.docx'))
s5 = next(i for i, (t, v) in enumerate(B) if t == 'p' and v.startswith('第5部　論点別'))
e5 = next(i for i, (t, v) in enumerate(B) if i > s5 and t == 'p' and v.startswith('第6部'))
probs = {}   # (era, 問) -> {topic, kind, lead, limbs:{肢:文}}
answers = {} # (era, 問, 肢) -> (答, [解説の行])
topic, mode, cur, lead = '', None, None, []
for t, v in B[s5:e5]:
    if t == 'p':
        m = re.match(r'^演習　論点(\d+)　(.+)$', v)
        if m: topic, mode, cur = m.group(2), 'ex', None; continue
        m = re.match(r'^解法　論点(\d+)　(.+)$', v)
        if m: topic, mode, cur = m.group(2), 'sol', None; continue
        m = re.match(r'^((?:平成|令和)(?:\d+|元)年度)　問(\d+)　+(.+)$', v)
        if m:
            cur = (era(m.group(1)), int(m.group(2)))
            if mode == 'ex':
                probs.setdefault(cur, {'topic': topic, 'label': m.group(1), 'kind': m.group(3).strip(), 'lead': [], 'limbs': {}})
            continue
        if mode == 'ex' and cur and not v.startswith('所要時間') and not re.match(r'^\d+問・\d+肢', v):
            probs[cur]['lead'].append(v)
    elif t == 't' and cur:
        h = hdr(v)
        if mode == 'ex' and h == ['肢', '記述', '○×']:
            for r in v[1:]:
                if r and r[0]: probs[cur]['limbs'][' '.join(r[0])] = ' '.join(r[1])
        elif mode == 'sol' and h == ['肢', '答', '解説']:
            for r in v[1:]:
                if r and r[0] and len(r) >= 3: answers[(cur[0], cur[1], ' '.join(r[0]))] = (' '.join(r[1]).strip(), r[2])

rows = []
for (e, q), p in sorted(probs.items(), key=lambda x: ((1988 if x[0][0][0] == 'H' else 2018) + int(x[0][0][1:]), x[0][1])):
    lead = ' '.join(l for l in p['lead'] if not re.search(r'組合せは、後記|どれか。?$', l)).strip()
    for limb, text in p['limbs'].items():
        a = answers.get((e, q, limb))
        if not a: continue
        mark, lines = a
        one = lines[0] if lines else ''
        body = [l for l in lines[1:] if not l.startswith('根拠')]
        base = [l.replace('根拠　', '') for l in lines[1:] if l.startswith('根拠')]
        qtext = f"民{e}-{q}{limb} " + (f"【前提：{lead}】" if lead else '') + text
        atext = f"{mark}　{one}" + (f"【解説】{' '.join(body)}" if body else '') + (f"【根拠】{'・'.join(base)}" if base else '')
        rows.append([qtext, atext, '20. 択一（民法・過去問）', f"論点：{p['topic']}"])
out1 = os.path.join(SRC, 'StudyQuest_択一_民法_過去問300肢.csv')
with open(out1, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['問題', '解答', '大ジャンル', 'サブジャンル']); w.writerows(rows)
print('民法300肢', len(rows), '／問題', len(probs))

# ── 判例と言い回し（民法の図解版・調査士法の図解版） ──
rows2, seen = [], set()
def take(fname, subject, genre):
    B = blocks(os.path.join(SRC, fname))
    sec = ''
    for t, v in B:
        if t == 'p':
            m = re.match(r'^論点(\d+)　(.+)$', v)
            if m: sec = m.group(2)
            continue
        h = hdr(v)
        if h == ['事案', '結論', '判例']:
            for r in v[1:]:
                if len(r) < 3 or not r[0]: continue
                case, concl, cite = ' '.join(r[0]), ' '.join(r[1]), ' '.join(r[2])
                k = ('判', case)
                if k in seen: continue
                seen.add(k)
                rows2.append([f"【判例・{subject}】{case}　→ どうなる？", f"{concl}（{cite}）" if cite else concl, genre, f"判例{('：' + sec) if sec else ''}"])
        elif h[:2] == ['問題文の言い回し', '正しくは']:
            for r in v[1:]:
                if len(r) < 2 or not r[0]: continue
                trap, right = ' '.join(r[0]), ' '.join(r[1])
                k = ('言', trap)
                if k in seen: continue
                seen.add(k)
                rows2.append([f"【ひっかけ・{subject}】次の言い回しは正しい？「{trap}」", f"×　正しくは「{right}」", genre, f"ひっかけの言い回し{('：' + sec) if sec else ''}"])
take('土地家屋調査士_択一式_民法_強化書_図解版_A5.docx', '民法', '20. 択一（民法・判例と言い回し）')
take('土地家屋調査士_択一式_民法_強化書_H17-R6_A5.docx', '民法', '20. 択一（民法・判例と言い回し）')
take('土地家屋調査士_択一式_調査士法_強化書_図解版_A5.docx', '調査士法', '21. 択一（調査士法・言い回し）')
out2 = os.path.join(SRC, 'StudyQuest_択一_判例と言い回し.csv')
with open(out2, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['問題', '解答', '大ジャンル', 'サブジャンル']); w.writerows(rows2)
print('判例と言い回し', len(rows2))
