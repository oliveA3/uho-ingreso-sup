export default function HeroSection({ onViewPlan, onViewResults, onViewAwards, isAuthenticated, activeStageNumber }) {
  const currentYear = new Date().getFullYear();
  const closestStage = [3, 5, 6].reduce((closest, stage) => {
    if (activeStageNumber == null) return closest;
    return Math.abs(stage - activeStageNumber) < Math.abs(closest - activeStageNumber) ? stage : closest;
  }, 3);

  return (
    <section className="mb-2 rounded-[2rem] bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-500 px-6 py-12 text-white shadow-lg sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">Proceso de Ingreso {currentYear}</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">IngresoSUP</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-cyan-100 sm:text-lg">
          Información oficial sobre el proceso de solicitud y otorgamiento de carreras del Curso Diurno. Accede a noticias, planes de plazas, índices de corte y oferta de carreras. 
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onViewPlan}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${closestStage === 3 ? "bg-white text-sky-700 hover:bg-slate-100" : "border border-white/30 bg-white/10 text-white hover:bg-white/20"}`}
          >
            📋 Ver planes de plazas
          </button>
          {isAuthenticated && <button
            type="button"
            onClick={onViewResults}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${closestStage === 5 ? "bg-white text-sky-700 hover:bg-slate-100" : "border border-white/30 bg-white/10 text-white hover:bg-white/20"}`}
          >
            📊 Ver notas de pruebas
          </button>}
          {isAuthenticated && <button type="button" onClick={onViewAwards} className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${closestStage === 6 ? "bg-white text-sky-700 hover:bg-slate-100" : "border border-white/30 bg-white/10 text-white hover:bg-white/20"}`}>
            🎓 Ver otorgamientos
          </button>}
        </div>
      </div>
    </section>
  );
}
