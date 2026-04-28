import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

const Profesora = sequelize.define('Profesora', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(100), allowNull: false },
  apellido:    { type: DataTypes.STRING(100), allowNull: false },
  abreviatura: { type: DataTypes.STRING(10) },
  telefono:    { type: DataTypes.STRING(50) },
  email:       { type: DataTypes.STRING(150) },
  activo:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'profesoras', timestamps: false })

export default Profesora
