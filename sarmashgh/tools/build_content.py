import json,re
chat=json.load(open('/tmp/chat_items.json'))
def parse_manual(path):
    groups={}; g=c=None
    for line in open(path,encoding='utf-8').read().split('\n'):
        if line.startswith('# '): g=line[2:].strip(); groups.setdefault(g,[]); continue
        if line.startswith('## '): c={'title':line[3:].strip(),'desc':'','qs':[]}; groups[g].append(c); continue
        if line.startswith('> ') and c and not c['qs']: c['desc']=line[2:].strip(); continue
        if line.startswith('### '): c['qs'].append({'q':line[4:].strip(),'a':[]}); continue
        if c and c['qs']: c['qs'][-1]['a'].append(line)
    for g in groups.values():
        for c in g:
            for q in c['qs']: q['a']='\n'.join(q['a']).strip()
    return groups
man={}
for p in ['manual_pdf1.md','manual_war.md']:
    for k,v in parse_manual(p).items(): man.setdefault(k,[]).extend(v)
TIP=re.compile(r'(خودت|\bداری\b|کنی\b|بگویی|بدهی|بشناسی|می‌شناسی|بیاور|بگو\b|کن\.|جایگزین کن|نمی‌کنی|می‌دهی|هستی)')
def fmt(it):
    a=it['a'].replace('نمونه پاسخ:','').strip()
    paras=[p.strip() for p in re.split(r'\n\s*\n',a) if p.strip()]
    out=[]
    if it['num']==180.5:
        return {'q':'نکات مهم برای مرور این بخش','a':'\n'.join(paras)}
    for i,p in enumerate(paras):
        lines=p.split('\n')
        if i>0 and (TIP.search(p) or p.startswith('نکته:')) and not p.startswith(('-','*')):
            out.append('💡 '+p.replace('نکته:','').strip())
        else:
            for l in lines:
                l=l.strip()
                if l.startswith('* '): l='- '+l[2:]
                out.append(l)
        out.append('')
    return {'q':it['q'],'a':'\n'.join(out).strip()}
def chat_cat(title,lo,hi,desc=''):
    qs=[fmt(x) for x in chat if lo<=x['num']<=hi]
    return {'title':title,'desc':desc,'qs':qs}
FIQH='پاسخ‌های احکام بر اساس فقه شیعه امامیه نوشته شده‌اند؛ برای جزئیات اختلافی به رساله مرجع تقلید خودتان مراجعه کنید.'
G={}
G['general']=[
 chat_cat('معرفی، خانواده و انگیزه معلمی',1,30,'جاهای خالی ([…] و ...) را با اطلاعات واقعی خودتان پر کنید؛ پاسخ صادقانه، همیشه قوی‌تر از پاسخ حفظ‌شده است.'),
 chat_cat('برنامه‌ریزی، علایق و روابط اجتماعی',31,60,'کتاب، سفر، الگو، فضای مجازی و مهارت‌ها؛ فقط موردهایی را بگویید که واقعاً دربارهٔ آن‌ها می‌توانید صحبت کنید.'),
 chat_cat('انگیزه، شخصیت و جمع‌بندی مصاحبه',511,538),
 chat_cat('آداب و پوشش در مصاحبه',471,480),
]+man['general']
G['teaching']=[
 chat_cat('ویژگی‌های معلم و انگیزه شغلی',61,90,'بخشی که نشان می‌دهد شما وظایف معلم را می‌شناسید و انگیزهٔ درستی دارید.'),
 chat_cat('روش تدریس و مدیریت کلاس',91,120,'نشان دهید در موقعیت‌های واقعی کلاس چگونه فکر و تصمیم می‌گیرید.'),
 chat_cat('موقعیت‌های دشوار، والدین و همکاران',121,150,'سؤال‌های فرضی؛ مصاحبه‌گر تحلیل و تصمیم‌گیری شما را می‌سنجد.'),
 chat_cat('سؤالات چالشی کلاس درس',496,510),
 chat_cat('تعلیم‌وتربیت و سند تحول بنیادین',151,195,'مفهوم پاسخ‌ها را یاد بگیرید و با زبان خودتان بگویید. برای جزئیات سند تحول، متن رسمی و آخرین نسخه را هم ببینید.'),
]+man['teaching']
G['ideology']=man['ideology'][:3]+[
 chat_cat('احکام: طهارت، وضو و غسل',196,210,FIQH),
 chat_cat('احکام: نماز و روزه',211,240,FIQH),
 chat_cat('احکام مالی و عبادی',241,270,FIQH),
 chat_cat('اصول دین، قرآن و شخصیت‌های دینی',271,300),
 chat_cat('مناسبت‌های دینی و ملی',301,354),
 chat_cat('قانون اساسی و ساختار سیاسی',361,412),
]+man['ideology'][3:]
G['war']=man['war']
META=[('general','🧑‍🎓 مصاحبه عمومی و شخصیتی','معرفی، انگیزه، نقاط قوت و ضعف و آداب مصاحبه'),
('teaching','🍎 تخصصی معلمی','معلم خوب، تدریس، مدیریت کلاس و تعلیم‌وتربیت'),
('ideology','📖 عقیدتی، سیاسی و احکام','احکام، معارف، تاریخ، قانون اساسی و اطلاعات عمومی'),
('war','🛡️ جنگ رمضان و تحلیل سیاسی','پرسش‌های تحلیلی جنگ ۴۰ روزه و دیپلماسی')]
out=[]; total=0
for gid,title,desc in META:
    out.append(f'# {title} | {gid}\n> {desc}\n')
    for c in G[gid]:
        if not c['qs']: continue
        out.append(f'## {c["title"]}')
        if c['desc']: out.append('> '+c['desc'])
        for q in c['qs']:
            out.append(f'### {q["q"]}'); out.append(q['a']); total+=1
        out.append('')
text='\n'.join(out)
assert '`' not in text and '${' not in text and '\\' not in text.replace('\\n','')
open('/tmp/content_md.txt','w').write(text)
print(total, {k:sum(len(c['qs']) for c in v) for k,v in G.items()})
