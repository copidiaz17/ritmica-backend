import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

const Sede = sequelize.define('Sede', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:    { type: DataTypes.STRING(150), allowNull: false },
  direccion: { type: DataTypes.STRING(255) },
  telefono:  { type: DataTypes.STRING(50) },
  activo:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'sedes', timestamps: false })

export default Sede
