import { useState } from 'react'
import type { Category, SkillDef, User } from '@/types'
import { CATEGORIES } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_BADGE } from '@/lib/assets'
import { availableSkillPoints, skillState, skillsInTree } from '@/lib/city/skills'
import { cn } from '@/components/ui/cn'

interface SkillTreeCardProps {
  user: User
  onUnlock: (skillId: string) => void
}

/**
 * 스킬트리.
 *
 * 여섯 갈래를 한 번에 다 보여주면 벽이 된다. 하나씩 골라서 본다.
 * 잘못 찍어도 손해는 아니다 — 레벨이 오르면 포인트는 계속 생긴다.
 */
export function SkillTreeCard({ user, onUnlock }: SkillTreeCardProps) {
  const [tree, setTree] = useState<Category>('WORK')
  const points = availableSkillPoints(user.level, user.unlockedSkills)
  const skills = skillsInTree(tree)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-card border border-line/70 bg-surface px-4 py-3 shadow-soft">
        <span className="text-[13px] text-inkdim">쓸 수 있는 포인트</span>
        <span
          className={cn(
            'inline-flex h-7 min-w-[28px] items-center justify-center rounded-pill px-2.5 font-game text-[13px]',
            points > 0 ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
          )}
        >
          {points}
        </span>
      </div>

      {points === 0 && (
        <p className="mb-3 text-[12.5px] leading-relaxed text-inkfaint">
          레벨이 하나 오를 때마다 포인트가 하나 생겨. 급할 것 없어.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="스킬 갈래">
        {CATEGORIES.map((c) => {
          const active = c === tree
          const style = categoryStyle(c)
          const owned = skillsInTree(c).filter((s) => user.unlockedSkills.includes(s.id)).length

          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTree(c)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1 rounded-pill pl-1.5 pr-2.5',
                'transition-transform duration-150 ease-out active:scale-[0.96]',
                active
                  ? cn(style.chip, style.text, 'ring-[1.5px] ring-inset', style.ring)
                  : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
              )}
            >
              <img
                src={CATEGORY_BADGE[c]}
                alt=""
                aria-hidden
                className={cn('h-6 w-6 object-contain', !active && 'opacity-70')}
              />
              <span className="font-game text-[10px] leading-none tracking-[0.06em]">{c}</span>
              {owned > 0 && (
                <span className="font-game text-[9px] leading-none opacity-70">{owned}/3</span>
              )}
            </button>
          )
        })}
      </div>

      <ul className="mt-3 space-y-2">
        {skills.map((skill, i) => (
          <li key={skill.id}>
            {i > 0 && (
              <div className="mb-2 ml-[26px] h-3 w-[2px] rounded-pill bg-line" aria-hidden />
            )}
            <SkillNode
              skill={skill}
              state={skillState(skill, user.level, user.unlockedSkills)}
              onUnlock={onUnlock}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkillNode({
  skill,
  state,
  onUnlock,
}: {
  skill: SkillDef
  state: ReturnType<typeof skillState>
  onUnlock: (id: string) => void
}) {
  const unlocked = state === 'UNLOCKED'
  const available = state === 'AVAILABLE'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border px-3.5 py-3',
        unlocked
          ? 'border-leaf/50 bg-leaf-soft/40'
          : available
            ? 'border-coral/50 bg-surface shadow-soft'
            : 'border-dashed border-line bg-surface/60',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]',
          unlocked
            ? 'bg-leaf text-surface'
            : available
              ? 'bg-coral-soft text-coral-deep'
              : 'bg-sunken text-inkfaint',
        )}
      >
        {unlocked ? '✓' : available ? '＋' : '🔒'}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[14.5px] font-semibold',
            unlocked ? 'text-inkdim' : 'text-ink',
          )}
        >
          {skill.name}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-inkdim">{skill.effectLabel}</span>
        {state === 'NEEDS_PARENT' && (
          <span className="mt-0.5 block text-[11px] text-inkfaint">앞 단계를 먼저 찍어야 해</span>
        )}
        {state === 'NEEDS_POINTS' && (
          <span className="mt-0.5 block text-[11px] text-inkfaint">포인트가 조금 더 필요해</span>
        )}
      </span>

      {unlocked ? (
        <span className="shrink-0 font-game text-[9px] tracking-[0.08em] text-leaf-deep">
          LEARNED
        </span>
      ) : (
        <button
          type="button"
          disabled={!available}
          onClick={() => onUnlock(skill.id)}
          className={cn(
            'inline-flex min-h-[44px] shrink-0 flex-col items-center justify-center rounded-btn px-3',
            'transition-transform duration-150 ease-out active:scale-[0.96]',
            'disabled:cursor-not-allowed disabled:active:scale-100',
            available
              ? 'bg-coral text-surface shadow-[0_3px_0_0_rgba(217,108,97,0.5)] active:shadow-none active:translate-y-[2px]'
              : 'bg-sunken text-inkfaint',
          )}
        >
          <span className="font-game text-[12px] leading-none">{skill.cost}P</span>
          <span className="mt-0.5 font-game text-[8px] tracking-[0.08em]">
            {available ? 'LEARN' : 'LOCKED'}
          </span>
        </button>
      )}
    </div>
  )
}
