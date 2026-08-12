import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { fetchCurrentUser, logout } from "./services/api";
import { SidebarSelector } from "./components/Sidebar/SidebarSelector";
import LandingNav from "./components/LandingNav";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import SuperAdminLayout from "./pages/Superadmin/SuperAdminLayout";
import DashboardPage from "./pages/Superadmin/DashboardPage";
import NomencladoresPage from "./pages/Superadmin/NomencladoresPage";
import RolesPage from "./pages/Superadmin/RolesPage";
import UsuariosPage from "./pages/Superadmin/UsuariosPage";
import DesplieguePage from "./pages/Superadmin/DesplieguePage";
import IdentidadPage from "./pages/Superadmin/IdentidadPage";
import EstudianteLayout from "./pages/Estudiante/EstudianteLayout";
import EstudianteHomePage from "./pages/Estudiante/HomePage";
import BoletaPage from "./pages/Estudiante/BoletaPage";
import ResultadosPage from "./pages/Estudiante/ResultadosPage";
import JefeComisionLayout from "./pages/JefeComision/JefeComisionLayout";
import JefeComisionDashboard from "./pages/JefeComision/DashboardPage";
import JefeComisionEtapas from "./pages/JefeComision/EtapasPage";
import JefeComisionEscalafones from "./pages/JefeComision/EscalafonesPage";
import JefeComisionPlazas from "./pages/JefeComision/PlazasPage";
import JefeComisionSolicitudes from "./pages/JefeComision/SolicitudesPage";
import JefeComisionResultados from "./pages/JefeComision/ResultadosPage";
import JefeComisionOtorgamiento from "./pages/JefeComision/OtorgamientoPage";
import JefeComisionApi from "./pages/JefeComision/ApiPage";
import JefeComisionLogs from "./pages/JefeComision/LogsPage";
import JefeComisionCarreras from "./pages/JefeComision/CarrerasPage";
import RepresentanteProvincialLayout from "./pages/RepresentanteProvincial/RepresentanteProvincialLayout";
import ReprProvDashboard from "./pages/RepresentanteProvincial/DashboardPage";
import ReprProvMunicipios from "./pages/RepresentanteProvincial/MunicipiosPage";
import ReprProvUsuarios from "./pages/RepresentanteProvincial/UsuariosPage";
import RepresentanteMunicipalLayout from "./pages/RepresentanteMunicipal/RepresentanteMunicipalLayout";
import ReprMunicipalDashboard from "./pages/RepresentanteMunicipal/DashboardPage";
import ReprMunicipalUsuarios from "./pages/RepresentanteMunicipal/UsuariosPage";
import SecretarioLayout from "./pages/Secretario/SecretarioLayout";
import SecretarioDashboardPage from "./pages/Secretario/DashboardPage";
import SecretarioEscalafonPage from "./pages/Secretario/EscalafonPage";
import SecretarioSinCuentaPage from "./pages/Secretario/SinCuentaPage";
import SecretarioBoletaInteresPage from "./pages/Secretario/BoletaInteresPage";
import SecretarioBoletasSolicitudPage from "./pages/Secretario/BoletasSolicitudPage";
import SecretarioConfirmacionPruebasPage from "./pages/Secretario/ConfirmacionPruebasPage";
import SecretarioResultadosPage from "./pages/Secretario/ResultadosPage";
import SecretarioOtorgamientosPage from "./pages/Secretario/OtorgamientosPage";
import SecretarioNotificacionesPage from "./pages/Secretario/NotificacionesPage";

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const data = await fetchCurrentUser();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }
    loadCurrentUser();
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <BrowserRouter>
      <LandingNav
        user={user}
        onLogout={handleLogout}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div className="h-full w-full max-w-sm rounded-r-3xl border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <SidebarSelector user={user} />
          </div>
        </div>
      )}
      
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/superadmin/*" element={<SuperAdminLayout user={user} />}>
              <Route index element={<DashboardPage user={user} />} />
              <Route path="dashboard" element={<DashboardPage user={user} />} />
              <Route path="nomencladores" element={<NomencladoresPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="despliegue" element={<DesplieguePage />} />
              <Route path="identidad" element={<IdentidadPage />} />
            </Route>
            <Route path="/estudiante/*" element={<EstudianteLayout user={user} />}>
              <Route index element={<EstudianteHomePage user={user} />} />
              <Route path="boleta" element={<BoletaPage />} />
              <Route path="resultados" element={<ResultadosPage />} />
            </Route>
            <Route path="/jefe_comision/*" element={<JefeComisionLayout user={user} />}>
              <Route index element={<JefeComisionDashboard />} />
              <Route path="dashboard" element={<JefeComisionDashboard />} />
              <Route path="etapas" element={<JefeComisionEtapas />} />
              <Route path="escalafones" element={<JefeComisionEscalafones />} />
              <Route path="plazas" element={<JefeComisionPlazas />} />
              <Route path="solicitudes" element={<JefeComisionSolicitudes />} />
              <Route path="resultados" element={<JefeComisionResultados />} />
              <Route path="otorgamiento" element={<JefeComisionOtorgamiento />} />
              <Route path="api" element={<JefeComisionApi />} />
              <Route path="logs" element={<JefeComisionLogs />} />
              <Route path="carreras" element={<JefeComisionCarreras />} />
            </Route>
            <Route path="/repr_provincial/*" element={<RepresentanteProvincialLayout user={user} />}>
              <Route index element={<ReprProvDashboard />} />
              <Route path="dashboard" element={<ReprProvDashboard />} />
              <Route path="municipios" element={<ReprProvMunicipios />} />
              <Route path="usuarios" element={<ReprProvUsuarios />} />
            </Route>
            <Route path="/repr_municipal/*" element={<RepresentanteMunicipalLayout user={user} />}>
              <Route index element={<ReprMunicipalDashboard />} />
              <Route path="dashboard" element={<ReprMunicipalDashboard />} />
              <Route path="usuarios" element={<ReprMunicipalUsuarios />} />
            </Route>
            <Route path="/secretario/*" element={<SecretarioLayout user={user} />}>
              <Route index element={<SecretarioDashboardPage />} />
              <Route path="dashboard" element={<SecretarioDashboardPage />} />
              <Route path="escalafon" element={<SecretarioEscalafonPage />} />
              <Route path="sincuenta" element={<SecretarioSinCuentaPage />} />
              <Route path="boleta-interes" element={<SecretarioBoletaInteresPage />} />
              <Route path="boletas-solicitud" element={<SecretarioBoletasSolicitudPage />} />
              <Route path="confirmacion-pruebas" element={<SecretarioConfirmacionPruebasPage />} />
              <Route path="resultados" element={<SecretarioResultadosPage />} />
              <Route path="otorgamientos" element={<SecretarioOtorgamientosPage />} />
              <Route path="notificaciones" element={<SecretarioNotificacionesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
