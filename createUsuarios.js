// Ejecutar: node createUsuarios.js
import { sequelize } from './database.js'
import './models/Usuario.js'
import Usuario from './models/Usuario.js'

const USUARIOS = [
  // Admin - directora
  { nombre: 'Eugenia Molina', email: 'eugeniamolina@ritmica.com', password: 'Eugenia2026', rol: 'admin',     profesora_id: null },
  // Profesoras (id según tabla profesoras)
  { nombre: 'Aldana',         email: 'aldana@ritmica.com',        password: 'Aldana2026',  rol: 'profesora', profesora_id: 1 },
  { nombre: 'Carolina',       email: 'carolina@ritmica.com',      password: 'Carolina2026',rol: 'profesora', profesora_id: 2 },
  { nombre: 'Evelyn',         email: 'evelyn@ritmica.com',        password: 'Evelyn2026',  rol: 'profesora', profesora_id: 4 },
  { nombre: 'Guadalupe',      email: 'guadalupe@ritmica.com',     password: 'Guadalupe2026',rol:'profesora', profesora_id: 5 },
  { nombre: 'Laura',          email: 'laura@ritmica.com',         password: 'Laura2026',   rol: 'profesora', profesora_id: 6 },
  { nombre: 'Paula',          email: 'paula@ritmica.com',         password: 'Paula2026',   rol: 'profesora', profesora_id: 7 },
  { nombre: 'Shesla',         email: 'shesla@ritmica.com',        password: 'Shesla2026',  rol: 'profesora', profesora_id: 8 },
  { nombre: 'Silvia',         email: 'silvia@ritmica.com',        password: 'Silvia2026',  rol: 'profesora', profesora_id: 9 },
]

async function run() {
  await sequelize.authenticate()
  console.log('✓ DB conectada')

  // ALTER TABLE: asegurar que existan las columnas nuevas
  const qi = sequelize.getQueryInterface()
  try {
    await sequelize.query(`ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin','recepcion','lectura','profesora') NOT NULL DEFAULT 'recepcion'`)
    console.log('✓ ENUM rol actualizado')
  } catch (e) { console.log('  (rol ENUM ya ok o error menor:', e.message, ')') }

  try {
    await sequelize.query(`ALTER TABLE usuarios ADD COLUMN profesora_id INT NULL DEFAULT NULL`)
    console.log('✓ Columna profesora_id agregada')
  } catch (e) { console.log('  (profesora_id ya existe)') }

  let creados = 0, actualizados = 0
  for (const u of USUARIOS) {
    const hash = await Usuario.hashPassword(u.password)
    const existe = await Usuario.findOne({ where: { email: u.email } })
    if (existe) {
      await existe.update({ nombre: u.nombre, password: hash, rol: u.rol, profesora_id: u.profesora_id, activo: true })
      actualizados++
      console.log(`  ~ actualizado: ${u.email}`)
    } else {
      await Usuario.create({ nombre: u.nombre, email: u.email, password: hash, rol: u.rol, profesora_id: u.profesora_id, activo: true })
      creados++
      console.log(`  + creado: ${u.email}`)
    }
  }

  console.log(`\n✓ Listo: ${creados} creados, ${actualizados} actualizados`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
