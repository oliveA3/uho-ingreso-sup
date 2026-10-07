import { useEffect, useState } from "react";
import {
  createProvincialSchool,
  deleteProvincialSchool,
  fetchProvincialDashboard,
  fetchProvincialMunicipalities,
  fetchProvincialProvinces,
  fetchProvincialSchools,
  updateProvincialSchool,
} from "../../api/provincial.service";
import { normalizeCatalogList } from "../../api/httpClient";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, Select, StatCard, StatsGrid, useConfirm } from "../../components";
import styles from "./MunicipiosPage.module.css";

const emptySchool = {
  nombre: "",
  codigo: "",
  descripcion: "",
  provincia: "",
  municipio: "",
  activa: true,
};

export default function MunicipiosPage({ user }) {
  const confirm = useConfirm();
  const [dashboard, setDashboard] = useState(null);
  const [schools, setSchools] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [form, setForm] = useState(emptySchool);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [municipioSearch, setMunicipioSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [dashboardData, schoolData] = await Promise.all([
        fetchProvincialDashboard(),
        fetchProvincialSchools(),
      ]);
      setDashboard(dashboardData);
      setSchools(schoolData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    fetchProvincialProvinces()
      .then((data) => {
        const provinces = normalizeCatalogList(data);
        setProvinces(provinces);
        if (provinces.length === 1) {
          setForm((current) => ({ ...current, provincia: String(provinces[0].id) }));
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    if (!form.provincia) return;
    fetchProvincialMunicipalities(form.provincia)
      .then((data) => setMunicipalities(normalizeCatalogList(data)))
      .catch((requestError) => setError(requestError.message));
  }, [form.provincia]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptySchool,
      provincia: selectedMunicipio?.provincia
        ? String(selectedMunicipio.provincia)
        : provinces.length === 1
          ? String(provinces[0].id)
          : "",
      municipio: selectedMunicipio ? String(selectedMunicipio.id) : "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(school) {
    const municipality = (dashboard?.municipios_lista || []).find(
      (item) => item.id === school.municipio
    );
    setEditing(school);
    setForm({
      nombre: school.nombre || "",
      codigo: school.codigo || "",
      descripcion: school.descripcion || "",
      provincia: municipality?.provincia ? String(municipality.provincia) : String(provinces[0]?.id || ""),
      municipio: String(school.municipio || ""),
      activa: school.activa,
    });
    setFormError("");
    setModalOpen(true);
  }

  function schoolsForMunicipio(municipioId) {
    return schools.filter((school) => school.municipio === municipioId);
  }

  function normalizeSearch(value) {
    return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setFormError("");
      const { provincia, ...schoolFields } = form;
      const payload = { ...schoolFields, municipio: Number(form.municipio) };
      if (editing) await updateProvincialSchool(editing.id, payload);
      else await createProvincialSchool(payload);
      setModalOpen(false);
      setNotice(editing ? "La escuela se actualizó correctamente." : "La escuela se creó correctamente.");
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function handleDelete(school) {
    const ok = await confirm({
      title: "Eliminar escuela",
      message: `¿Eliminar la escuela ${school.nombre}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteProvincialSchool(school.id);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleSchool(school) {
    try {
      await updateProvincialSchool(school.id, { activa: !school.activa });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const stats = [
    [dashboard?.municipios ?? "-", "Municipios"],
    [dashboard?.escuelas ?? "-", "Escuelas"],
    [dashboard?.representantes_municipales ?? "-", "Repr. Municipales"],
    [dashboard?.usuarios_creados ?? "-", "Usuarios Creados"],
  ];
  const normalizedMunicipioSearch = normalizeSearch(municipioSearch);
  const filteredMunicipios = (dashboard?.municipios_lista || []).filter((municipio) =>
    normalizeSearch(municipio.nombre).includes(normalizedMunicipioSearch)
  );
  const normalizedSchoolSearch = normalizeSearch(schoolSearch);
  const filteredSchools = selectedMunicipio
    ? schoolsForMunicipio(selectedMunicipio.id).filter((school) =>
        normalizeSearch(`${school.nombre} ${school.codigo || ""}`).includes(normalizedSchoolSearch)
      )
    : [];

  const municipioColumns = [
    { key: "nombre", header: "Municipio", className: styles.strongCell, render: (m) => m.nombre },
    { key: "escuelas", header: "Escuelas", render: (m) => m.escuelas_count },
    { key: "representante", header: "Representante Municipal", render: (m) => m.representante?.nombre || "Sin representante" },
    { key: "estado", header: "Estado", render: (m) => (m.activo ? "Activo" : "Inactivo") },
    {
      key: "acciones",
      header: "Acciones",
      render: (m) => (
        <SecondaryButton onClick={() => setSelectedMunicipio(m)}>
          👁 Ver escuelas
        </SecondaryButton>
      ),
    },
  ];

  const schoolColumns = [
    { key: "nombre", header: "Escuela", className: styles.strongCell, render: (s) => s.nombre },
    { key: "codigo", header: "Código", render: (s) => s.codigo || "-" },
    { key: "estado", header: "Estado", render: (s) => <StatusToggle active={s.activa} onClick={() => toggleSchool(s)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (s) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(s)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className={styles.deleteAction} onClick={() => handleDelete(s)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-6">
        <p className={styles.provinceLabel}>Provincia: {user?.provincia_nombre || "No asignada"}</p>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Municipios y Escuelas</p>
            <h1 className={styles.title}>Estructura territorial de la provincia</h1>
            <p className={styles.subtitle}>Gestiona las escuelas de tu provincia.</p>
          </div>
        </div>
        {notice && <FeedbackMessage type="success" className={styles.feedbackMessage}>{notice}</FeedbackMessage>}
        {error && <FeedbackMessage type="error" className={styles.feedbackMessage}>{error}</FeedbackMessage>}
        <StatsGrid className={styles.statsGrid}>
          {stats.map(([value, label]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </StatsGrid>
      </Card>

      <Card padding="p-6" className={styles.tableCard}>
        <div className={styles.sectionHeaderRow}>
          <div>
            <h2 className={styles.sectionTitle}>Municipios</h2>
            <p className={styles.sectionSubtitle}>Selecciona un municipio para ver sus escuelas.</p>
          </div>
        </div>
        <FormField label="Buscar municipio" className={styles.searchField}>
          <Input type="search" value={municipioSearch} onChange={(event) => setMunicipioSearch(event.target.value)} placeholder="Nombre del municipio" />
        </FormField>
        <DataTable className={`table-scroll ${styles.table}`} columns={municipioColumns} data={filteredMunicipios} loading={loading} />
      </Card>

      {selectedMunicipio && (
        <Card padding="p-6">
          <div className={styles.sectionHeaderRow}>
            <div>
              <h2 className={styles.sectionTitle}>Escuelas de {selectedMunicipio.nombre}</h2>
              <p className={styles.sectionSubtitle}>Las escuelas sí pueden editarse.</p>
            </div>
            <PrimaryButton onClick={openCreate}>+ Agregar Escuela</PrimaryButton>
          </div>
          <FormField label="Buscar escuela" className={styles.searchField}>
            <Input type="search" value={schoolSearch} onChange={(event) => setSchoolSearch(event.target.value)} placeholder="Nombre o código" />
          </FormField>
          <DataTable className={`table-scroll ${styles.table}`} columns={schoolColumns} data={filteredSchools} />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar escuela" : "Nueva escuela"}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="repr-provincial-escuela-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="repr-provincial-escuela-form" onSubmit={handleSubmit} className={styles.form}>
          {formError && <FeedbackMessage type="error" className={styles.formError}>{formError}</FeedbackMessage>}
          <FormField label="Nombre">
            <Input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
          </FormField>
          <FormField label="Código">
            <Input value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} />
          </FormField>
          <FormField label="Descripción">
            <Input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
          </FormField>
          <FormField label="Municipio">
            <Select required value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })} disabled={!form.provincia}>
              <option value="">Selecciona un municipio</option>
              {municipalities.map((municipio) => <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>)}
            </Select>
          </FormField>
          <label className={styles.activeCheckboxRow}>
            <input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} className={styles.checkbox} /> Escuela activa
          </label>
        </form>
      </Modal>
    </div>
  );
}
