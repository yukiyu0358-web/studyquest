import os, sys
from PIL import Image
sys.stdout.reconfigure(encoding='utf-8')
SRC = os.path.join(os.environ['USERPROFILE'], r'OneDrive\Desktop\資格対策\アプリ関係\資格の本棚')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "art", "shelf")
os.makedirs(OUT, exist_ok=True)
MAP = [('土地家屋調査士', 'chosashi'), ('第二級陸上特殊無線技士', 'rikutoku2'), ('第四級アマチュア無線技士', 'ama4'),
       ('行政書士', 'gyosei'), ('宅地建物取引士', 'takken'), ('技術士補', 'gishiho'), ('技術士', 'gishi'),
       ('２級建築士', 'kenchiku2'), ('１級建築士', 'kenchiku1'), ('２級土木施工管理技士', 'doboku2'),
       ('１級土木施工管理技士', 'doboku1'), ('司法書士', 'shiho'), ('測量士', 'sokuryo')]
# ファイル名が「表紙.png・背表紙.png」でない資格
FILES = {'sokuryo': ('book_sokuryoshi_spine.png', 'book_sokuryoshi.png')}

def trim(im):
    a = im.getchannel('A').point(lambda v: 255 if v > 10 else 0)
    box = a.getbbox()
    return im.crop(box)

total = 0
for jp, key in MAP:
    fs = FILES.get(key, ('背表紙.png', '表紙.png'))
    for src, kind, size in ((fs[0], 'spine', ('h', 440)), (fs[1], 'cover', ('max', 560))):
        im = Image.open(os.path.join(SRC, jp, src)).convert('RGBA')
        im = trim(im)
        w, h = im.size
        if size[0] == 'h': s = size[1] / h
        else: s = size[1] / max(w, h)
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
        p = os.path.join(OUT, f'{key}-{kind}.webp')
        im.save(p, 'WEBP', quality=86, method=6)
        total += os.path.getsize(p)
        print(key, kind, im.size, os.path.getsize(p) // 1024, 'KB')
# 本棚の絵（透明なふちを切って、横900pxに）
im = trim(Image.open(os.path.join(SRC, 'bookshelf_dark_wood.png')).convert('RGBA'))
s = 900 / im.size[0]
im = im.resize((900, round(im.size[1] * s)), Image.LANCZOS)
p = os.path.join(OUT, 'bookshelf.webp'); im.save(p, 'WEBP', quality=86, method=6)
total += os.path.getsize(p); print('bookshelf', im.size, os.path.getsize(p) // 1024, 'KB')
print('total', total // 1024, 'KB')
