import { Router } from 'express'
import { sequelize } from '../database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const PORCENTAJE = 0.40

// GET /api/sueldos?mes=X&anio=Y
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'recepcion'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin acceso' })
    }

    const mes  = Number(req.query.mes)
    const anio = Number(req.query.anio)
    if (!mes || !anio) return res.status(400).json({ error: 'mes y anio son requeridos' })

    // Profesoras activas
    const [profesoras] = await sequelize.query(
      `SELECT id, nombre, apellido FROM profesoras WHERE activo = 1 ORDER BY apellido, nombre`
    )

    // Para cada profesora: alumnas en sus grupos + cuotas del período
    const resultado = await Promise.all(profesoras.map(async (profe) => {
      // Contar alumnas únicas en los grupos de esta profesora
      const [[{ alumnas_count }]] = await sequelize.query(`
        SELECT COUNT(DISTINCT aa.alumna_id) as alumnas_count
        FROM actividades act
        JOIN alumna_actividades aa ON aa.actividad_id = act.id
        WHERE act.profesora_id = ? AND act.activo = 1
      `, { replacements: [profe.id] })

      // Cuotas del período de esas alumnas (con detalle)
      const [cuotas] = await sequelize.query(`
        SELECT c.id, c.monto, c.tipo, c.medio_pago, c.fecha_pago,
               a.id as alumna_id, a.nombre as alumna_nombre, a.apellido as alumna_apellido
        FROM cuotas c
        JOIN alumna_actividades aa ON aa.alumna_id = c.alumna_id
        JOIN actividades act ON act.id = aa.actividad_id AND act.profesora_id = ? AND act.activo = 1
        JOIN alumnas a ON a.id = c.alumna_id
        WHERE c.mes = ? AND c.anio = ?
        GROUP BY c.id
        ORDER BY a.apellido, a.nombre
      `, { replacements: [profe.id, mes, anio] })

      const total_cuotas = cuotas.reduce((s, c) => s + Number(c.monto), 0)

      return {
        profesora: { id: profe.id, nombre: profe.nombre, apellido: profe.apellido },
        alumnas_count: Number(alumnas_count),
        total_cuotas,
        sueldo: Math.round(total_cuotas * PORCENTAJE),
        detalle: cuotas.map(c => ({
          id: c.id,
          alumna: { id: c.alumna_id, nombre: c.alumna_nombre, apellido: c.alumna_apellido },
          monto: Number(c.monto),
          tipo: c.tipo || 'cuota',
          medio_pago: c.medio_pago,
          fecha_pago: c.fecha_pago,
        })),
      }
    }))

    res.json({ mes, anio, porcentaje: PORCENTAJE, profesoras: resultado })
  } catch (err) {
    console.error('sueldos error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
