// Compatibility barrel: re-exports the domain services under `src/api/`.
// Existing pages keep importing from "../../services/api" unchanged until
// they're migrated (Fase 4) to import directly from the domain module they need.
export * from "../api/auth.service";
export * from "../api/branding.service";
export * from "../api/notifications.service";
export * from "../api/landing.service";
export * from "../api/audit.service";
export * from "../api/student.service";
export * from "../api/school.service";
export * from "../api/superadmin.service";
export * from "../api/provincial.service";
export * from "../api/municipal.service";
export * from "../api/escalafon.service";
export * from "../api/results.service";
