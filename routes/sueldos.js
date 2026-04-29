import { Router } from 'express'
import { Op } from 'sequelize'
import Cuota from '../models/Cuota.js'
import Alumna from '../models/Alumna.js'
import Actividad from '../models/Actividad.js'
import Profesora from '../models/Profesora.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const PORCENTAJE = 0.40

// GET /api/sueldos?mes=X&anio=Y
// Devuelve el sueldo de cada profesora activa para el período indicado
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'recepcion'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin acceso' })
    }

    const mes  = Number(req.query.mes)
    const anio = Number(req.query.anio)
    if (!mes || !anio) return res.status(400).json({ error: 'mes y anio son requeridos' })

    const profesoras = await Profesora.findAll({ where: { activo: true }, order: [['apellido','ASC'],['nombre','ASC']] })

    const resultado = await Promise.all(profesoras.map(async (profe) => {
      // Alumnas de esta profesora (vía actividades)
      const alumnas = await Alumna.findAll({
        where: { activo: true },
        attributes: ['id', 'nombre', 'apellido'],
        include: [{
          model: Actividad,
          as: 'actividades',
          where: { profesora_id: profe.id },
          required: true,
          through: { attributes: [] },
          attributes: ['id', 'nombre'],
        }],
      })

      const alumnaIds = alumnas.map(a => a.id)
      if (!alumnaIds.length) {
        return {
          profesora: { id: profe.id, nombre: profe.nombre, apellido: profe.apellido },
          alumnas_count: 0,
          total_cuotas: 0,
          sueldo: 0,
          detalle: [],
        }
      }

      // Cuotas del período (mes/anio de la cuota, NO fecha_pago)
      const cuotas = await Cuota.findAll({
        where: { alumna_id: { [Op.in]: alumnaIds }, mes, anio },
        include: [{ model: Alumna, as: 'alumna', attributes: ['id','nombre','apellido'] }],
        order: [['alumna', 'apellido', 'ASC']],
      })

      const total_cuotas = cuotas.reduce((s, c) => s + Number(c.monto), 0)

      return {
        profesora: { id: profe.id, nombre: profe.nombre, apellido: profe.apellido },
        alumnas_count: alumnaIds.length,
        total_cuotas,
        sueldo: Math.round(total_cuotas * PORCENTAJE),
        detalle: cuotas.map(c => ({
          id: c.id,
          alumna: c.alumna,
          monto: Number(c.monto),
          tipo: c.tipo,
          medio_pago: c.medio_pago,
          fecha_pago: c.fecha_pago,
        })),
      }
    }))

    res.json({ mes, anio, porcentaje: PORCENTAJE, profesoras: resultado })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
