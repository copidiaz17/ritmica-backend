import { Router } from 'express'
import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })

    const user = await Usuario.findOne({ where: { email: email.toLowerCase().trim(), activo: true } })
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const ok = await user.checkPassword(password)
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, profesora_id: user.profesora_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )
    res.json({ token, nombre: user.nombre, rol: user.rol })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
