import { Router } from 'express'
import { auth, db } from '../services/firebase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { addClient, removeClient } from '../services/sse'

const router = Router()

// The SSE stream. EventSource can't send headers, so the token comes
// in the query string. We verify it the same way requireAuth does.
router.get('/stream', async (req, res) => {
  const token = req.query.token as string
  if (!token) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  let uid: string
  try {
    const decoded = await auth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173')
  res.flushHeaders()

  addClient(uid, res)
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    removeClient(uid, res)
  })
})

// Fetch past notifications for the Alerts page.
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('uid', '==', req.user!.uid)
      .limit(50)
      .get()
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Mark all of this user's notifications as read.
router.put('/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('uid', '==', req.user!.uid)
      .get()

    const batch = db.batch()
    snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }))
    await batch.commit()

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications read' })
  }
})

export default router