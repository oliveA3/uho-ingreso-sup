import React from 'react'
import { Link } from 'react-router-dom'

export default function SuperAdminSidebar() {
  return (
    <aside className="sb">
      <div className="ui">
        <div className="un">Super Admin</div>
        <div className="ur">Panel de administración</div>
      </div>
      <nav>
        <a className="on"><Link to="/superadmin" style={{color:'inherit',textDecoration:'none'}}>Dashboard</Link></a>
        <a><Link to="/superadmin/nomencladores" style={{color:'inherit',textDecoration:'none'}}>Nomencladores</Link></a>
        <a><Link to="/superadmin/roles" style={{color:'inherit',textDecoration:'none'}}>Roles</Link></a>
        <a><Link to="/superadmin/reportes" style={{color:'inherit',textDecoration:'none'}}>Reportes</Link></a>
      </nav>
    </aside>
  )
}
