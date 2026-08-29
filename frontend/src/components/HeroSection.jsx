export default function HeroSection({ onViewPlan }) {
  return (
    <section className="mb-2 rounded-[2rem] bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-500 px-6 py-12 text-white shadow-lg sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">Proceso de Ingreso 2025</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">IngresoSUP — Información oficial del proceso de solicitud y otorgamiento.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-cyan-100 sm:text-lg">
          Accede a noticias, planes de plazas, índices de corte y oferta de carreras. Este frontend consume APIs REST y está
          diseñado para crecer con los futuros módulos de boletas, escalafón y reportes.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onViewPlan}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-sky-700 transition hover:bg-slate-100"
          >
            📋 Ver planes de plazas
          </button>
          <a
            href="#noticias"
            className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            📰 Ver noticias
          </a>
        </div>
      </div>
    </section>
  );
}
