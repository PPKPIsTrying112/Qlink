import { Router } from 'express'
import { db } from '../services/firebase'
import { requireAuth, AuthRequest } from '../middleware/auth'

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
    res.status(201).json({ id: doc.id, ...request })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request' })
  }
})

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body
    await db.collection('requests').doc(req.params.id as string).update({ status })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' })
  }
})

export default router