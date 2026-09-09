import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'

interface PrivacySheetProps {
  open: boolean
  /** 백업이 켜진 판인지. 안 켜진 판에서는 서버로 가는 게 아무것도 없다. */
  cloudOn: boolean
  onClose: () => void
}

/**
 * 무엇을 받고, 어디에 두고, 어떻게 지우는지.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 *
 * 혼자 쓸 때는 없어도 됐다. 남에게 주는 순간 이야기가 달라진다 —
 * 이메일 하나를 받고, 기록을 서버에 올리고, 의견을 받아서 읽는다.
 * 그걸 어디에도 안 적어두면, 나중에 알게 된 사람은 속은 기분이 든다.
 *
 * ── 법률 문서를 흉내 내지 않는다 ────────────────────────
 *
 * "귀하의 개인정보는 관련 법령에 따라…" 로 시작하는 글은 아무도 안 읽는다.
 * 안 읽히는 안내는 없는 것과 같고, 없는 것보다 나쁘다 — 알렸다고 칠 수
 * 있으니까. 여기서는 세 가지만 말한다: 뭘 받는지 · 어디 두는지 · 어떻게 지우는지.
 *
 * ── 없는 걸 말하는 게 더 중요하다 ───────────────────────
 *
 * 광고도 추적도 제3자 제공도 없다. 사람들이 진짜 걱정하는 건 그거라서
 * "안 한다" 를 먼저 적는다.
 */
export function PrivacySheet({ open, cloudOn, onClose }: PrivacySheetProps) {
  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="기록에 대해">
      <h2 className="text-[20px] font-semibold text-ink">기록에 대해</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
        무엇을 받고, 어디에 두고, 어떻게 지우는지.
      </p>

      <div className="mt-5 space-y-4">
        <Block title="이 폰 안에">
          퀘스트 · 도감 · 도시 사람들과의 기록은 전부 이 폰 안에 저장돼.
          네가 아무것도 안 하면 여기서 나가는 건 하나도 없어.
        </Block>

        {cloudOn && (
          <>
            <Block title="백업을 켰을 때만 서버로">
              로그인하면 그때부터 기록 한 벌이 서버에 올라가. 폰을 바꾸거나
              잃어버려도 이어지게 하려는 거야. 서버에 남는 건 <b>이메일 주소</b>와
              <b> 게임 기록</b> 둘이고, 네 기록은 네 계정으로만 열려.
              <br />
              로그인을 안 하면 이 문단은 해당 없어.
            </Block>

            <Block title="의견을 보낼 때">
              쓴 내용과 함께 <b>이름 · 앱 판 번호 · 레벨 · 기록한 날 수 · 기기 종류</b>가
              같이 가. 되묻지 않고 문제를 찾으려는 거야. 게임 기록 전체는 안 보내.
              보낸 건 만든 사람만 읽어.
            </Block>
          </>
        )}

        <Block title="안 하는 것">
          광고를 붙이지 않고, 행동을 추적하지 않고, 누구에게도 넘기지 않아.
          분석 도구도 안 달려 있어.
        </Block>

        <Block title="지우고 싶으면">
          설정의 <b>처음부터 다시</b>를 누르면 이 폰에 있는 게 다 지워지고
          로그아웃돼.
          {cloudOn && ' 서버에 올라간 것까지 지우려면 의견 보내기로 말해줘 — 계정째 지울게.'}
          <br />
          지우기 전에 <b>파일로 내보내기</b>로 한 벌 챙겨둘 수 있어.
        </Block>
      </div>

      <Button className="mt-6 w-full" onClick={onClose}>
        알겠어
      </Button>
    </BottomSheet>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-inkdim">{children}</p>
    </div>
  )
}
