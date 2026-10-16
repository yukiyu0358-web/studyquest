import zipfile, re
import xml.etree.ElementTree as ET
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def ptext(p):
    out = []
    for node in p.iter():
        if node.tag == W + 't' and node.text: out.append(node.text)
        elif node.tag == W + 'tab': out.append('　')
        elif node.tag == W + 'br': out.append('\n')
    return ''.join(out).strip()

def blocks(path):
    """docx を [('p', text) | ('t', [[cell_lines...], ...])] の並びに"""
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    body = root.find(W + 'body')
    res = []
    def walk(el):
        for ch in el:
            if ch.tag == W + 'p':
                t = ptext(ch)
                if t: res.append(('p', t))
            elif ch.tag == W + 'tbl':
                rows = []
                for tr in ch.findall(W + 'tr'):
                    cells = []
                    for tc in tr.findall(W + 'tc'):
                        lines = []
                        for p in tc.iter(W + 'p'):
                            t = ptext(p)
                            if t: lines.extend([x for x in t.split('\n') if x.strip()])
                        cells.append(lines)
                    rows.append(cells)
                # 1セルだけの表（囲み）は段落として扱う
                if all(len(r) == 1 for r in rows):
                    for r in rows:
                        for l in r[0]: res.append(('p', l))
                else:
                    res.append(('t', rows))
            elif ch.tag in (W + 'sdt', W + 'sdtContent'):
                walk(ch)
    walk(body)
    return res
