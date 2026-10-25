import re, json, sys
D=str.maketrans('۰۱۲۳۴۵۶۷۸۹','0123456789')
t=open('/mnt/user-data/uploads/attachment.txt',encoding='utf-8').read()
t=re.sub(r'^\[\d\d/\d\d/\d\d \d\d:\d\d [^\]]*\] ادمین سرمشق \| مشاوره فرهنگیان 🎓: ','',t,flags=re.M)
t=t.replace('\\.','.').replace('\\[','[').replace('\\]',']').replace('\\_','_')
qre=re.compile(r'^(?:###\s*)?([۰-۹]+)\s*[\.\-]\s*(.*)$')
items={}; cur=None; order=[]
def start(num,title,notes=False):
    global cur
    cur={'num':num,'q':title.strip(),'lines':[]}
    items.setdefault(num,[]).append(cur)
for line in t.split('\n'):
    s=line.strip()
    if not s or s=='.': 
        if cur: cur['lines'].append('')
        continue
    m=qre.match(s)
    if m and not s.startswith('### بخش'):
        start(int(m.group(1).translate(D)),m.group(2)); continue
    if s.startswith('###') or s.startswith('## '):
        h=s.lstrip('# ').strip()
        if h.startswith('نکات مهم برای مرور'):
            start(180.5,h)
        else: cur=None
        continue
    if cur: cur['lines'].append(s)
out=[]
for num,lst in items.items():
    best=None
    for it in lst:
        # split single-line Q+A
        q=it['q']; body=[l for l in it['lines']]
        if num!=180.5 and ('؟' in q) and not q.endswith('؟'):
            i=q.index('؟'); rest=q[i+1:].strip(); q=q[:i+1]
            if rest: body=[rest,'']+body
        txt='\n'.join(body).strip()
        txt=re.sub(r'\n{3,}','\n\n',txt)
        cand={'num':num,'q':q,'a':txt}
        if best is None or len(cand['a'])>len(best['a']): best=cand
    out.append(best)
out.sort(key=lambda x:x['num'])
json.dump(out,open('/tmp/chat_items.json','w'),ensure_ascii=False,indent=1)
print(len(out))
for x in out[:3]+out[28:32]+out[-3:]: print(x['num'],'|',x['q'],'|',x['a'][:150].replace('\n','⏎'));print()
empty=[x['num'] for x in out if not x['a']]; print('empty',empty)
