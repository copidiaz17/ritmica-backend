import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import Sede from './Sede.js'
import Profesora from './Profesora.js'

const Actividad = sequelize.define('Actividad', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  capacidad:   { type: DataTypes.INTEGER, defaultValue: 20 },
  sede_id:     { type: DataTypes.INTEGER, allowNull: false },
  profesora_id: { type: DataTypes.INTEGER },
  profesora_id_2: { type: DataTypes.INTEGER },
  // Horarios como JSON simple: [{dia: 'Lunes', hora_inicio: '09:00', hora_fin: '10:00'}]
  horarios:    { type: DataTypes.JSON },
  mensualidad: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  activo:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'actividades', timestamps: false })

Actividad.belongsTo(Sede,     { foreignKey: 'sede_id',      as: 'sede' })
Actividad.belongsTo(Profesora,{ foreignKey: 'profesora_id', as: 'profesora' })

export default Actividad
