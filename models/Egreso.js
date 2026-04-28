import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

const Egreso = sequelize.define('Egreso', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  categoria:   { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  monto:       { type: DataTypes.DECIMAL(10,2), allowNull: false },
  fecha:       { type: DataTypes.DATEONLY, allowNull: false },
  medio_pago:  { type: DataTypes.ENUM('efectivo','transferencia','tarjeta'), defaultValue: 'efectivo' },
}, { tableName: 'egresos', timestamps: false })

export default Egreso
