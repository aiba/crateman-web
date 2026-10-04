import struct,glob,os,re,json
import sys
D=sys.argv[1]+'/'  # scummvm --dump-scripts output dir
def rd(tag,i): return open(f'{D}crateman.exe-{tag}-{i}','rb').read()
key=rd('KEY*',3)
def parse_key(e):
    es,es2,mx,used=struct.unpack(e+'HHII',key[:12])
    out=[]
    for i in range(used):
        s,c,t=struct.unpack(e+'II4s',key[12+i*12:24+i*12])
        out.append((s,c,t if e=='>' else t[::-1]))
    return es,used,out
es,used,ents=parse_key('<')
if es!=12: es,used,ents=parse_key('>')
print('key entries',used, ents[:3])
cas=rd('CAS*',14)
ids=struct.unpack('>%dI'%(len(cas)//4),cas)
members={}
for n,cid in enumerate(ids,1):
    if cid==0: continue
    d=rd('CASt',cid)
    typ,ilen,slen=struct.unpack('>III',d[:12])
    info=d[12:12+ilen]; name=''
    if ilen>=20:
        off=struct.unpack('>I',info[:4])[0]
        cnt=struct.unpack('>H',info[off:off+2])[0]
        offs=struct.unpack('>%dI'%(cnt+1),info[off+2:off+2+4*(cnt+1)])
        base=off+2+4*(cnt+1)
        if cnt>1:
            s=info[base+offs[1]:base+offs[2]]
            if s: name=s[1:1+s[0]].decode('latin1')
    spec=d[12+ilen:12+ilen+slen]
    members[n]={'cast':cid,'type':typ,'name':name,'spec':spec.hex()}
child={}
for s,c,t in ents: child.setdefault(c,[]).append((t.decode('latin1'),s))
for n,m in members.items(): m['res']=child.get(m['cast'],[])
json.dump(members,open('members.json','w'),indent=0)
pngs={int(m.group(1)) for f in glob.glob(D+"*.png") for m in [re.search(r"BITD-(\d+)\.png",f)] if m}
T={1:'bmp',3:'field',4:'pal',6:'snd',7:'btn',8:'shape',11:'script',12:'rte'}
for n,m in sorted(members.items()):
    b=[s for t,s in m['res'] if t=='BITD']
    flag=''
    if b: flag='PNG' if b[0] in pngs else 'nopng'
    print(n,T.get(m['type'],m['type']),repr(m['name']),m['res'],flag)
