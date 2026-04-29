import { sequelize } from './database.js'

const mes  = 4
const anio = 2026

// Profesoras activas
const [profesoras] = await sequelize.query(`SELECT id, nombre, apellido FROM profesoras WHERE activo = 1`)
console.log('PROFESORAS ACTIVAS:', profesoras.length)
profesoras.forEach(p => console.log(`  [${p.id}] ${p.apellido}, ${p.nombre}`))

// Actividades con profesora asignada
const [acts] = await sequelize.query(`SELECT id, nombre, profesora_id FROM actividades WHERE activo = 1 AND profesora_id IS NOT NULL`)
console.log('\nACTIVIDADES CON PROFESORA:', acts.length)
acts.forEach(a => console.log(`  [${a.id}] ${a.nombre} → profesora_id=${a.profesora_id}`))

// Alumnas con actividad asignada (muestra de 5)
const [aa] = await sequelize.query(`SELECT alumna_id, actividad_id FROM alumna_actividades LIMIT 5`)
console.log('\nALUMNA_ACTIVIDADES (muestra):', aa)

// Cuotas del período
const [cuotas] = await sequelize.query(`SELECT COUNT(*) as total, SUM(monto) as suma FROM cuotas WHERE mes=${mes} AND anio=${anio}`)
console.log(`\nCUOTAS ${mes}/${anio}:`, cuotas[0])

// Cruce: cuotas de alumnas que están en actividades con profesora
const [cruce] = await sequelize.query(`
  SELECT p.id as prof_id, p.apellido, COUNT(c.id) as cuotas, SUM(c.monto) as total
  FROM profesoras p
  JOIN actividades act ON act.profesora_id = p.id AND act.activo = 1
  JOIN alumna_actividades aa ON aa.actividad_id = act.id
  JOIN cuotas c ON c.alumna_id = aa.alumna_id AND c.mes = ${mes} AND c.anio = ${anio}
  WHERE p.activo = 1
  GROUP BY p.id, p.apellido
`)
console.log('\nCRUCE PROFESORA-CUOTAS:', cruce)

process.exit(0)
