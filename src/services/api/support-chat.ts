import { io } from 'socket.io-client'

const apiUrl: string = import.meta.env.VITE_API_URL ?? '/agendaqui-api/'
const websocketOrigin: string = import.meta.env.VITE_API_WS_URL || window.location.origin

export function connectSupportSocket(token: string) {
  const apiPath = new URL(apiUrl, window.location.origin).pathname
  const path = import.meta.env.VITE_API_WS_PATH || (apiPath === '/' ? '/socket.io' : `${apiPath.replace(/\/$/, '')}/socket.io`)
  return io(`${websocketOrigin.replace(/\/+$/, '')}/support-chat`, {
    path,
    auth: { token },
    transports: ['websocket'],
  })
}
