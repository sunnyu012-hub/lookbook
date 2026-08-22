/**
 * 그림 259장을 한 화면에 늘어놓은 대조표를 만든다.
 *
 *   npm run assets:index
 *
 * reports/asset-index.html 을 브라우저로 열면 된다.
 * 이름·분류·놓는 자리·어느 시트에서 나왔는지가 그림 밑에 붙는다.
 *
 * 이걸 만든 이유: 259장을 폴더에서 하나씩 열어보면 어느 것이 어느 물건인지
 * 헷갈리고, 잘못 붙은 그림은 그렇게 해서는 절대 안 보인다.
 * 앱에는 들어가지 않는다 — 개발할 때만 보는 표다.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ALL_COLLECTION_ITEMS } from '../src/lib/collection/catalog'
import manifest from '../src/data/asset-manifest.json'

const ROOT = path.resolve(import.meta.dirname, '..')
const REPORT = path.join(ROOT, 'reports/asset-index.html')

type Entry = { source?: string; sourceIndex?: number | null; edgeAlpha?: number }
const meta = manifest as Record<string, Entry>

const CATEGORY_LABEL: Record<string, string> = {
  FURNITURE: '가구',
  LIGHTING: '조명',
  PLANT: '식물',
  RUG: '깔개',
  WALL: '벽',
  LITTLE_THING: '작은 것',
  KITCHEN: '부엌',
  FOOD: '먹을 것',
  BOOK: '책',
  HOBBY: '취미',
  TECH: '기계',
  OUTDOOR: '바깥',
  MAGIC: '보물',
  TROPHY: '트로피',
  MATERIAL: '재료',
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const groups = new Map<string, typeof ALL_COLLECTION_ITEMS>()
for (const item of ALL_COLLECTION_ITEMS) {
  const list = groups.get(item.category) ?? []
  list.push(item)
  groups.set(item.category, list)
}

const cells = (items: typeof ALL_COLLECTION_ITEMS) =>
  items
    .map((item) => {
      const m = meta[item.id] ?? {}
      const from = m.source
        ? `${m.source}/${String(m.sourceIndex ?? '?').padStart(2, '0')}`
        : '—'
      const marks = item.placement !== 'PLACEABLE' ? `<b class="tag">${item.placement}</b>` : ''

      return `<figure>
  ${item.assetKey ? `<img src="../public${item.assetKey}" alt="" loading="lazy">` : '<div class="none">없음</div>'}
  <figcaption>
    <strong>${escape(item.nameKo)}</strong>
    <code>${item.id}</code>
    <span>${item.placementType ?? '—'} · ${from}</span>
    ${marks}
  </figcaption>
</figure>`
    })
    .join('\n')

const sections = [...groups.entries()]
  .map(
    ([category, items]) =>
      `<section><h2>${CATEGORY_LABEL[category] ?? category} <em>${items.length}</em></h2><div class="grid">${cells(items)}</div></section>`,
  )
  .join('\n')

const html = `<!doctype html>
<meta charset="utf-8">
<title>LITTLE LIFE — 그림 대조표</title>
<style>
  body { margin: 0; padding: 24px; background: #faf7f2; color: #3a332c;
         font: 13px/1.5 -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.lead { margin: 0 0 28px; color: #8a7f72; }
  h2 { font-size: 15px; margin: 32px 0 12px; border-bottom: 1px solid #e6ded2; padding-bottom: 6px; }
  h2 em { color: #a99d8d; font-style: normal; font-weight: 400; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
  figure { margin: 0; padding: 10px; background: #fff; border: 1px solid #ece4d8; border-radius: 12px; text-align: center; }
  figure img { width: 100%; height: 92px; object-fit: contain; }
  .none { height: 92px; display: grid; place-items: center; color: #c4b8a8; }
  figcaption { margin-top: 6px; display: grid; gap: 2px; }
  figcaption strong { font-size: 12px; font-weight: 600; }
  figcaption code { font-size: 10px; color: #a99d8d; }
  figcaption span { font-size: 10px; color: #8a7f72; }
  .tag { display: inline-block; margin-top: 3px; padding: 1px 6px; border-radius: 6px;
         background: #f0e8dc; color: #7d7266; font-size: 9px; font-weight: 600; }
</style>
<h1>그림 대조표</h1>
<p class="lead">${ALL_COLLECTION_ITEMS.length}개 · <code>npm run assets:index</code> 로 다시 만든다. 앱에는 들어가지 않는다.</p>
${sections}
`

mkdirSync(path.dirname(REPORT), { recursive: true })
writeFileSync(REPORT, html)
console.log(`대조표 ${ALL_COLLECTION_ITEMS.length}칸 → reports/asset-index.html`)
