const XLSX = require('xlsx')
const mysql = require('mysql2/promise')
const path  = require('path')
const fs    = require('fs')

// Leer .env manual
const envPath = path.join(__dirname, '.env')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER, password: env.DB_PASS, database: env.DB_NAME,
    ssl: env.DB_SSL === 'true' ? { ca: fs.readFileSync(path.join(__dirname, 'aiven-ca.crt')) } : undefined,
  })

  // 1. Agregar columna tipo a cuotas si no existe
  const [[cuotasCols]] = await conn.query("SHOW COLUMNS FROM cuotas LIKE 'tipo'")
  if (!cuotasCols) {
    await conn.query("ALTER TABLE cuotas ADD COLUMN tipo ENUM('cuota','inscripcion') NOT NULL DEFAULT 'cuota' AFTER anio")
    console.log('✓ Columna tipo agregada a cuotas')
  } else {
    console.log('  tipo ya existe en cuotas')
  }

  // 2. Agregar columna direccion a alumnas si no existe
  const [[alumnasCols]] = await conn.query("SHOW COLUMNS FROM alumnas LIKE 'direccion'")
  if (!alumnasCols) {
    await conn.query("ALTER TABLE alumnas ADD COLUMN direccion VARCHAR(255) NULL AFTER apellido")
    console.log('✓ Columna direccion agregada a alumnas')
  } else {
    console.log('  direccion ya existe en alumnas')
  }

  // 3. Leer Excel y cargar direcciones
  const wb   = XLSX.readFile('C:/Users/Usuario/Downloads/Clientes_Santiago Rítmica.xlsx')
  const data  = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])

  let actualizadas = 0, noEncontradas = 0

  for (const row of data) {
    const doc = String(row['NºDocumento'] || '').replace(/\D/g, '').trim()
    if (!doc) continue

    // Construir dirección completa
    const parts = [
      row['Dirección'] || '',
      row['Numero']    ? String(row['Numero']) : '',
      row['Piso']      ? `Piso ${row['Piso']}` : '',
      row['Barrio']    || '',
    ].map(s => String(s).trim()).filter(Boolean)
    const direccion = parts.join(' ').trim()
    if (!direccion) continue

    const [[alumna]] = await conn.query(
      "SELECT id FROM alumnas WHERE REPLACE(REPLACE(documento,' ',''),'.','') = ?",
      [doc]
    )
    if (alumna) {
      await conn.query("UPDATE alumnas SET direccion = ? WHERE id = ?", [direccion, alumna.id])
      actualizadas++
    } else {
      noEncontradas++
    }
  }

  console.log(`✓ Direcciones cargadas: ${actualizadas} alumnas actualizadas, ${noEncontradas} no encontradas por documento`)
  await conn.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
