import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

import hangoutRoutes from './routes/hangouts'
import requestRoutes from './routes/requests'
import userRoutes from './routes/users'
import notificationRoutes from './routes/notifications'

const app = express()
const PORT = process.env.PORT || 3001

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'QLink' })
})

app.use('/api/notifications', notificationRoutes)

// Root route for GCP load balancer health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'QLink' })
})

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

app.use('/api/hangouts', hangoutRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/users', userRoutes)

app.listen(PORT, () => {
  console.log(`QLink server running on port ${PORT}`)
})