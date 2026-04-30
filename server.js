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
import authRouter        from './routes/auth.js'
import sedesRouter       from './routes/sedes.js'
import profesorasRouter  from './routes/profesoras.js'
import actividadesRouter from './routes/actividades.js'
import alumnasRouter     from './routes/alumnas.js'
import cuotasRouter      from './routes/cuotas.js'
import cajaRouter        from './routes/caja.js'
import dashboardRouter   from './routes/dashboard.js'
import usuariosRouter    from './routes/usuarios.js'
import sueldosRouter     from './routes/sueldos.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== '*'
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true

app.set('trust proxy', 1)
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())

app.use('/fotos', express.static(join(__dirname, 'public/fotos')))

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
app.use('/api/sueldos',     sueldosRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Santiago Rítmica API 🎀' }))
app.get('/ping', (req, res) => res.send('pong'))


async function migrar() {
  // ── 1. Columnas nuevas ────────────────────────────────────────────────────
  const colsMigrations = [
    { tabla: 'cuotas',      col: 'tipo',          sql: "ALTER TABLE cuotas ADD COLUMN tipo ENUM('cuota','inscripcion') NOT NULL DEFAULT 'cuota' AFTER anio" },
    { tabla: 'alumnas',     col: 'direccion',     sql: "ALTER TABLE alumnas ADD COLUMN direccion VARCHAR(255) NULL AFTER apellido" },
    { tabla: 'actividades', col: 'profesora_id_2', sql: "ALTER TABLE actividades ADD COLUMN profesora_id_2 INT NULL AFTER profesora_id" },
  ]
  for (const m of colsMigrations) {
    const [[existe]] = await sequelize.query(`SHOW COLUMNS FROM ${m.tabla} LIKE '${m.col}'`)
    if (!existe) {
      await sequelize.query(m.sql)
      console.log(`✓ Migración columna: ${m.tabla}.${m.col}`)
    }
  }

  // ── 2. Silvia Ruiz (id=9) → dar de baja ──────────────────────────────────
  await sequelize.query(`UPDATE profesoras SET activo = 0 WHERE id = 9`)
  await sequelize.query(`UPDATE usuarios    SET activo = 0 WHERE profesora_id = 9`)

  // ── 3. Crear Gabriela Vega si no existe ───────────────────────────────────
  let [[gabriela]] = await sequelize.query(`SELECT id FROM profesoras WHERE nombre = 'Gabriela' AND apellido = 'Vega'`)
  let gabrielaId
  if (gabriela) {
    gabrielaId = gabriela.id
    await sequelize.query(`UPDATE profesoras SET activo = 1 WHERE id = ${gabrielaId}`)
  } else {
    const [gabrielaIdNew] = await sequelize.query(`INSERT INTO profesoras (nombre, apellido, email, activo) VALUES ('Gabriela','Vega','gabrielavega@ritmica.com',1)`)
    gabrielaId = gabrielaIdNew
    console.log(`✓ Profesora Gabriela Vega creada (id=${gabrielaId})`)
  }
  // Usuario de Gabriela
  const [[uGab]] = await sequelize.query(`SELECT id FROM usuarios WHERE email = 'gabrielavega@ritmica.com'`)
  if (!uGab) {
    const hash = await Usuario.hashPassword('Gabriela2026')
    await sequelize.query(
      `INSERT INTO usuarios (nombre, email, password, rol, profesora_id, activo) VALUES ('Gabriela Vega','gabrielavega@ritmica.com',?,\'profesora\',?,1)`,
      { replacements: [hash, gabrielaId] }
    )
    console.log('✓ Usuario gabrielavega@ritmica.com creado')
  }

  // ── 4. Asignaciones de profesoras por grupo ───────────────────────────────
  // IDs profesoras: 1=Aldana, 2=Carolina, 3=Eugenia, 4=Evelyn, 5=Guada, 6=Laura, 7=Paula, 8=Shesla, gabrielaId=Gabriela
  const asignaciones = [
    // id_actividad, prof_id, prof_id_2, nombre_nuevo
    { id: 4,  p1: gabrielaId, p2: null, nombre: null },          // Grupo 2 → Gabriela
    { id: 7,  p1: 5,          p2: null, nombre: null },          // Grupo 3A → Guada
    { id: 8,  p1: 5,          p2: 1,    nombre: null },          // Grupo 3B → Guada + Aldana (20% c/u)
    { id: 9,  p1: 1,          p2: null, nombre: null },          // Grupo 3C → Aldana
    { id: 11, p1: 8,          p2: null, nombre: null },          // Grupo 5 → Shesla
    { id: 14, p1: 4,          p2: null, nombre: 'Rítmica Grupo A - Flores' }, // A Sur → A Flores, Evelyn
    { id: 15, p1: 6,          p2: null, nombre: 'Rítmica Grupo B - Flores' }, // B Sur → B Flores, Laura
    { id: 16, p1: null,       p2: null, nombre: null },          // Banda → limpiar Silvia
  ]
  for (const a of asignaciones) {
    const sets = [`profesora_id = ${a.p1 ?? 'NULL'}`, `profesora_id_2 = ${a.p2 ?? 'NULL'}`]
    if (a.nombre) sets.push(`nombre = '${a.nombre}'`)
    await sequelize.query(`UPDATE actividades SET ${sets.join(', ')} WHERE id = ${a.id}`)
  }
  console.log('✓ Asignaciones de profesoras actualizadas')

  // ── 5. Crear Grupo 8 (Laura) si no existe ────────────────────────────────
  const [[g8]] = await sequelize.query(`SELECT id FROM actividades WHERE nombre LIKE '%Grupo 8%'`)
  if (!g8) {
    // Usar misma sede que Grupo 7 (id=13)
    const [[sede]] = await sequelize.query(`SELECT sede_id FROM actividades WHERE id = 13`)
    const sedeId = sede?.sede_id || 1
    await sequelize.query(
      `INSERT INTO actividades (nombre, sede_id, profesora_id, profesora_id_2, capacidad, activo) VALUES ('Rítmica Grupo 8', ?, 6, NULL, 20, 1)`,
      { replacements: [sedeId] }
    )
    console.log('✓ Grupo 8 creado (Laura)')
  }

  // ── 6. Desactivar grupos Anexo y Folclore (y limpiar alumna_actividades) ──
  const idsEliminar = [3, 5, 6, 18]
  await sequelize.query(`DELETE FROM alumna_actividades WHERE actividad_id IN (${idsEliminar.join(',')})`)
  await sequelize.query(`UPDATE actividades SET activo = 0 WHERE id IN (${idsEliminar.join(',')})`)
  console.log('✓ Grupos Anexo y Folclore desactivados')
}

async function start() {
  try {
    await sequelize.authenticate()
    console.log('✓ MySQL conectado')
    await sequelize.sync()
    console.log('✓ Tablas sincronizadas')

    await migrar()

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
