# 記述式の道場・本試験の計算のデータを作り直す（資格対策フォルダの Word 文書から）
# 使い方：py scripts/kijutsu/build_data.py
#   読む：C:/Users/<ユーザー名>/OneDrive/Desktop/資格対策/成果物/ の
#         土地計算マニュアル_1〜7_*_fx-JP500_A5.docx（土地20年の座標・キー操作・答え）
#         土地家屋調査士_記述式_土地_論点編_H17-R6_A5.docx・建物_攻略本_H17-R6_A5.docx（40年分の答案）
#   書く：public/data/pastcalc.json・kijutsu.json
import os, sys, re, json, glob, zipfile, html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Desktop', '資格対策', '成果物')
OUTDIR = os.path.join(HERE, '..', '..', 'public', 'data')

def docx_text(path):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8')
    x = re.sub(r'</w:tc>', '\t', x)
    t = re.sub(r'</w:p>', '\n', x); t = re.sub(r'<[^>]+>', '', t)
    t = html.unescape(t)
    return '\n'.join(l for l in t.splitlines() if l.strip())
CIRC = '①②③④⑤⑥⑦⑧⑨'

def era(y):
    m = re.match(r'(平成|令和)(\d+|元)年度', y)
    n = 1 if m.group(2) == '元' else int(m.group(2))
    return ('H' if m.group(1) == '平成' else 'R') + str(n), (1988 + n if m.group(1) == '平成' else 2018 + n)

def cplx(s):
    s = s.replace('−', '-').replace('＋', '+').replace(' ', '')
    m = re.match(r'^(-?[\d.]+)([+-])([\d.]+)i$', s)
    if not m: return None
    x = float(m.group(1)); y = float(m.group(3)) * (1 if m.group(2) == '+' else -1)
    return [x, y]

def keyseq(s):
    out = []
    for tok in re.split(r'(［[^］]*］)', s):
        if not tok: continue
        if tok.startswith('［'):
            out.append('[' + tok[1:-1] + ']')
        else:
            t = tok.strip()
            if t: out.append(t)
    return out

def num(s):
    return float(s.replace('−', '-'))

items = []
for f in sorted(glob.glob(os.path.join(SRC, '土地計算マニュアル_[1-7]_*_fx-JP500_A5.docx'))):
    cat = re.search(r'_\d_(.+?)_\d+年分', os.path.basename(f)).group(1)
    L = [l.strip().lstrip('\t').strip() for l in docx_text(f).split('\n')]
    L = [l for l in L if l]
    starts = [i for i, l in enumerate(L) if l.startswith('演習　') and '年度' in l]
    for si, s in enumerate(starts):
        end = starts[si + 1] if si + 1 < len(starts) else next(i for i in range(s, len(L)) if L[i].startswith('第8部'))
        B = L[s:end]
        title = B[0].replace('演習　', '')
        ylabel, purpose = title.split('　', 1)
        eid, yr = era(ylabel)
        it = {'id': eid, 'year': yr, 'label': ylabel, 'cat': cat, 'purpose': purpose, 'calcs': '', 'given': [], 'tasks': [], 'sections': [], 'answer': {'pts': [], 'areas': []}, 'note': ''}
        i = 1
        while i < len(B):
            l = B[i]
            if l.startswith('計算　') and not it['calcs']:
                it['calcs'] = l[3:]
            if l == '与件（電卓に入れる座標）':
                i += 4  # 変数 点 座標
                while i + 2 < len(B) and B[i] != '求めるもの':
                    v, p, c = B[i], B[i + 1], B[i + 2]
                    xy = cplx(c)
                    if xy is None: break
                    it['given'].append({'v': v, 'pt': p, 'x': xy[0], 'y': xy[1]})
                    i += 3
                continue
            if l == '求めるもの':
                i += 4
                while i + 1 < len(B) and not B[i].startswith('所要時間'):
                    it['tasks'].append({'pt': B[i], 'desc': B[i + 1]}); i += 2
                break
            i += 1
        # 解法
        sol = next(k for k in range(i, len(B)) if B[k].startswith(ylabel + '　') or B[k] == ylabel + '　' + purpose)
        k = sol + 1
        sec = None
        while k < len(B):
            l = B[k]
            if l.startswith('答え　'):
                a = l[3:]
                for m in re.finditer(r'([A-Za-z][A-Za-z0-9]*)\((−?[\d.]+), (−?[\d.]+)\)', a):
                    it['answer']['pts'].append({'pt': m.group(1), 'x': num(m.group(2)), 'y': num(m.group(3))})
                rest = re.sub(r'([A-Za-z][A-Za-z0-9]*)\((−?[\d.]+), (−?[\d.]+)\)', '', a)
                for m in re.finditer(r'([^\s／]+?)\s*＝?\s*([\d.]+)\s*㎡', rest):
                    lab = m.group(1).strip('　 ')
                    it['answer']['areas'].append({'label': lab, 'v': float(m.group(2))})
                k += 1; continue
            if l.startswith('注意　'):
                it['note'] = l[3:]; k += 1; continue
            if l and l[0] in CIRC:
                sec = {'title': l, 'vars': [], 'steps': [], 'notes': []}
                it['sections'].append(sec); k += 1; continue
            if sec is None: k += 1; continue
            if l == '変数' and k + 2 < len(B) and B[k + 1] == '入れる点':
                k += 3
                while k + 2 < len(B) and cplx(B[k + 2]) is not None:
                    sec['vars'].append({'v': B[k], 'pt': B[k + 1], 'val': B[k + 2]}); k += 3
                continue
            if l == '№' and B[k + 1] == '押すキー':
                k += 3
                while k + 1 < len(B) and re.fullmatch(r'\d+', B[k]):
                    keys = B[k + 1]
                    out = B[k + 2] if k + 2 < len(B) else ''
                    if re.fullmatch(r'\d+', out) or (out and out[0] in CIRC) or out.startswith('答え') or out.startswith('※') or out == '変数' or out == '№':
                        sec['steps'].append({'k': keyseq(keys), 'o': ''}); k += 2
                    else:
                        sec['steps'].append({'k': keyseq(keys), 'o': out}); k += 3
                continue
            sec['notes'].append(l); k += 1
        items.append(it)

items.sort(key=lambda x: x['year'])

for it in items:
    pts = {}
    def add(name, x, y):
        n = re.sub(r'（.*?）', '', name).replace('点', '') if name.endswith('点') or '（' in name else name
        n = n.strip()
        if n and n not in pts: pts[n] = [x, y]
    for g in it['given']: add(g['pt'], g['x'], g['y'])
    for sec in it['sections']:
        for s in sec['steps']:
            k = s['k']
            if len(k) == 6 and k[1] == '[+]' and k[3] == '[ENG]' and k[4] == '[STO]' and re.fullmatch(r'[\d.]+', k[0]) and re.fullmatch(r'[\d.]+', k[2]):
                m = re.match(r'^([A-Za-z0-9]+)点', s['o'])
                if m: add(m.group(1) + '点', float(k[0]), float(k[2]))
    it['pts'] = [{'n': k, 'x': v[0], 'y': v[1]} for k, v in pts.items()]
json.dump(items, open(os.path.join(OUTDIR, 'pastcalc.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('pastcalc', len(items))
from docx_blocks import blocks
HEAD = ['登記の目的', '申請書の骨格', '申請書の要点', '土地の表示欄', '地積更正の要否', 'この年の論点', '図面の注意点', 'つまずく点',
        '床面積 ― 測定基準と算入・不算入', '床面積 ― 求積', '電卓のキー操作', '原因及びその日付', 'この年に出た計算']

def era(y):
    m = re.match(r'(平成|令和)(\d+|元)年度', y)
    n = 1 if m.group(2) == '元' else int(m.group(2))
    return ('H' if m.group(1) == '平成' else 'R') + str(n), (1988 + n if m.group(1) == '平成' else 2018 + n)

def headof(v):
    for h in HEAD:
        if v == h or v.startswith(h + '　［') or (h == 'この年に出た計算' and v.startswith(h)):
            return h
    return None

def keystr(s):
    out = []
    for tok in re.split(r'(［[^］]*］)', s):
        if not tok: continue
        if tok.startswith('［'): out.append('[' + tok[1:-1] + ']')
        elif tok.strip(): out.append(tok.strip())
    return out

def parse(fname, kind):
    B = blocks(os.path.join(SRC, fname))
    on = False
    cat = ''
    years = []
    cur = None
    sec = None
    phase = None
    for t, v in B:
        if t == 'p' and v.startswith('第8部'): on = True; continue
        if t == 'p' and v.startswith('第9部'): break
        if not on: continue
        if t == 'p' and v.startswith('分類 '):
            m = re.match(r'分類 \d+　(.+?)　［', v)
            cat = m.group(1) if m else v
            cur = None; continue
        if t == 'p' and v.startswith('演習　') and '年度' in v:
            label, title = v[3:].split('　', 1)
            eid, yr = era(label)
            cur = {'id': ('L-' if kind == 'land' else 'B-') + eid, 'era': eid, 'kind': kind, 'year': yr, 'label': label, 'title': title, 'cat': cat,
                   'case': [], 'asks': [], 'decide': [], 'secs': []}
            years.append(cur); phase = 'pre'; sec = None; continue
        if cur is None: continue
        if t == 'p' and v.startswith('所要時間'): phase = 'between'; continue
        if phase == 'between' and t == 'p' and v.startswith(cur['label']): phase = 'sol'; continue
        if phase == 'pre':
            if t == 'p' and v in ('事案', '問い') or (t == 'p' and v.startswith('自分で決めること')):
                sec = v; continue
            if t == 'p' and v.startswith('次のページを見ずに'): continue
            if sec == '事案' and t == 'p': cur['case'].append(v)
            elif sec == '問い' and t == 't':
                for r in v[1:]:
                    if len(r) >= 2 and r[0]: cur['asks'].append([' '.join(r[0]), ' '.join(r[1])])
            elif sec and sec.startswith('自分で決めること') and t == 't':
                for r in v[1:]:
                    if r and r[0]: cur['decide'].append(' '.join(r[0]))
            continue
        if phase == 'sol':
            if t == 'p':
                h = headof(v)
                if h:
                    sec = {'h': h, 'items': []}
                    m = re.search(r'［(.+?)］', v)
                    if m: sec['note'] = m.group(1)
                    if h == 'この年に出た計算': sec['items'].append({'p': v.replace('この年に出た計算', '').strip('　 ')})
                    cur['secs'].append(sec); continue
                if sec is None: continue
                sec['items'].append({'p': v})
            else:
                if sec is None: continue
                rows = v
                hdr = [' '.join(c) for c in rows[0]]
                if hdr[:2] == ['№', '押すキー']:
                    sec['items'].append({'keys': [{'k': keystr(' '.join(r[1])), 'o': ' '.join(r[2]) if len(r) > 2 else ''} for r in rows[1:] if len(r) >= 2]})
                else:
                    sec['items'].append({'tbl': [[c for c in r] for r in rows]})
    return years

land = parse('土地家屋調査士_記述式_土地_論点編_H17-R6_A5.docx', 'land')
bldg = parse('土地家屋調査士_記述式_建物_攻略本_H17-R6_A5.docx', 'bldg')
allv = land + bldg
json.dump(allv, open(os.path.join(OUTDIR, 'kijutsu.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('kijutsu', len(land), len(bldg))

# ── 当日の確認カード（3冊の「早見表と当日の確認」） ──
def hayami(fname, title):
    B = blocks(os.path.join(SRC, fname))
    start = None
    for i, (t, v) in enumerate(B):
        if t == 'p' and re.match(r'^第\d+部　早見表と当日の確認', v): start = i
    if start is None: return None
    secs, cur = [], None
    for t, v in B[start + 1:]:
        if t == 'p' and (re.match(r'^\d+-\d+　', v) or v in ('式の早見表', 'キーの早見表', '試験当日の確認')):
            cur = {'h': re.sub(r'^\d+-\d+　', '', v), 'items': []}; secs.append(cur); continue
        if t == 'p' and (v.startswith('本書の数値は') or v.startswith('例題の数値は')): continue
        if cur is None: continue
        cur['items'].append({'p': v} if t == 'p' else {'tbl': v})
    return {'title': title, 'secs': secs}
cards = [c for c in [
    hayami('土地計算マニュアル_0_共通編_fx-JP500_A5.docx', '計算（fx-JP500）'),
    hayami('土地家屋調査士_記述式_土地_論点編_H17-R6_A5.docx', '土地（問21）'),
    hayami('土地家屋調査士_記述式_建物_攻略本_H17-R6_A5.docx', '建物（問22）'),
] if c]
json.dump(cards, open(os.path.join(OUTDIR, 'hayami.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('hayami', [(c['title'], [s['h'] for s in c['secs']]) for c in cards])
