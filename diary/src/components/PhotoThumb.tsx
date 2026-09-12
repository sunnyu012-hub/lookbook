import { usePhotoUrl } from '../hooks/usePhotoUrl'

type Props = {
  id: string
  className?: string
  onClick?: () => void
  alt?: string
}

/** 사진 한 장. 그림은 IndexedDB 에서 꺼내 온다. */
export function PhotoThumb({ id, className = '', onClick, alt = '그날의 사진' }: Props) {
  const url = usePhotoUrl(id)

  const body = url ? (
    <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <span className="block h-full w-full animate-pulse bg-sunken" />
  )

  if (!onClick) return <span className={`block overflow-hidden bg-sunken ${className}`}>{body}</span>

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block overflow-hidden bg-sunken active:opacity-80 ${className}`}
    >
      {body}
    </button>
  )
}
