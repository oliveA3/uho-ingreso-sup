export const cesDetails = [
  {
    match: "universidad central marta abreu de las villas",
    description: "Universidad pública cubana con sede principal en Santa Clara, orientada a la formación de pregrado y posgrado, la investigación y la innovación.",
    sedePrincipal: "Santa Clara, Villa Clara",
    sedes: "Campus principal en Santa Clara; el portal oficial no publica una cifra consolidada de sedes.",
    website: "https://www.uclv.edu.cu/",
    admissions: "https://www.uclv.edu.cu/ingreso/",
    sourceLabel: "Sitio oficial UCLV",
  },
  {
    match: "universidad de camaguey",
    description: "Institución de educación superior de Camagüey que desarrolla formación universitaria, posgrado e investigación para el territorio.",
    sedePrincipal: "Camagüey, Camagüey",
    sedes: "Sede principal en la ciudad de Camagüey; consultar el portal oficial para la estructura vigente de sedes.",
    website: "https://www.ucamaguey.edu.cu/",
    admissions: "https://www.ucamaguey.edu.cu/",
    sourceLabel: "Sitio oficial Universidad de Camagüey",
  },
  {
    match: "universidad de holguin",
    description: "Universidad pública de Holguín dedicada a la formación de profesionales, la investigación y la vinculación con el desarrollo económico y social de la provincia.",
    sedePrincipal: "Holguín, Holguín",
    sedes: "Sede principal en la ciudad de Holguín; consultar el portal oficial para la estructura vigente de sedes.",
    website: "https://www.uho.edu.cu/",
    admissions: "https://www.uho.edu.cu/",
    sourceLabel: "Sitio oficial Universidad de Holguín",
  },
  {
    match: "universidad de la habana",
    description: "La universidad más antigua de Cuba, con formación e investigación en ciencias, humanidades, economía, derecho y otras áreas del conocimiento.",
    sedePrincipal: "La Habana, Cuba",
    sedes: "Facultades y centros distribuidos en La Habana; el portal oficial no publica una cifra única de sedes.",
    website: "https://www.uh.cu/",
    admissions: "https://www.uh.cu/",
    sourceLabel: "Sitio oficial Universidad de La Habana",
  },
  {
    match: "universidad de oriente",
    description: "Universidad pública con sede en Santiago de Cuba que aporta formación profesional, investigación y extensión universitaria al oriente del país.",
    sedePrincipal: "Santiago de Cuba, Cuba",
    sedes: "Sede principal en Santiago de Cuba; consultar el portal oficial para la estructura vigente de sedes.",
    website: "https://www.uo.edu.cu/",
    admissions: "https://www.uo.edu.cu/",
    sourceLabel: "Sitio oficial Universidad de Oriente",
  },
];

export function getCesDetails(name) {
  const normalizedName = String(name || "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  return cesDetails.find((item) => item.match === normalizedName) || {
    description: "Información institucional disponible en el sitio oficial del centro.",
    sedePrincipal: "No especificada",
    sedes: "Consultar el sitio oficial.",
    website: "",
    admissions: "",
    sourceLabel: "Información institucional",
  };
}