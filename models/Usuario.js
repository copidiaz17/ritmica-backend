import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import bcrypt from 'bcryptjs'

const Usuario = sequelize.define('Usuario', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:   { type: DataTypes.STRING(100), allowNull: false },
  email:    { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol:          { type: DataTypes.ENUM('admin', 'recepcion', 'lectura', 'profesora'), allowNull: false, defaultValue: 'recepcion' },
  profesora_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  activo:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'usuarios', timestamps: false })

Usuario.prototype.checkPassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

Usuario.hashPassword = (plain) => bcrypt.hash(plain, 10)

export default Usuario
