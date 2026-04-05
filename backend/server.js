import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT || 8080)
const adminPassword = process.env.ADMIN_PASSWORD || ''
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'))
    },
  }),
)
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'chaap-wala-backend' })
})

app.post('/api/admin/login', (request, response) => {
  const { password } = request.body || {}

  if (!adminPassword) {
    response.status(500).json({ success: false, message: 'ADMIN_PASSWORD missing on backend.' })
    return
  }

  if (!password || password !== adminPassword) {
    response.status(401).json({ success: false, message: 'Incorrect password. Please try again.' })
    return
  }

  response.json({ success: true })
})

app.listen(port, () => {
  console.log(`Restro Token System backend listening on port ${port}`)
})