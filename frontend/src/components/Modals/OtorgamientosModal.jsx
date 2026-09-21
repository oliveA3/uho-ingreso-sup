import { useEffect, useState } from "react";
import { downloadLandingExcel, fetchLandingCortes, fetchLandingOtorgamientos } from "../../api/landing.service";
import Modal from "./Modal";
import FormField from "../FormField/FormField";
import Select from "../Select/Select";
import Input from "../Input/Input";
import PrimaryButton from "../Buttons/PrimaryButton";
import DataTable from "../DataTable/DataTable";
import styles from "./OtorgamientosModal.module.css";

const cortesColumns = [
  { key: "career", header: "Carrera" },
  { key: "career_code", header: "Código" },
  { key: "index", header: "Índice de corte" },
  { key: "requests_count", header: "Solicitudes" },
];

const otorgamientosColumns = [
  { key: "student", header: "Estudiante" },
  { key: "ci", header: "CI" },
  { key: "career", header: "Carrera" },
  { key: "ces", header: "CES" },
  { key: "award_index", header: "Índice" },
  { key: "province", header: "Provincia" },
];

export default function OtorgamientosModal({ onClose, mode = "otorgamientos" }) {
  const [filters, setFilters] = useState(() => ({
    anio: mode === "cortes" ? "" : new Date().getFullYear(),
    provincia: "",
    ci: "",
    carrera: "",
  }));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (mode === "cortes" ? fetchLandingCortes(filters) : fetchLandingOtorgamientos(filters))
      .then((nextData) => { if (active) { setData(nextData); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, mode]);

  useEffect(() => {
    if (mode === "cortes" && data?.year && filters.anio !== data.year) {
      setFilters((current) => ({ ...current, anio: data.year }));
    }
  }, [data, filters.anio, mode]);

  function changeFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: field === "anio" ? Number(value) : value }));
  }

  async function downloadExcel() {
    try {
      setExporting(true);
      const kind = mode === "cortes" ? "cortes" : "otorgamientos";
      const blob = await downloadLandingExcel(kind, filters);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${kind}_${filters.provincia || "todas"}_${filters.anio}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  const tableData = mode === "cortes" ? data?.items || [] : data?.results || [];
  const hasData = tableData.length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <>
          <span className={styles.eyebrow}>{mode === "cortes" ? "Índices de corte" : "Otorgamiento de carreras"}</span>
          <span className={styles.name}>
            {mode === "cortes" ? `Cortes más solicitados${data?.year ? ` (${data.year})` : ""}` : "Otorgamientos publicados"}
          </span>
        </>
      }
      footer={
        <PrimaryButton
          type="button"
          onClick={downloadExcel}
          disabled={exporting || !hasData}
          className={styles.downloadButton}
        >
          {exporting ? "Descargando..." : "Descargar Excel"}
        </PrimaryButton>
      }
    >
      <div className={styles.filters}>
        <FormField label="Año">
          <Select value={filters.anio} onChange={(event) => changeFilter("anio", event.target.value)}>
            {(data?.years || [new Date().getFullYear()]).map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </FormField>
        <FormField label="Provincia">
          <Select value={filters.provincia} onChange={(event) => changeFilter("provincia", event.target.value)}>
            <option value="">Todas</option>
            {(data?.provinces || []).map((province) => <option key={province} value={province}>{province}</option>)}
          </Select>
        </FormField>
        {mode === "cortes" ? (
          <FormField label="Buscar carrera" className={styles.searchField}>
            <Input value={filters.carrera} onChange={(event) => changeFilter("carrera", event.target.value)} placeholder="Nombre de carrera" />
          </FormField>
        ) : (
          <FormField label="Buscar por CI" className={styles.searchField}>
            <Input value={filters.ci} onChange={(event) => changeFilter("ci", event.target.value)} inputMode="numeric" placeholder="11 dígitos" />
          </FormField>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.tableWrapper}>
        <DataTable
          columns={mode === "cortes" ? cortesColumns : otorgamientosColumns}
          data={tableData}
          loading={loading}
          loadingMessage="Cargando información..."
          emptyMessage={mode === "cortes" ? "No hay índices de corte disponibles." : "No hay otorgamientos para los filtros seleccionados."}
        />
      </div>
    </Modal>
  );
}
