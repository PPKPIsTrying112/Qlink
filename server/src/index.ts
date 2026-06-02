import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'QLink' })
})

app.listen(PORT, () => {
  console.log(`QLink server running on port ${PORT}`)
})