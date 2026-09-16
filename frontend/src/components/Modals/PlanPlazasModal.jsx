import { useEffect, useMemo, useState } from "react";
import { downloadPlanPlazaExport } from "../../services/api";
import Modal from "./Modal";
import FormField from "../FormField/FormField";
import Input from "../Input/Input";
import Select from "../Select/Select";
import PrimaryButton from "../Buttons/PrimaryButton";
import DataTable from "../DataTable/DataTable";
import styles from "./PlanPlazasModal.module.css";

export default function PlanPlazasModal({ items = [], years = [], defaultProvince = "Todos", onClose }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear());
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince === "Todas" ? "Todos" : (defaultProvince || "Todos"));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (years.length && !years.includes(selectedYear)) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  useEffect(() => {
    if (defaultProvince === "Todas" || defaultProvince === "Todos") setSelectedProvince("Todos");
    else if (defaultProvince) setSelectedProvince(defaultProvince);
  }, [defaultProvince]);

  const normalizedItems = useMemo(() =>
    items.map((item, index) => ({
      id: item.id ?? index,
      carrera: item.nombre_carrera ?? item.carrera_nombre ?? item.carrera ?? "Sin carrera",
      provincia: item.provincia ?? item.provincia_nombre ?? "—",
      ces: item.ces_nombre ?? item.ces ?? "—",
      sexo: item.sexo ?? "A",
      plazas: item.cantidad_plazas ?? item.plazas ?? 0,
      year: item.year ?? item.anio ?? new Date().getFullYear(),
      tipo: item.otorgamiento_tipo || item.tipo_otorgamiento_label || "Municipal",
    })),
  [items]);

  const availableYears = useMemo(() =>
    Array.from(new Set(years.length ? years : normalizedItems.map((item) => item.year))).sort((a, b) => b - a),
  [years, normalizedItems]);

  const availableProvinces = useMemo(() =>
    Array.from(new Set(normalizedItems.map((item) => item.provincia).filter(Boolean))).sort(),
  [normalizedItems]);

  const filtered = useMemo(() => normalizedItems.filter((item) => {
    const matchYear = String(item.year) === String(selectedYear);
    const matchProvince = selectedProvince === "Todos" || item.provincia === selectedProvince;
    const matchSearch = [item.carrera, item.provincia, item.ces, item.sexo].some((value) =>
      String(value ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const matchFilter = filter === "Todos" || item.sexo === filter;
    return matchYear && matchProvince && matchSearch && matchFilter;
  }), [normalizedItems, selectedYear, selectedProvince, search, filter]);

  const handleDownload = async () => {
    try {
      setExporting(true);
      const blob = await downloadPlanPlazaExport({
        anio: selectedYear,
        provincia: selectedProvince === "Todos" ? "" : selectedProvince,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plan_plazas_${(selectedProvince === "Todos" ? "todos" : selectedProvince).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "No se pudo descargar el Excel.");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { key: "carrera", header: "Carrera" },
    { key: "plazas", header: "Plazas" },
    {
      key: "tipo",
      header: "Tipo",
      render: (row) => (
        <span className={`${styles.badge} ${row.tipo === "Municipal" ? styles.badgeMunicipal : styles.badgeOther}`}>
          {row.tipo}
        </span>
      ),
    },
    { key: "ces", header: "CES" },
    { key: "sexo", header: "Sexo" },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <>
          <span className={styles.eyebrow}>Plan de Plazas</span>
          <span className={styles.name}>
            {selectedYear ? `Plan de Plazas ${selectedYear}` : "Plan de Plazas"}
            {selectedProvince && selectedProvince !== "Todos" ? ` - ${selectedProvince}` : ""}
          </span>
        </>
      }
      footer={
        <PrimaryButton type="button" onClick={handleDownload} disabled={exporting || filtered.length === 0} className={styles.downloadButton}>
          {exporting ? "Descargando..." : "Descargar Excel"}
        </PrimaryButton>
      }
    >
      <div className={styles.filters}>
        <FormField label="Buscar" className={styles.searchField}>
          <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Carrera, provincia, CES" />
        </FormField>
        <FormField label="Año">
          <Select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </FormField>
        <FormField label="Sexo">
          <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="Todos">Todos</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="A">A</option>
          </Select>
        </FormField>
        <FormField label="Provincia" className={styles.searchField}>
          <Select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)}>
            <option value="Todos">Todas</option>
            {availableProvinces.map((province) => <option key={province} value={province}>{province}</option>)}
          </Select>
        </FormField>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No hay planes de plazas para los filtros seleccionados."
        />
      </div>
    </Modal>
  );
}
