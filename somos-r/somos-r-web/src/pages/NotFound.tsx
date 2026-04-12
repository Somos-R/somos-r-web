import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page-container">
      <h1>404 - Página no encontrada</h1>
      <p>La página que buscas no existe.</p>
      <Link to="/" className="back-home-link">Volver a inicio</Link>
    </div>
  )
}
