/**
 * 7D / 7G — 실제로 AI 를 부르는 자리.
 *
 * 여기서 절대 하지 않는 것: 클라이언트 번들에 secret key 를 넣는 것 (계획서 51).
 * anon key 와 달리 AI API key 는 공개되면 그대로 남의 비용이 된다.
 *
 * 그래서 앱은 우리 쪽 endpoint 하나만 안다.
 * key 는 그 endpoint 뒤에 있고, 이 파일은 key 를 본 적이 없다.
 * endpoint 가 설정돼 있지 않으면 서비스는 아예 없는 것으로 둔다 — 그래도 앱은 돈다.
 */
import type {
  NamingRequest,
  NamingResult,
  PersonalDiscoveryNamingService,
} from './naming'

export const NAMING_ENDPOINT = (import.meta.env?.VITE_NAMING_ENDPOINT ?? '').trim()

/** 오래 기다리지 않는다. 이름 하나 때문에 화면이 멈추면 안 된다 */
const TIMEOUT_MS = 8_000

export function httpNamingService(endpoint: string): PersonalDiscoveryNamingService {
  return {
    async name(request: NamingRequest): Promise<NamingResult | null> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // request 는 이미 최소한이다 — 원문도 사진도 날짜도 숫자도 들어 있지 않다
          body: JSON.stringify(request),
          signal: controller.signal,
        })
        if (!response.ok) return null

        const data = (await response.json()) as Partial<NamingResult>
        if (typeof data?.title !== 'string' || typeof data?.description !== 'string') {
          return null
        }
        return { title: data.title, description: data.description }
      } catch {
        // 여기서 request 를 로그로 남기지 않는다 (계획서 83)
        return null
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

export const defaultNamingService = (): PersonalDiscoveryNamingService | null =>
  NAMING_ENDPOINT ? httpNamingService(NAMING_ENDPOINT) : null
