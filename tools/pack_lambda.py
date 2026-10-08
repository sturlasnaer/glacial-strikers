# Packs the leaderboard server (server/lambda.mjs as index.mjs, plus server/leaderboard.mjs)
# into a Lambda deployment zip whose every byte is ASCII, and writes it as a Python string
# literal. The AWS MCP script runner passes parameters as text, which mangles ordinary
# binary zips, so the files are stored uncompressed and a padding comment at the end of each
# is tuned until the checksums and offsets come out ASCII too.
#   python3 tools/pack_lambda.py out.txt
# Then in the AWS script: Z = <contents of out.txt>, and
#   UpdateFunctionCode(FunctionName='puckbound-leaderboard', ZipFile=Z)
# (check len(Z) and the printed checksum first).
import io
import os
import sys
import zipfile

root = os.path.join(os.path.dirname(__file__), '..')
SOURCES = [('index.mjs', 'server/lambda.mjs'), ('leaderboard.mjs', 'server/leaderboard.mjs')]
texts = [open(os.path.join(root, path), encoding='ascii').read() for _, path in SOURCES]


def build(parts):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_STORED) as z:
        for (name, _), text in zip(SOURCES, parts):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o444 << 16  # read-only for everyone (0o644 has a byte over 127)
            info.compress_type = zipfile.ZIP_STORED
            z.writestr(info, text.encode('ascii'))
    return buf.getvalue()


def variants(src):
    for pad in range(300):
        for n in range(60):
            yield src + '//' + ' ' * pad + f'{n:02d}\n'


def search():
    for t0 in variants(texts[0]):
        end0 = 30 + len(SOURCES[0][0]) + len(t0)  # where the second file starts
        if max(build([t0, texts[1]])[:end0]) >= 128 or end0 % 256 >= 128 or end0 // 256 % 256 >= 128:
            continue
        for t1 in variants(texts[1]):
            d = build([t0, t1])
            if max(d) < 128:
                return d
    raise SystemExit('no ASCII-only layout found')


data = search()
assert zipfile.ZipFile(io.BytesIO(data)).testzip() is None
out = sys.argv[1] if len(sys.argv) > 1 else 'lambda_zip.txt'
open(out, 'w').write(repr(data.decode('ascii')))
print(f'{out}: {len(data)} bytes, checksum {sum(data) % 65536}')
