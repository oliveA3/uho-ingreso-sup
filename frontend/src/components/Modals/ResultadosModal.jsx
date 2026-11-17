import { useEffect, useState } from "react";
import { downloadLandingExcel, fetchLandingResults } from "../../api/landing.service";
import Modal from "./Modal";
import FormField from "../FormField/FormField";
import Select from "../Select/Select";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import DataTable from "../DataTable/DataTable";
import styles from "./ResultadosModal.module.css";

const emptyFilters = { anio: new Date().getFullYear(), provincia: "", municipio: "", escuela: "", asignatura: "" };

const fieldLabels = {
  anio: "Año",
  provincia: "Provincia",
  municipio: "Municipio",
  escuela: "Escuela",
  asignatura: "Asignatura",
};

const columns = [
  { key: "student", header: "Estudiante" },
  { key: "subject", header: "Asignatura" },
  { key: "grade", header: "Nota" },
  { key: "school", header: "Escuela" },
  { key: "municipality", header: "Municipio" },
  { key: "province", header: "Provincia" },
];

export default function ResultadosModal({ onClose, user }) {
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    provincia: user?.rol === "estudiante" ? user.provincia_nombre || "" : "",
  }));
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLandingResults({ ...filters, page })
      .then((nextData) => { if (active) { setData(nextData); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page]);

  function changeFilter(field, value) {
    // Cambiar un filtro reinicia la paginación.
    setPage(1);
    setFilters((current) => ({ ...current, [field]: field === "anio" ? Number(value) : value }));
  }

  async function downloadExcel() {
    try {
      setExporting(true);
      const blob = await downloadLandingExcel("resultados", filters);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `notas_${filters.provincia || "todas"}_${filters.anio}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  const options = {
    anio: data?.years || [new Date().getFullYear()],
    provincia: data?.provinces || [],
    municipio: data?.municipalities || [],
    escuela: data?.schools || [],
    asignatura: data?.subjects || [],
  };

  const results = data?.results || [];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <>
          <span className={styles.eyebrow}>Notas de ingreso</span>
          <span className={styles.name}>Resultados de las pruebas</span>
        </>
      }
      footer={
        <PrimaryButton type="button" onClick={downloadExcel} disabled={exporting || !results.length} className={styles.downloadButton}>
          {exporting ? "Descargando..." : "Descargar Excel"}
        </PrimaryButton>
      }
    >
      <div className={styles.filters}>
        {["anio", "provincia", "municipio", "escuela", "asignatura"].map((field) => (
          <FormField key={field} label={fieldLabels[field]}>
            <Select value={filters[field]} onChange={(event) => changeFilter(field, event.target.value)}>
              {field !== "anio" && <option value="">Todos</option>}
              {options[field].map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </FormField>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={results}
          loading={loading}
          loadingMessage="Cargando resultados..."
          emptyMessage={
            data && data.publicacion_habilitada === false
              ? "La consulta pública de estos datos aún no ha sido habilitada por la Comisión de Ingreso."
              : "No hay notas para los filtros seleccionados."
          }
        />
      </div>

      {data?.total_pages > 1 && (
        <div className={styles.paginationRow}>
          <SecondaryButton type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}>
            Anterior
          </SecondaryButton>
          <span className={styles.pageSummary}>
            Página {data.page} de {data.total_pages} · {data.count} registros
          </span>
          <SecondaryButton type="button" onClick={() => setPage((current) => Math.min(data.total_pages, current + 1))} disabled={loading || page >= data.total_pages}>
            Siguiente
          </SecondaryButton>
        </div>
      )}
    </Modal>
  );
}
