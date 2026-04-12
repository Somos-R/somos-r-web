import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page-container">
      <h1>Bienvenido a Somos R</h1>
      <p>Esta es la página de inicio de la aplicación.</p>
      <div className="home-features">
        <h2>Características principales</h2>
        <ul>
          <li><Link to="/community">Únete a la comunidad</Link></li>
          <li><Link to="/messages">Envía mensajes</Link></li>
          <li><Link to="/profile">Gestiona tu perfil</Link></li>
        </ul>
      </div>
    </div>
  )
}
