#!/usr/bin/env python3
"""Development only. The delivered ZIP is already built; the published game needs no commands.
After changing production files run: python3 preparar-offline.py
Only service-worker.js is generated. Player storage and GitHub are never touched.
"""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
IGNORE={'service-worker.js','preparar-offline.py','service-worker.template.txt'}
assets=[]
for p in sorted(ROOT.rglob('*')):
 if not p.is_file() or p.name in IGNORE or any(part.startswith('.') for part in p.relative_to(ROOT).parts):continue
 if p.suffix=='.zip':continue
 data=p.read_bytes();assets.append({'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
manifest=json.dumps(assets,separators=(',',':'),ensure_ascii=False)
template=(ROOT/'service-worker.template.txt').read_text()
# Include worker logic in the digest: a cache strategy fix is a new release too.
version=hashlib.sha256((manifest+template).encode()).hexdigest()[:16]
(ROOT/'service-worker.js').write_text(template.replace('__RELEASE__',json.dumps(version)).replace('__ASSETS__',manifest))
print('Prepared release',version,'·',len(assets),'files ·',sum(a['bytes'] for a in assets),'bytes')
