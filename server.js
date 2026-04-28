import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
dotenv.config()

if (!process.env.JWT_SECRET) {
  console.error('✗ JWT_SECRET no definido.')
  process.exit(1)
}

import { sequelize } from './database.js'

// Modelos (importar en orden para respetar FK)
import './models/Usuario.js'
import './models/Sede.js'
import './models/Profesora.js'
import './models/Actividad.js'
import './models/Alumna.js'
import './models/AlumnaActividad.js'
import './models/Cuota.js'
import './models/Egreso.js'
import Usuario from './models/Usuario.js'

// Rutas
import authRouter       from './routes/auth.js'
import sedesRouter      from './routes/sedes.js'
import profesorasRouter from './routes/profesoras.js'
import actividadesRouter from './routes/actividades.js'
import alumnasRouter    from './routes/alumnas.js'
import cuotasRouter     from './routes/cuotas.js'
import cajaRouter       from './routes/caja.js'
import dashboardRouter  from './routes/dashboard.js'
import usuariosRouter   from './routes/usuarios.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true

app.set('trust proxy', 1)
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())

// Fotos de alumnas
app.use('/fotos', express.static(join(__dirname, 'public/fotos')))

// Rate limit
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intentá en un minuto.' },
}))

// API
app.use('/api/auth',        authRouter)
app.use('/api/sedes',       sedesRouter)
app.use('/api/profesoras',  profesorasRouter)
app.use('/api/actividades', actividadesRouter)
app.use('/api/alumnas',     alumnasRouter)
app.use('/api/cuotas',      cuotasRouter)
app.use('/api/caja',        cajaRouter)
app.use('/api/dashboard',   dashboardRouter)
app.use('/api/usuarios',    usuariosRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Santiago Rítmica API 🎀' }))

// Servir frontend compilado en producción
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../frontend/dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

async function start() {
  try {
    await sequelize.authenticate()
    console.log('✓ MySQL conectado')
    await sequelize.sync()
    console.log('✓ Tablas sincronizadas')

    // Crear usuario admin por defecto si no existe
    const existe = await Usuario.findOne({ where: { email: 'admin@ritmica.com' } })
    if (!existe) {
      const hash = await Usuario.hashPassword('admin123')
      await Usuario.create({ nombre: 'Administrador', email: 'admin@ritmica.com', password: hash, rol: 'admin' })
      console.log('✓ Usuario admin creado: admin@ritmica.com / admin123')
    }

    app.listen(PORT, () => console.log(`🎀 Santiago Rítmica API en http://localhost:${PORT}`))
  } catch (err) {
    console.error('✗ Error al iniciar:', err.message)
    process.exit(1)
  }
}

// Heartbeat DB
setInterval(async () => {
  try { await sequelize.query('SELECT 1') } catch {}
}, 4 * 60 * 1000)

start()
