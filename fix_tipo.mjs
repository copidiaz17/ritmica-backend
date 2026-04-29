import { sequelize } from './database.js'

const [[col]] = await sequelize.query(`SHOW COLUMNS FROM cuotas LIKE 'tipo'`)
if (!col) {
  await sequelize.query(`ALTER TABLE cuotas ADD COLUMN tipo ENUM('cuota','inscripcion') NOT NULL DEFAULT 'cuota' AFTER anio`)
  console.log('✓ Columna tipo agregada a cuotas en Aiven')
} else {
  console.log('  tipo ya existía')
}

const [[col2]] = await sequelize.query(`SHOW COLUMNS FROM alumnas LIKE 'direccion'`)
if (!col2) {
  await sequelize.query(`ALTER TABLE alumnas ADD COLUMN direccion VARCHAR(255) NULL AFTER apellido`)
  console.log('✓ Columna direccion agregada a alumnas en Aiven')
} else {
  console.log('  direccion ya existía')
}

process.exit(0)
