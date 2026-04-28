import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import Alumna from './Alumna.js'
import Actividad from './Actividad.js'

// Tabla pivote: una alumna puede estar en múltiples actividades
const AlumnaActividad = sequelize.define('AlumnaActividad', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  alumna_id:    { type: DataTypes.INTEGER, allowNull: false },
  actividad_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY },
}, { tableName: 'alumna_actividades', timestamps: false })

Alumna.belongsToMany(Actividad, { through: AlumnaActividad, foreignKey: 'alumna_id',    as: 'actividades' })
Actividad.belongsToMany(Alumna, { through: AlumnaActividad, foreignKey: 'actividad_id', as: 'alumnas' })

export default AlumnaActividad
