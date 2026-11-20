export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function maskCnpj(value: string): string {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  return (
    characters.slice(0, 2) +
    (characters.length > 2 ? `.${characters.slice(2, 5)}` : '') +
    (characters.length > 5 ? `.${characters.slice(5, 8)}` : '') +
    (characters.length > 8 ? `/${characters.slice(8, 12)}` : '') +
    (characters.length > 12 ? `-${characters.slice(12, 14)}` : '')
  )
}

export function maskCep(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function unmaskCnpj(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function unmask(value: string): string {
  return value.replace(/\D/g, '')
}
