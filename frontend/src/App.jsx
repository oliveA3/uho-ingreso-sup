import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { fetchCurrentUser, logout } from "./api/auth.service";
import styles from "./App.module.css";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { ConfirmDialogProvider } from "./components/ConfirmDialog/ConfirmDialogProvider";
import { SidebarSelector } from "./components/Sidebar/SidebarSelector";
import LandingNav from "./components/LandingNav/LandingNav";
import Footer from "./components/Footer/Footer";
import StageOneGuard from "./components/StageOneGuard/StageOneGuard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import PolicyPrivacyPage from "./pages/PolicyPrivacyPage";
import ChangePasswordPage from "./pages/Auth/ChangePasswordPage";
import SuperAdminLayout from "./pages/Superadmin/SuperAdminLayout";
import DashboardPage from "./pages/Superadmin/DashboardPage";
import NomencladoresPage from "./pages/Superadmin/NomencladoresPage";
import RolesPage from "./pages/Superadmin/RolesPage";
import UsuariosPage from "./pages/Superadmin/UsuariosPage";
import DesplieguePage from "./pages/Superadmin/DesplieguePage";
import IdentidadPage from "./pages/Superadmin/IdentidadPage";
import AuditLogsPage from "./pages/JefeComision/LogsPage";
import EstudianteLayout from "./pages/Estudiante/EstudianteLayout";
import EstudianteHomePage from "./pages/Estudiante/HomePage";
import EstudiantePerfilPage from "./pages/Estudiante/PerfilPage";
import BoletaPage from "./pages/Estudiante/BoletaSolicitudPage";
import EstudianteEscalafonPage from "./pages/Estudiante/EscalafonPage";
import ResultadosPage from "./pages/Estudiante/ResultadosPage";
import EstudianteBoletaInteresPage from "./pages/Estudiante/BoletaInteresPage";
import EstudianteConfirmacionPruebasPage from "./pages/Estudiante/ConfirmacionPruebasPage";
import EstudianteOtorgamientoPage from "./pages/Estudiante/OtorgamientoPage";
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
import RepresentanteProvincialLayout from "./pages/ReprProvincial/RepresentanteProvincialLayout";
import ReprProvMunicipios from "./pages/ReprProvincial/MunicipiosPage";
import ReprProvUsuarios from "./pages/ReprProvincial/UsuariosPage";
import RepresentanteMunicipalLayout from "./pages/ReprMunicipal/RepresentanteMunicipalLayout";
import ReprMunicipalEscuelas from "./pages/ReprMunicipal/EscuelasPage";
import ReprMunicipalUsuarios from "./pages/ReprMunicipal/UsuariosPage";
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
import DirectorLayout from "./pages/Director/DirectorLayout";
import DirectorDashboardPage from "./pages/Director/DashboardPage";
import DirectorBoletaInteresPage from "./pages/Director/BoletaInteresPage";
import DirectorBoletasSolicitudPage from "./pages/Director/BoletasSolicitudPage";
import DirectorConfirmacionPruebasPage from "./pages/Director/ConfirmacionPruebasPage";
import DirectorOtorgamientosPage from "./pages/Director/OtorgamientosPage";
import DirectorResultadosPage from "./pages/Director/ResultadosPage";

function AppContent() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  // En escritorio el menú lateral arranca desplegado; en móvil se abre bajo demanda para no tapar el contenido.
  const [isMenuOpen, setIsMenuOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const { theme } = useTheme();

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
      setIsMenuOpen(false);
      window.location.assign("/");
    }
  };

  return (
      <>
        <LandingNav
          user={user}
          visualConfig={theme}
          onLogout={handleLogout}
          onViewPlan={() => window.dispatchEvent(new CustomEvent("open-plan-plazas"))}
        />

      <div className={styles.page}>
        <div className={styles.body}>
          {user && !user.debe_cambiar_password && isMenuOpen && <div className={styles.backdrop} onClick={() => setIsMenuOpen(false)} />}
          {user && !user.debe_cambiar_password && (
            <div
              className={`${styles.sidebarWrapper} ${isMenuOpen ? styles.sidebarWrapperOpen : styles.sidebarWrapperCollapsed}`}
            >
              {isMenuOpen && (
                <div className={styles.sidebarPanel}>
                  <div className={styles.sidebarScroll}>
                    <SidebarSelector user={user} onLogout={handleLogout} />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className={`${styles.toggleButton} ${isMenuOpen ? styles.toggleButtonOpen : ""}`}
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={isMenuOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={styles.icon}
                >
                  {isMenuOpen ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
                </svg>
              </button>
            </div>
          )}
          <main id="main-content" className={`${styles.content} ${isMenuOpen ? styles.contentShifted : ""}`}>
            {user?.debe_cambiar_password ? (
              <ChangePasswordPage
                onChanged={() => setUser((current) => ({ ...current, debe_cambiar_password: false }))}
                onLogout={handleLogout}
              />
            ) : (
            <Routes>
              <Route path="/" element={<LandingPage user={user} />} />
              <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/politica-privacidad" element={<PolicyPrivacyPage />} />
              <Route path="/superadmin/*" element={<SuperAdminLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<DashboardPage user={user} />} />
                <Route path="dashboard" element={<DashboardPage user={user} />} />
                <Route path="nomencladores" element={<NomencladoresPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="despliegue" element={<DesplieguePage />} />
                <Route path="identidad" element={<IdentidadPage />} />
                <Route path="logs" element={<AuditLogsPage />} />
              </Route>
              <Route path="/estudiante/*" element={<EstudianteLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<EstudianteHomePage user={user} />} />
                <Route path="perfil" element={<EstudiantePerfilPage />} />
                <Route path="boleta" element={<StageOneGuard stageNumber={3} stageName="Plan de plazas y boleta de solicitud" panelName="Boleta de Solicitud"><BoletaPage /></StageOneGuard>} />
                <Route path="escalafon" element={<StageOneGuard panelName="Escalafón"><EstudianteEscalafonPage /></StageOneGuard>} />
                <Route path="boleta-interes" element={<StageOneGuard stageNumber={2} stageName="Boleta de Interés de Carrera" panelName="Boleta de Interés"><EstudianteBoletaInteresPage /></StageOneGuard>} />
                <Route path="confirmacion-pruebas" element={<StageOneGuard stageNumber={4} stageName="Confirmación de las pruebas de ingreso" panelName="Confirmación de Pruebas"><EstudianteConfirmacionPruebasPage /></StageOneGuard>} />
                <Route path="resultados" element={<StageOneGuard stageNumber={5} stageName="Publicación de resultados en las pruebas de ingreso" panelName="Resultados de tus Pruebas"><ResultadosPage /></StageOneGuard>} />
                <Route path="otorgamiento" element={<StageOneGuard stageNumber={6} stageName="Otorgamiento de carreras" panelName="Mi Otorgamiento"><EstudianteOtorgamientoPage /></StageOneGuard>} />
              </Route>
              <Route path="/jefe_comision/*" element={<JefeComisionLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<JefeComisionDashboard user={user} />} />
                <Route path="dashboard" element={<JefeComisionDashboard user={user} />} />
                <Route path="etapas" element={<JefeComisionEtapas />} />
                <Route path="escalafones" element={<StageOneGuard panelName="Escalafones"><JefeComisionEscalafones /></StageOneGuard>} />
                <Route path="plazas" element={<StageOneGuard stageNumber={3} stageName="Plan de plazas y boleta de solicitud" panelName="Plan de Plazas"><JefeComisionPlazas /></StageOneGuard>} />
                <Route path="solicitudes" element={<StageOneGuard stageNumber={3} stageName="Plan de plazas y boleta de solicitud" panelName="Solicitudes"><JefeComisionSolicitudes /></StageOneGuard>} />
                <Route path="resultados" element={<StageOneGuard stageNumber={5} stageName="Publicación de resultados en las pruebas de ingreso" panelName="Gestión de Resultados"><JefeComisionResultados /></StageOneGuard>} />
                <Route path="otorgamiento" element={<StageOneGuard stageNumber={6} stageName="Otorgamiento de carreras" panelName="Gestión de Otorgamientos"><JefeComisionOtorgamiento /></StageOneGuard>} />
                <Route path="api" element={<JefeComisionApi />} />
                <Route path="logs" element={<JefeComisionLogs />} />
                <Route path="carreras" element={<JefeComisionCarreras />} />
              </Route>
              <Route path="/repr_provincial/*" element={<RepresentanteProvincialLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<ReprProvMunicipios user={user} />} />
                <Route path="dashboard" element={<Navigate to="/repr_provincial/municipios" replace />} />
                <Route path="municipios" element={<ReprProvMunicipios user={user} />} />
                <Route path="usuarios" element={<ReprProvUsuarios />} />
              </Route>
              <Route path="/repr_municipal/*" element={<RepresentanteMunicipalLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<Navigate to="escuelas" replace />} />
                <Route path="dashboard" element={<Navigate to="/repr_municipal/escuelas" replace />} />
                <Route path="escuelas" element={<ReprMunicipalEscuelas user={user} />} />
                <Route path="usuarios" element={<ReprMunicipalUsuarios />} />
              </Route>
              <Route path="/secretario/*" element={<SecretarioLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<SecretarioDashboardPage user={user} />} />
                <Route path="dashboard" element={<SecretarioDashboardPage user={user} />} />
                <Route path="escalafon" element={<StageOneGuard panelName="Escalafón"><SecretarioEscalafonPage /></StageOneGuard>} />
                <Route path="sincuenta" element={<SecretarioSinCuentaPage />} />
                <Route path="boleta-interes" element={<StageOneGuard stageNumber={2} stageName="Boleta de Interés de Carrera" panelName="Boleta de Interés"><SecretarioBoletaInteresPage user={user} /></StageOneGuard>} />
                <Route path="boletas-solicitud" element={<StageOneGuard stageNumber={3} stageName="Plan de plazas y boleta de solicitud" panelName="Boletas de Solicitud"><SecretarioBoletasSolicitudPage /></StageOneGuard>} />
                <Route path="confirmacion-pruebas" element={<StageOneGuard stageNumber={4} stageName="Confirmación de las pruebas de ingreso" panelName="Confirmación de Pruebas"><SecretarioConfirmacionPruebasPage /></StageOneGuard>} />
                <Route path="resultados" element={<StageOneGuard stageNumber={5} stageName="Publicación de resultados en las pruebas de ingreso" panelName="Resultados"><SecretarioResultadosPage /></StageOneGuard>} />
                <Route path="otorgamientos" element={<SecretarioOtorgamientosPage />} />
                <Route path="notificaciones" element={<SecretarioNotificacionesPage />} />
              </Route>
              <Route path="/director/*" element={<DirectorLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DirectorDashboardPage user={user} />} />
                <Route path="sincuenta" element={<SecretarioSinCuentaPage />} />
                <Route path="boleta-interes" element={<StageOneGuard stageNumber={2} stageName="Boleta de Interés de Carrera" panelName="Boletas de Interés"><DirectorBoletaInteresPage user={user} /></StageOneGuard>} />
                <Route path="boletas-solicitud" element={<StageOneGuard stageNumber={3} stageName="Plan de plazas y boleta de solicitud" panelName="Estadísticas de Boletas"><DirectorBoletasSolicitudPage /></StageOneGuard>} />
                <Route path="confirmacion-pruebas" element={<StageOneGuard stageNumber={4} stageName="Confirmación de las pruebas de ingreso" panelName="Estadísticas de Confirmación"><DirectorConfirmacionPruebasPage /></StageOneGuard>} />
                <Route path="otorgamientos" element={<StageOneGuard stageNumber={6} stageName="Otorgamiento de carreras" panelName="Otorgamientos"><DirectorOtorgamientosPage /></StageOneGuard>} />
                <Route path="resultados" element={<StageOneGuard stageNumber={5} stageName="Publicación de resultados en las pruebas de ingreso" panelName="Resultados"><DirectorResultadosPage /></StageOneGuard>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            )}
          </main>
        </div>

        <Footer />
      </div>
      </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ConfirmDialogProvider>
          <AppContent />
        </ConfirmDialogProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
