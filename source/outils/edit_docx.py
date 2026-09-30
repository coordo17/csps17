import zipfile, sys, re, copy
from lxml import etree
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS={'w':W}
def q(t): return '{%s}%s'%(W,t)
class Doc:
    def __init__(self, path):
        self.path=path; self.z=zipfile.ZipFile(path)
        self.root=etree.fromstring(self.z.read('word/document.xml'))
    def paras(self): return self.root.iter(q('p'))
    def ptext(self,p): return ''.join(t.text or '' for t in p.iter(q('t')))
    def rep(self, old, new, n=1, garder_premier_run=False):
        c=0
        for p in list(self.paras()):
            full=self.ptext(p)
            if old not in full: continue
            ts=list(p.iter(q('t')))
            # essayer d'abord dans un seul w:t
            done=False
            for t in ts:
                if t.text and old in t.text:
                    t.text=t.text.replace(old,new); t.set('{http://www.w3.org/XML/1998/namespace}space','preserve'); done=True; c+=1; break
            if done: continue
            # sinon : reconstruire sur les w:t qui couvrent la chaine
            pos=full.index(old); acc=0; first=None
            spans=[]
            for t in ts:
                L=len(t.text or ''); spans.append((acc,acc+L,t)); acc+=L
            for a,b,t in spans:
                if b>pos and a<pos+len(old):
                    if first is None:
                        first=t; t.text=(t.text or '')[:pos-a]+new+ (full[pos+len(old):b] if b>=pos+len(old) else '')
                    else:
                        t.text=full[max(a,pos+len(old)):b] if b>pos+len(old) else ''
                    t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
            c+=1
        assert c==n, (c, old)
    def inserer_avant(self, texte_ancre, xml_fragments):
        # insere avant le tableau (ou paragraphe) de corps qui contient texte_ancre
        body=self.root.find(q('body'))
        for el in body:
            txt=''.join(t.text or '' for t in el.iter(q('t')))
            if texte_ancre in txt:
                i=list(body).index(el)
                for k,frag in enumerate(xml_fragments):
                    body.insert(i+k, etree.fromstring(frag))
                return
        raise AssertionError('ancre absente '+texte_ancre)
    def save(self, out):
        data=etree.tostring(self.root, xml_declaration=True, encoding='UTF-8', standalone=True)
        zo=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)
        for it in self.z.infolist():
            zo.writestr(it, data if it.filename=='word/document.xml' else self.z.read(it.filename))
        zo.close()

NSDECL='xmlns:w="%s"'%W
def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def run(t, b=False, sz=16, col=None):
    return ('<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'+('<w:b/>' if b else '')
            +('<w:color w:val="%s"/>'%col if col else '')+'<w:sz w:val="%d"/><w:szCs w:val="%d"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>'%(sz,sz,esc(t)))
def para(runs, before=40, after=40):
    return '<w:p %s><w:pPr><w:spacing w:before="%d" w:after="%d"/></w:pPr>%s</w:p>'%(NSDECL,before,after,''.join(runs))
BORD='<w:tblBorders>'+''.join('<w:%s w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>'%s for s in ['top','left','bottom','right','insideH','insideV'])+'</w:tblBorders>'
def cell(w, contenu, fill=None):
    return ('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/>'%w+('<w:shd w:val="clear" w:color="auto" w:fill="%s"/>'%fill if fill else '')
            +'</w:tcPr>'+contenu+'</w:tc>')
def cp(t,b=False,sz=16): return '<w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>'+run(t,b,sz)+'</w:p>'
def table(largeurs, lignes, entete_fill='E8EEF5'):
    x='<w:tbl %s><w:tblPr><w:tblW w:w="%d" w:type="dxa"/>%s<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>%s</w:tblGrid>'%(NSDECL,sum(largeurs),BORD,''.join('<w:gridCol w:w="%d"/>'%w for w in largeurs))
    for i,l in enumerate(lignes):
        x+='<w:tr>'+''.join(cell(largeurs[j], cp(v, b=(i==0)), entete_fill if i==0 else None) for j,v in enumerate(l))+'</w:tr>'
    return x+'</w:tbl>'
