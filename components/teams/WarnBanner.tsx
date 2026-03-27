'use client'

export function WarnBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border px-4 py-3 text-sm font-medium"
      style={{ background: '#fef9c3', borderColor: '#fde047', color: '#713f12' }}
      role="alert"
    >
      &#9888; {message}
    </div>
  )
}
