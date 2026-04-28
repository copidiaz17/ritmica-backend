// Ejecutar una sola vez: node seed.js
import { sequelize } from './database.js'
import './models/Usuario.js'
import './models/Sede.js'
import './models/Profesora.js'
import './models/Actividad.js'
import './models/Alumna.js'
import './models/AlumnaActividad.js'
import './models/Cuota.js'
import './models/Egreso.js'
import Sede from './models/Sede.js'
import Usuario from './models/Usuario.js'

const SEDES = [
  { nombre: 'Gimnasio Neuquén - Anexo',     direccion: '' },
  { nombre: 'Gimnasio Principal Suárez',    direccion: '' },
  { nombre: 'Gimnasio Sur',                 direccion: '' },
  { nombre: 'La Banda',                     direccion: '' },
  { nombre: 'Sala 3 Alfombra',              direccion: '' },
  { nombre: 'Sala 4 Piso Goma',             direccion: '' },
]

async function seed() {
  await sequelize.authenticate()
  await sequelize.sync()

  for (const s of SEDES) {
    const [, created] = await Sede.findOrCreate({ where: { nombre: s.nombre }, defaults: s })
    console.log(`${created ? '✓ Creada' : '  Ya existe'}: ${s.nombre}`)
  }

  // Admin por defecto
  const existe = await Usuario.findOne({ where: { email: 'admin@ritmica.com' } })
  if (!existe) {
    const hash = await Usuario.hashPassword('admin123')
    await Usuario.create({ nombre: 'Administrador', email: 'admin@ritmica.com', password: hash, rol: 'admin' })
    console.log('✓ Usuario admin creado: admin@ritmica.com / admin123')
  }

  console.log('Seed completo.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
