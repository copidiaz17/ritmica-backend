import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

const Alumna = sequelize.define('Alumna', {
  id:                      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:                  { type: DataTypes.STRING(100), allowNull: false },
  apellido:                { type: DataTypes.STRING(100), allowNull: false },
  direccion:               { type: DataTypes.STRING(255) },
  apodo:                   { type: DataTypes.STRING(50) },
  fecha_nacimiento:        { type: DataTypes.DATEONLY },
  genero:                  { type: DataTypes.ENUM('femenino','masculino','otro') },
  documento:               { type: DataTypes.STRING(20) },
  telefono:                { type: DataTypes.STRING(50) },
  telefono_emergencia:     { type: DataTypes.STRING(50) },
  contacto_emergencia:     { type: DataTypes.STRING(100) },
  correo:                  { type: DataTypes.STRING(150) },
  obra_social:             { type: DataTypes.STRING(100) },
  certificado_medico:      { type: DataTypes.DATEONLY },
  vencimiento_certificado: { type: DataTypes.DATEONLY },
  foto:                    { type: DataTypes.STRING(255) },
  estado:                  { type: DataTypes.ENUM('activa','visita','baja','suspendida'), allowNull: false, defaultValue: 'activa' },
  nro_cliente:             { type: DataTypes.INTEGER },
  ocupacion:               { type: DataTypes.STRING(100) },
  telefono_fijo:           { type: DataTypes.STRING(50) },
  fecha_ingreso:           { type: DataTypes.DATEONLY },
  canal_captacion:         { type: DataTypes.ENUM('redes_sociales','presencial','flyers','recomendacion','otros'), defaultValue: 'otros' },
  observacion:             { type: DataTypes.TEXT },
  comentarios:             { type: DataTypes.TEXT },
  activo:                  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'alumnas', timestamps: true, createdAt: 'creado_en', updatedAt: false })

export default Alumna
