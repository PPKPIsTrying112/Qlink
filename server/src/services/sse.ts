import { Response } from 'express'

// One entry per connected browser, keyed by user id.
// A user can have more than one open tab, so each uid holds an array.
const clients = new Map<string, Response[]>()

export function addClient(uid: string, res: Response) {
  const existing = clients.get(uid) || []
  clients.set(uid, [...existing, res])
}

export function removeClient(uid: string, res: Response) {
  const existing = clients.get(uid) || []
  const filtered = existing.filter(r => r !== res)
  if (filtered.length) {
    clients.set(uid, filtered)
  } else {
    clients.delete(uid)
  }
}

// Push a message down every open pipe belonging to this user.
export function sendToUser(uid: string, data: any) {
  const conns = clients.get(uid)
  if (!conns) return // user isn't connected right now — nothing to push to
  const payload = `data: ${JSON.stringify(data)}\n\n`
  conns.forEach(res => res.write(payload))
}