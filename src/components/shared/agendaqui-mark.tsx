type AgendaquiMarkProps = {
  className: string
}

export function AgendaquiMark({ className }: AgendaquiMarkProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}agendaqui-icon.png`}
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${className}`}
    />
  )
}
