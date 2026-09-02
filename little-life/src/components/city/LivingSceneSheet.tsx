import type { LivingSceneDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { NpcFace } from '@/components/city/NpcFace'
import { findNpc } from '@/lib/city/npcs'

interface LivingSceneSheetProps {
  scene: LivingSceneDef | null
  /** 닫기만 한다 — 아직 본 걸로 치지 않는다 */
  onClose: () => void
  /** 끝까지 봤다 */
  onDone: (sceneId: string) => void
}

/**
 * 잠깐 들여다본 장면.
 *
 * ── 새 화면을 만들지 않는다 ─────────────────────────────
 *
 * 비주얼 노벨 화면도 전용 배경도 만들지 않았다. H.5 에서 만든
 * 얼굴과 시트 하나면 충분하다 — 이건 사건이 아니라 지나가다 본 것이다.
 *
 * ── 닫으면 안 본 것이다 ────────────────────────────────
 *
 * 실수로 닫았는데 영영 못 보게 되면 그건 벌이다. "다 봤어" 를
 * 눌러야 본 걸로 친다 (이야기 장의 읽기 완료와 같은 결).
 */
export function LivingSceneSheet({ scene, onClose, onDone }: LivingSceneSheetProps) {
  if (!scene) return null

  return (
    <BottomSheet open onClose={onClose} title="잠깐">
      <ul className="space-y-3">
        {scene.lines.map((line, i) =>
          line.kind === 'NARRATION' ? (
            <li key={i} className="px-1 text-[13px] leading-relaxed text-inkfaint">
              {line.text}
            </li>
          ) : (
            <li key={i} className="flex items-start gap-2.5">
              {(() => {
                const npc = findNpc(line.npcId)
                if (!npc) return null
                return (
                  <>
                    <NpcFace id={npc.id} avatar={npc.avatar} size={36} shape="round" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] text-inkfaint">{npc.name}</span>
                      <span className="mt-0.5 block rounded-card bg-canvas px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                        {line.text}
                      </span>
                    </span>
                  </>
                )
              })()}
            </li>
          ),
        )}
      </ul>

      <Button size="lg" className="mt-5 w-full" onClick={() => onDone(scene.id)}>
        다 봤어
      </Button>
      <p className="mt-2 text-center text-[12px] text-inkfaint">
        아무 일도 없었다. 그래도 조금 알게 됐다.
      </p>
    </BottomSheet>
  )
}
