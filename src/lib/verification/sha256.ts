/**
 * SHA-256 do arquivo no navegador.
 *
 * O backend recalcula o hash do objeto gravado e compara com o declarado:
 * divergir é 409, porque significa objeto trocado entre presign e complete.
 * Por isso o hash é calculado aqui e não pode ser omitido.
 *
 * Isolado em módulo próprio para que os testes possam substituir a
 * implementação (`vi.mock`) sem depender de WebCrypto no jsdom.
 */
export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
