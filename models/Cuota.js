import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import Alumna from './Alumna.js'

const Cuota = sequelize.define('Cuota', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  alumna_id:    { type: DataTypes.INTEGER, allowNull: false },
  mes:          { type: DataTypes.INTEGER, allowNull: false },   // 1-12
  anio:         { type: DataTypes.INTEGER, allowNull: false },
  monto:        { type: DataTypes.DECIMAL(10,2), allowNull: false },
  fecha_pago:   { type: DataTypes.DATEONLY, allowNull: false },
  medio_pago:   { type: DataTypes.ENUM('efectivo','transferencia','tarjeta','mercadopago'), defaultValue: 'efectivo' },
  recibo_nro:   { type: DataTypes.INTEGER },
  observacion:  { type: DataTypes.TEXT },
}, { tableName: 'cuotas', timestamps: false })

Cuota.belongsTo(Alumna, { foreignKey: 'alumna_id', as: 'alumna' })
Alumna.hasMany(Cuota,   { foreignKey: 'alumna_id', as: 'cuotas' })

export default Cuota
