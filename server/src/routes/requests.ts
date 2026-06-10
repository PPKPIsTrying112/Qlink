import { Router } from 'express'
import { db } from '../services/firebase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendToUser } from '../services/sse'

const router = Router()

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { hangoutId } = req.body

    const existing = await db.collection('requests')
      .where('hangoutId', '==', hangoutId)
      .where('requesterUid', '==', req.user!.uid)
      .get()

    if (!existing.empty) {
      res.status(400).json({ error: 'Already requested to join' })
      return
    }

    const request = {
      hangoutId,
      requesterUid: req.user!.uid,
      status: 'pending',
      createdAt: new Date()
    }

    const doc = await db.collection('requests').add(request)

    // Find out who hosts this hangout, so we know who to notify.
    const hangoutDoc = await db.collection('hangouts').doc(hangoutId).get()
    const hostUid = hangoutDoc.data()?.hostUid
    const hangoutTitle = hangoutDoc.data()?.title || 'your hangout'

    if (hostUid) {
      // Build one notification object. We use the SAME shape for the saved
      // record and the live push, so the client handles both identically.
      const notification = {
        uid: hostUid,
        type: 'join_request',
        hangoutId,
        hangoutTitle,
        fromUid: req.user!.uid,
        read: false,
        createdAt: new Date()
      }
      // Save to Firestore (history for the Alerts page)...
      await db.collection('notifications').add(notification)
      // ...and push it live down the host's open SSE pipe (badge updates now).
      sendToUser(hostUid, notification)
    }

    res.status(201).json({ id: doc.id, ...request })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request' })
  }
})

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body

    // Read the request first, so we know who to notify (the requester).
    const requestDoc = await db.collection('requests').doc(req.params.id as string).get()
    const requesterUid = requestDoc.data()?.requesterUid
    const hangoutId = requestDoc.data()?.hangoutId

    await db.collection('requests').doc(req.params.id as string).update({ status })

    if (requesterUid) {
      const notification = {
        uid: requesterUid,
        type: status === 'approved' ? 'approved' : 'declined',
        hangoutId,
        fromUid: req.user!.uid,
        read: false,
        createdAt: new Date()
      }
      await db.collection('notifications').add(notification)
      sendToUser(requesterUid, notification)
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' })
  }
})

export default router