"""개발용 2차 탐색: URL을 받아 원본(raw) 또는 API 후보 문자열(grep)만 _probe2/ 에 저장한다.
사용: python probe2.py <목록파일>   (각 줄: 이름 모드 URL [헤더JSON])"""
import json, re, sys, os, urllib.request, ssl

OUT = "chehumdan/_probe2"
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
PAT = re.compile(r"""["'`]((?:https?:)?//[^"'`\s]{4,200}|/[a-zA-Z0-9_\-./{}$:]*(?:api|campaign|search|list|v\d)[a-zA-Z0-9_\-./{}$:?=&]*)["'`]""", re.I)
summary = open(f"{OUT}/_summary.txt", "a")
# 번들 안에 섞인 남의 비밀값(웹훅·키)은 저장하지 않는다.
SECRET = re.compile(r"hooks\.slack\.com\S*|discord(?:app)?\.com/api/webhooks\S*|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_\-]{35}|xox[abprs]-[0-9A-Za-z\-]+|sk_live_\w+|-----BEGIN[^-]+-----")


def scrub(t: str) -> str:
    return SECRET.sub("[REDACTED]", t)

for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split(None, 3)
    name, mode, url = parts[:3]
    headers = {"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", "Accept": "*/*"}
    if len(parts) > 3:
        headers.update(json.loads(parts[3]))
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=40, context=ssl.create_default_context()) as r:
            body = r.read()
            status, final = r.status, r.geturl()
            hdr = "\n".join(f"{k}: {v}" for k, v in r.headers.items())
    except urllib.error.HTTPError as e:
        body, status, final, hdr = e.read(), e.code, url, str(e.headers)
    except Exception as e:  # noqa
        summary.write(f"{name} FAILED {url} {e!r}\n")
        continue
    summary.write(f"{name} {status} {final} {len(body)}\n")
    open(f"{OUT}/{name}.headers", "w").write(hdr)
    text = body.decode("utf-8", "replace")
    if mode == "grep":
        found = []
        for m in PAT.finditer(text):
            s = m.group(1)
            if s not in found:
                found.append(s)
        ctx = []
        for kw in ("baseURL", "baseUrl", "API_URL", "apiUrl", "axios.create", "fetch(", "/campaigns?", "campaign/list", "campaigns/search"):
            for m in re.finditer(re.escape(kw), text):
                ctx.append(f"--- {kw} @{m.start()}\n{text[max(0, m.start()-300):m.start()+400]}")
                if len(ctx) > 60:
                    break
        open(f"{OUT}/{name}.grep.txt", "w").write(scrub("\n".join(found) + "\n\n==== CONTEXT ====\n" + "\n".join(ctx)))
    else:
        open(f"{OUT}/{name}.body", "wb").write(body[:400_000])
