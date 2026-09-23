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
      setError("");
      const { provincia, ...schoolFields } = form;
      const payload = { ...schoolFields, municipio: Number(form.municipio) };
      if (editing) await updateProvincialSchool(editing.id, payload);
      else await createProvincialSchool(payload);
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
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
    [dashboard?.representantes_municipales ?? "-", "Usuarios Creados"],
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
    { key: "nombre", header: "Municipio", className: "font-medium text-slate-900", render: (m) => m.nombre },
    { key: "escuelas", header: "Escuelas", render: (m) => m.escuelas_count },
    { key: "representante", header: "Representante Municipal", render: (m) => m.representante?.nombre || "Sin representante" },
    { key: "estado", header: "Estado", render: (m) => (m.activo ? "Activo" : "Inactivo") },
    {
      key: "acciones",
      header: "Acciones",
      render: (m) => (
        <SecondaryButton className="!px-3 !py-2 !text-sm" onClick={() => setSelectedMunicipio(m)}>
          👁 Ver escuelas
        </SecondaryButton>
      ),
    },
  ];

  const schoolColumns = [
    { key: "nombre", header: "Escuela", className: "font-medium text-slate-900", render: (s) => s.nombre },
    { key: "codigo", header: "Código", render: (s) => s.codigo || "-" },
    { key: "estado", header: "Estado", render: (s) => <StatusToggle active={s.activa} onClick={() => toggleSchool(s)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (s) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(s)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(s)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <p className="mb-4 text-sm font-semibold text-slate-600">Provincia: {user?.provincia_nombre || "No asignada"}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">Municipios y Escuelas</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Estructura territorial de la provincia</h1>
            <p className="mt-2 text-sm text-slate-600">Gestiona las escuelas de tu provincia.</p>
          </div>
        </div>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <StatsGrid className="mt-6">
          {stats.map(([value, label]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </StatsGrid>
      </Card>

      <Card padding="p-8" className="overflow-x-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Municipios</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona un municipio para ver sus escuelas.</p>
          </div>
        </div>
        <FormField label="Buscar municipio" className="mt-5 max-w-md">
          <Input type="search" value={municipioSearch} onChange={(event) => setMunicipioSearch(event.target.value)} placeholder="Nombre del municipio" />
        </FormField>
        <DataTable className="table-scroll mt-5" columns={municipioColumns} data={filteredMunicipios} loading={loading} />
      </Card>

      {selectedMunicipio && (
        <Card padding="p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Escuelas de {selectedMunicipio.nombre}</h2>
              <p className="mt-1 text-sm text-slate-600">Las escuelas sí pueden editarse.</p>
            </div>
            <PrimaryButton onClick={openCreate}>+ Agregar Escuela</PrimaryButton>
          </div>
          <FormField label="Buscar escuela" className="mt-5 max-w-md">
            <Input type="search" value={schoolSearch} onChange={(event) => setSchoolSearch(event.target.value)} placeholder="Nombre o código" />
          </FormField>
          <DataTable className="table-scroll mt-5" columns={schoolColumns} data={filteredSchools} />
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
        <form id="repr-provincial-escuela-form" onSubmit={handleSubmit} className="space-y-4">
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
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} className="h-5 w-5" /> Escuela activa
          </label>
        </form>
      </Modal>
    </div>
  );
}
