"""Decode Director 6 BITD bitmaps (8/4bpp, PackBits) from a ScummVM raw resource dump into PNGs.
Palette: Director 5+ Windows system palette (pals.json, taken from ScummVM graphics-data.h)."""
import json,struct,sys,os,collections
from PIL import Image
D=sys.argv[1]; OUT=sys.argv[2]  # D: scummvm --dump-scripts 'dumps' dir, OUT: assets dir
m=json.load(open('members.json'))  # written by castmap.py
def unpack(d,need):
    out=bytearray(); i=0
    while i<len(d) and len(out)<need:
        c=d[i]; i+=1
        if c<128: out+=d[i:i+c+1]; i+=c+1
        elif c>128: out+=bytes([d[i]])*(257-c); i+=1
    return bytes(out)
bm={}
for n,x in m.items():
    if x['type']!=1: continue
    res=[s for t,s in x['res'] if t=='BITD']
    if not res: continue
    s=bytes.fromhex(x['spec'])
    pitch=struct.unpack('>H',s[:2])[0]&0x0fff
    t,l,b,r=struct.unpack('>4h',s[2:10]); regy,regx=struct.unpack('>2h',s[18:22])
    bpp=s[23]; w,h=r-l,b-t
    raw=open(f'{D}/crateman.exe-BITD-{res[0]}','rb').read()
    data=raw if len(raw)>=pitch*h else unpack(raw,pitch*h)
    px=bytearray(w*h)
    for y in range(h):
        row=data[y*pitch:(y+1)*pitch]
        if bpp==8: px[y*w:(y+1)*w]=row[:w].ljust(w,b'\0')
        else:
            for xx in range(w):
                bt=row[xx//2] if xx//2<len(row) else 0
                px[y*w+xx]=(bt>>4) if xx%2==0 else (bt&15)
    bm[int(n)]=dict(name=x['name'],w=w,h=h,bpp=bpp,px=bytes(px),res=res[0],ox=l-regx,oy=t-regy)
pal=dict(enumerate(map(tuple,json.load(open('pals.json'))['winD5'])))
os.makedirs(OUT+'/snd',exist_ok=True)
# Sprites drawn with a transparent-white ink in the original (man, bridge, ball, selector dots).
TRANSPARENT=set(range(20,32))|{38,39,40,41,42,59,60,105,106}
meta={}
for n,b in sorted(bm.items()):
    if b['bpp']!=8: continue
    im=Image.new('RGBA',(b['w'],b['h']))
    im.putdata([pal[i]+((0,) if i==0 and n in TRANSPARENT else (255,)) for i in b['px']])
    name=''.join(ch for ch in b['name'] if ch.isalnum()).lower()
    fn=f'{n:03d}'+('_'+name if name else '')+'.png'
    im.save(os.path.join(OUT,fn))
    e=dict(file=fn,ox=b['ox'],oy=b['oy'])
    meta[str(n)]=e
    if name and name not in meta: meta[name]=e
open(os.path.join(OUT,'cast.js'),'w').write('// cast member number/name -> image file and draw offset from the sprite loc\nconst CRATEMAN_CAST = '+json.dumps(meta,indent=0)+';\n')
# Sounds: sndS is raw 8-bit unsigned mono PCM; sample rate is at offset 0x2c of sndH.
import wave
for n,x in m.items():
    r=dict((t,s) for t,s in x['res'])
    if x['type']!=6 or 'sndS' not in r: continue
    rate=struct.unpack('>I',open(f'{D}/crateman.exe-sndH-{r["sndH"]}','rb').read()[0x2c:0x30])[0]
    pcm=open(f'{D}/crateman.exe-sndS-{r["sndS"]}','rb').read()
    name=x['name'].lower().replace('.wav','')
    w=wave.open(os.path.join(OUT,'snd',name+'.wav'),'wb'); w.setnchannels(1); w.setsampwidth(1); w.setframerate(rate); w.writeframes(pcm); w.close()
    print('snd',name,rate,len(pcm),'mean',sum(pcm)//max(1,len(pcm)))
print('exported',len(bm))
