import { Router } from 'express'
import { db } from '../services/firebase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { moderateHangout } from '../services/gemini'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { lat, lng, vibe } = req.query
    const snapshot = await db.collection('hangouts')
      .where('status', '==', 'active')
      .limit(20)
      .get()

    const hangouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    res.json(hangouts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hangouts' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await db.collection('hangouts').doc(req.params.id as string).get()
    if (!doc.exists) {
      res.status(404).json({ error: 'Hangout not found' })
      return
    }
    res.json({ id: doc.id, ...doc.data() })
  } catch (error) {
    console.error('Hangouts error:', error)
    res.status(500).json({ error: 'Failed to fetch hangout' })
  }
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, vibe, location, lat, lng, datetime, maxPeople, description } = req.body

    const moderation = await moderateHangout(title, description || '')
    if (!moderation.safe) {
      res.status(400).json({ error: `Hangout rejected: ${moderation.reason}` })
      return
    }

    const hangout = {
      hostUid: req.user!.uid,
      title,
      vibe,
      location,
      lat,
      lng,
      datetime,
      maxPeople,
      description,
      status: 'active',
      createdAt: new Date()
    }

    const doc = await db.collection('hangouts').add(hangout)
    res.status(201).json({ id: doc.id, ...hangout })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hangout' })
  }
})

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await db.collection('hangouts').doc(req.params.id as string).get()
    if (doc.data()?.hostUid !== req.user!.uid) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }
    await db.collection('hangouts').doc(req.params.id as string).update({ status: 'cancelled' })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel hangout' })
  }
})

export default router