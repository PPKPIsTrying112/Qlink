import { Router } from 'express'
import { db } from '../services/firebase'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/:uid', requireAuth, async (req: AuthRequest, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid as string).get()
    if (!doc.exists) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ uid: doc.id, ...doc.data() })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.put('/:uid', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.params.uid !== req.user!.uid) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    const { name, bio, age, photos } = req.body

    // Only include fields that were actually sent (Firestore rejects undefined values)
    const update: Record<string, any> = { updatedAt: new Date() }
    if (name !== undefined) update.name = name
    if (bio !== undefined) update.bio = bio
    if (age !== undefined) update.age = age
    if (photos !== undefined) update.photos = photos

    await db.collection('users').doc(req.params.uid).set(update, { merge: true })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.post('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, age } = req.body
    const userDoc = await db.collection('users').doc(req.user!.uid).get()

    if (!userDoc.exists) {
      await db.collection('users').doc(req.user!.uid).set({
        uid: req.user!.uid,
        email: req.user!.email,
        name,
        age,
        bio: '',
        photos: [],
        verified: false,
        createdAt: new Date()
      })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router