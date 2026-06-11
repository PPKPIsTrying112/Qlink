import { Request, Response, NextFunction } from 'express'
import { auth } from '../services/firebase'
import { parseBearerToken } from '../lib/authHelpers'

export interface AuthRequest extends Request {
  user?: {
    uid: string
    email: string | undefined
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = parseBearerToken(req.headers.authorization)

  if (!token) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  try {
    const decoded = await auth.verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}