export const landingStage = {
  label: "Publicación y Validación del Escalafón",
  description: "La etapa activa para la provincia es la Boleta de Interés. Los estudiantes pueden registrarse y consultar el plan de plazas oficial.",
  status: "Boleta de Interés",
  dates: "10/01 al 20/01/2025",
  active: true,
};

export const timelineSteps = [
  { id: 1, number: 1, title: "Escalafón", status: "done", date: "10–20 Ene" },
  { id: 2, number: 2, title: "Boleta de Interés", status: "act", date: "22–30 Ene" },
  { id: 3, number: 3, title: "Solicitud", status: "pending", date: "1–10 Feb" },
  { id: 4, number: 4, title: "Pruebas", status: "pending", date: "15–17 Feb" },
  { id: 5, number: 5, title: "Resultados", status: "pending", date: "25 Feb" },
  { id: 6, number: 6, title: "Otorgamiento", status: "pending", date: "10 Mar" },
];

export const newsItems = [
  {
    id: 1,
    title: "Inicio del proceso de Ingreso 2025",
    category: "Comunicado",
    date: "08 Ene 2025",
    description: "El proceso da inicio con la publicación del escalafón en todas las escuelas.",
    mediaType: "imagen",
    mediaUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    title: "Requisitos para estudiantes de 12mo",
    category: "Guía",
    date: "05 Ene 2025",
    description: "Conozca los pasos para inscribirse en el proceso de ingreso a la Educación Superior.",
    mediaType: "video",
    mediaUrl: "#",
  },
  {
    id: 3,
    title: "Oferta de carreras 2025",
    category: "Oferta",
    date: "03 Ene 2025",
    description: "La UHo y otras instituciones ofrecen 47 carreras para el curso diurno 2025-2026.",
    mediaType: "documento",
    mediaUrl: "#",
  },
  {
    id: 4,
    title: "Índices de corte 2024",
    category: "Reporte",
    date: "15 Dic 2024",
    description: "Consulte los índices de corte del proceso anterior por carrera.",
    mediaType: "imagen",
    mediaUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80",
  },
];

export const planPlazas = [
  { id: 1, carrera: "Ingeniería Informática", municipio: "Holguín", ces: "UHo", sexo: "A", plazas: 60, year: 2025 },
  { id: 2, carrera: "Medicina", municipio: "Holguín", ces: "UCMH", sexo: "A", plazas: 45, year: 2025 },
  { id: 3, carrera: "Derecho", municipio: "Holguín", ces: "UHo", sexo: "A", plazas: 30, year: 2025 },
  { id: 4, carrera: "Contabilidad y Finanzas", municipio: "Banes", ces: "UHo", sexo: "A", plazas: 40, year: 2024 },
  { id: 5, carrera: "Biotecnología", municipio: "Gibara", ces: "UHo", sexo: "A", plazas: 35, year: 2024 },
];

export const cutoffIndices = [
  { id: 1, carrera: "Derecho", year: 2024, index: 912 },
  { id: 2, carrera: "Ingeniería Informática", year: 2024, index: 912 },
  { id: 3, carrera: "Medicina", year: 2024, index: 951 },
];

export const offerings = [
  { id: 1, title: "Ingeniería Informática", description: "Programa con enfoque en proyectos locales y desarrollo de software.", institution: "Universidad de Holguín" },
  { id: 2, title: "Derecho", description: "Formación jurídica con énfasis en el sistema legal cubano.", institution: "Universidad de Holguín" },
  { id: 3, title: "Medicina", description: "Carrera de alto prestigio para el sistema de salud nacional.", institution: "Universidad de Ciencias Médicas de Holguín" },
];
