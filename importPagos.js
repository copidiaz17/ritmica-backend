// Ejecutar: node importPagos.js
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
import { Op } from 'sequelize'
import { sequelize } from './database.js'
import './models/Alumna.js'
import './models/Cuota.js'
import Alumna from './models/Alumna.js'
import Cuota from './models/Cuota.js'

const FILE = 'C:/Users/Usuario/Downloads/Pagos_Detalles_Santiago Rítmica.xlsx'

const MEDIO = {
  'Efectivo':       'efectivo',
  'Mercado Pago':   'mercadopago',
  'Cuenta Bancaria':'transferencia',
}

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  const d = XLSX.SSF.parse_date_code(serial)
  if (!d) return null
  return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
}

// Cache de alumnas para no hacer N queries
const cacheDoc  = new Map()
const cacheNombre = new Map()

async function findAlumna(dni, clienteStr) {
  // 1. Por documento
  if (dni) {
    const doc = dni.toString().replace(/\./g,'').trim()
    if (cacheDoc.has(doc)) return cacheDoc.get(doc)
    const a = await Alumna.findOne({ where: { documento: doc } })
    cacheDoc.set(doc, a)
    if (a) return a
  }

  // 2. Por nombre completo (el campo "Cliente" viene como "Nombre Apellido" o "Apellido Nombre")
  if (clienteStr) {
    const key = clienteStr.trim().toLowerCase()
    if (cacheNombre.has(key)) return cacheNombre.get(key)

    // Intentar split: buscar por las palabras en nombre y apellido
    const partes = clienteStr.trim().split(/\s+/)
    if (partes.length >= 2) {
      // Probar primera palabra como apellido
      const a = await Alumna.findOne({
        where: {
          [Op.or]: [
            { apellido: { [Op.like]: `%${partes[0]}%` }, nombre: { [Op.like]: `%${partes[1]}%` } },
            { nombre: { [Op.like]: `%${partes[0]}%` }, apellido: { [Op.like]: `%${partes[1]}%` } },
          ]
        }
      })
      cacheNombre.set(key, a)
      return a
    }
  }
  return null
}

async function run() {
  await sequelize.authenticate()
  console.log('✓ DB conectada')

  const wb    = XLSX.readFile(FILE)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw   = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // Los datos empiezan en la fila índice 4 (0-based)
  const rows = raw.slice(4).filter(r => r[0] && r[5] && r[7])
  console.log(`✓ Excel leído: ${rows.length} registros de pago`)

  let creados = 0, duplicados = 0, sinAlumna = 0, errores = 0

  for (const row of rows) {
    const [fechaSerial, cliente, dni, categoria, mes, anio, vencSerial, importe,, metodoPago,, detalle] = row

    // Saltar filas sin mes/año válido
    if (!mes || !anio || mes === 0) continue

    const fechaPago = excelDate(fechaSerial)
    if (!fechaPago) continue

    try {
      const alumna = await findAlumna(dni, cliente)
      if (!alumna) { sinAlumna++; continue }

      // Evitar duplicados: mismo alumna + mes + año + importe
      const existe = await Cuota.findOne({
        where: { alumna_id: alumna.id, mes: Number(mes), anio: Number(anio), monto: Number(importe) }
      })
      if (existe) { duplicados++; continue }

      await Cuota.create({
        alumna_id:  alumna.id,
        mes:        Number(mes),
        anio:       Number(anio),
        monto:      Number(importe),
        fecha_pago: fechaPago,
        medio_pago: MEDIO[metodoPago] || 'efectivo',
        observacion: [categoria, detalle].filter(Boolean).join(' · ') || null,
      })
      creados++

      if (creados % 100 === 0) process.stdout.write(`  ${creados} creados...\r`)

    } catch (err) {
      errores++
      if (errores <= 5) console.error(`  ✗ ${cliente}: ${err.message}`)
    }
  }

  console.log(`\n✓ Importación completa:`)
  console.log(`  - Pagos creados:    ${creados}`)
  console.log(`  - Duplicados:       ${duplicados}`)
  console.log(`  - Sin alumna match: ${sinAlumna}`)
  console.log(`  - Errores:          ${errores}`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
