import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Community from './pages/Community'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-brand">
            <h1>Somos R</h1>
          </div>
          <ul className="navbar-links">
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/community">Comunidad</Link>
            </li>
            <li>
              <Link to="/messages">Mensajes</Link>
            </li>
            <li>
              <Link to="/profile">Perfil</Link>
            </li>
            <li>
              <Link to="/settings">Configuración</Link>
            </li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/community" element={<Community />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2024 Somos R. Todos los derechos reservados.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
