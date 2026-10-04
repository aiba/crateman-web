import zlib, sys, os
d = open('win/SETUP.EXE','rb').read()
os.makedirs('raw', exist_ok=True)
# brute-force: find first offset where a raw deflate stream of meaningful size decodes, then chain
def try_at(o):
    z = zlib.decompressobj(-15)
    try:
        out = z.decompress(d[o:])
    except zlib.error:
        return None
    if not z.eof: return None
    used = len(d) - o - len(z.unused_data)
    return out, used
o = 0x1000; n = 0; found = []
while o < len(d) - 8:
    r = try_at(o)
    if r and len(r[0]) > 64 and r[1] > 32:
        out, used = r
        crc = int.from_bytes(d[o+used:o+used+4], 'little')
        ok = crc == (zlib.crc32(out) & 0xffffffff)
        if ok:
            open(f'raw/{n:03d}.bin','wb').write(out)
            found.append((n, o, used, len(out)))
            n += 1; o += used + 4; continue
    o += 1
for f in found: print(f)
