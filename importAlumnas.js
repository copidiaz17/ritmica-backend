// Ejecutar: node importAlumnas.js
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

import { sequelize } from './database.js'
import './models/Alumna.js'
import './models/AlumnaActividad.js'
import './models/Actividad.js'
import './models/Sede.js'
import './models/Profesora.js'
import Alumna from './models/Alumna.js'

const FILE = 'C:/Users/Usuario/Downloads/Clientes_Santiago Rítmica.xlsx'

// Mapeos
const ESTADO = { 'Activo': 'activa', 'Inactivo': 'baja', 'Visita': 'visita' }
const GENERO = { 'F': 'femenino', 'M': 'masculino' }
const CANAL  = {
  'Redes sociales':      'redes_sociales',
  'Web':                 'redes_sociales',
  'Presencial':          'presencial',
  'Flyers/Posters/Diarios': 'flyers',
  'Recomendación':       'recomendacion',
  'Setup inicial':       'otros',
  'Otros':               'otros',
}

// Convierte serial de Excel a fecha string YYYY-MM-DD
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  const date = XLSX.SSF.parse_date_code(serial)
  if (!date) return null
  const y = date.y
  const m = String(date.m).padStart(2, '0')
  const d = String(date.d).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function run() {
  await sequelize.authenticate()
  await sequelize.sync()
  console.log('✓ DB conectada')

  const wb   = XLSX.readFile(FILE)
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
  console.log(`✓ Excel leído: ${data.length} registros`)

  let creadas = 0, actualizadas = 0, errores = 0

  for (const row of data) {
    try {
      const nombre   = (row['Nombres']  || '').trim()
      const apellido = (row['Apellido'] || '').trim()
      if (!nombre || !apellido) continue

      const payload = {
        nombre,
        apellido,
        documento:               (row['NºDocumento'] || '').toString().replace(/\./g, '').trim() || null,
        estado:                  ESTADO[row['Estado']] || 'baja',
        genero:                  GENERO[row['Género']] || null,
        telefono:                row['Celular']   ? row['Celular'].toString().trim()   : null,
        telefono_fijo:           row['Teléfono']  ? row['Teléfono'].toString().trim()  : null,
        correo:                  row['Mail']       ? row['Mail'].toString().trim()       : null,
        fecha_nacimiento:        excelDate(row['Fecha Nac.']),
        fecha_ingreso:           excelDate(row['Fecha Ing']),
        obra_social:             row['O.Social']   ? row['O.Social'].toString().trim()  : null,
        ocupacion:               row['Ocupación']  ? row['Ocupación'].toString().trim() : null,
        canal_captacion:         CANAL[row['Publicidad']] || 'otros',
        observacion:             row['Observaciones'] ? row['Observaciones'].toString().trim() : null,
        comentarios:             row['Comentarios']   ? row['Comentarios'].toString().trim()   : null,
        contacto_emergencia:     row['Contacto de Emergencia'] ? row['Contacto de Emergencia'].toString().trim() : null,
        nro_cliente:             row['NºSoc.'] ? Number(row['NºSoc.']) : null,
        activo:                  true,
      }

      // Buscar por documento si existe, sino por nombre+apellido
      let alumna = null
      if (payload.documento) {
        alumna = await Alumna.findOne({ where: { documento: payload.documento } })
      }
      if (!alumna) {
        alumna = await Alumna.findOne({ where: { nombre, apellido } })
      }

      if (alumna) {
        await alumna.update(payload)
        actualizadas++
      } else {
        await Alumna.create(payload)
        creadas++
      }
    } catch (err) {
      console.error(`  ✗ Error en ${row['Apellido']} ${row['Nombres']}: ${err.message}`)
      errores++
    }
  }

  console.log(`\n✓ Importación completa:`)
  console.log(`  - Creadas:     ${creadas}`)
  console.log(`  - Actualizadas: ${actualizadas}`)
  console.log(`  - Errores:     ${errores}`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
