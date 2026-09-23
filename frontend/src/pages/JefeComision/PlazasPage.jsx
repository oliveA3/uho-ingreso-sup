import { useEffect, useRef, useState } from "react";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import StageStatusNotice from "../../components/StageStatusNotice/StageStatusNotice";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";
import styles from "./PlazasPage.module.css";
import {
  createPlanPlaza,
  deletePlanPlaza,
  fetchPlanPlazas,
  fetchProvincialCareers,
  fetchProvincialCes,
  fetchProvincialProvinces,
  fetchProvincialProceso,
  fetchProvincialTiposOtorgamiento,
  importPlanPlaza,
  updatePlanPlaza,
} from "../../api/provincial.service";
import { normalizeCatalogList } from "../../api/httpClient";

const emptyForm = {
  carrera: "",
  cantidad_plazas: 1,
  otorgamiento_tipo: "",
  ces: "",
  provincia: "",
  sexo: "A",
  proceso: "",
};

export default function PlazasPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [careers, setCareers] = useState([]);
  const [ces, setCes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [process, setProcess] = useState(null);
  const [stageStatus, setStageStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);
  const stageFinished = stageStatus === "completada";

  async function load() {
    try {
      setError("");
      setItems(await fetchPlanPlazas());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    Promise.all([
      fetchProvincialCareers(),
      fetchProvincialCes(),
      fetchProvincialProvinces(),
      fetchProvincialProceso(),
      fetchProvincialTiposOtorgamiento(),
    ])
      .then(([careerData, cesData, provinceData, processData, tiposData]) => {
        setCareers(normalizeCatalogList(careerData));
        setCes(normalizeCatalogList(cesData));
        setProvinces(normalizeCatalogList(provinceData));
        setProcess(processData);
        setTipos(normalizeCatalogList(tiposData));
        setForm((current) => ({ ...current, proceso: processData?.id || "" }));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);
  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        carrera: Number(form.carrera),
        ces: Number(form.ces),
        provincia: Number(form.provincia),
        proceso: Number(form.proceso),
        cantidad_plazas: Number(form.cantidad_plazas),
        otorgamiento_tipo: Number(form.otorgamiento_tipo),
      };
      if (editingId) await updatePlanPlaza(editingId, payload);
      else await createPlanPlaza(payload);
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      setNotice("Plan de plazas guardado.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const shouldImport = await confirm({
      title: "Importar plan de plazas",
      message: `Se importarán las plazas de "${file.name}", actualizando las plazas ya existentes que coincidan. ¿Deseas continuar?`,
      confirmLabel: "Importar",
      tone: "danger",
    });
    if (!shouldImport) {
      event.target.value = "";
      return;
    }
    setImporting(true);
    try {
      const result = await importPlanPlaza(file);
      setNotice(
        `${result.inserted} registros insertados y ${result.updated} actualizados.`,
      );
      if (result.errors?.length) {
        const detail = result.errors
          .map((item) => `${item.row}: ${item.error}`)
          .join(" | ");
        setError(detail);
      } else {
        setError("");
      }
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      proceso: item.proceso,
      carrera: item.carrera,
      cantidad_plazas: item.cantidad_plazas,
      otorgamiento_tipo: item.otorgamiento_tipo,
      ces: item.ces,
      provincia: item.provincia,
      sexo: item.sexo,
    });
    setFormOpen(true);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm, proceso: process?.id || "" });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function remove(item) {
    const ok = await confirm({
      title: "Eliminar registro",
      message: `¿Eliminar ${item.nombre_carrera}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deletePlanPlaza(item.id);
      setNotice("Registro eliminado.");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    { key: "codigo", header: "Código", render: (item) => item.codigo_carrera },
    { key: "carrera", header: "Carrera", className: styles.strongCell, render: (item) => item.nombre_carrera },
    { key: "plazas", header: "Plazas", render: (item) => item.cantidad_plazas },
    { key: "tipo", header: "Tipo", render: (item) => item.tipo_otorgamiento_label },
    { key: "ces", header: "CES", render: (item) => item.ces_nombre },
    { key: "provincia", header: "Provincia", render: (item) => item.provincia_nombre },
    { key: "sexo", header: "Sexo", render: (item) => item.sexo },
    ...(stageFinished
      ? []
      : [
          {
            key: "acciones",
            header: "Acciones",
            render: (item) => (
              <>
                <EntityActionButton variant="edit" onClick={() => edit(item)}>Editar</EntityActionButton>
                <EntityActionButton variant="delete" className="ml-2" onClick={() => remove(item)}>Eliminar</EntityActionButton>
              </>
            ),
          },
        ]),
  ];

  return (
    <div className={styles.page}>
      <Card padding="p-8">
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>
              Etapa 3
            </p>
            <h1 className={styles.title}>
              Gestión del Plan de Plazas
            </h1>
            <p className={styles.description}>
              Importa y administra las plazas oficiales por carrera.
            </p>
          </div>
          <div className={styles.actions}>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              className={styles.hiddenInput}
              disabled={stageFinished || importing}
              onChange={handleImport}
            />
            <PrimaryButton onClick={() => fileInput.current?.click()} disabled={stageFinished || importing}>
              {importing ? "Importando..." : "Importar Excel"}
            </PrimaryButton>
            <PrimaryButton className={styles.darkButton} onClick={openCreateForm} disabled={stageFinished}>
              Añadir carrera
            </PrimaryButton>
          </div>
        </div>
        {error && <FeedbackMessage type="error" className="mt-5 rounded-xl">{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className="mt-5 rounded-xl">{notice}</FeedbackMessage>}
        <StageStatusNotice stageNumber={3} onStatusChange={setStageStatus} />
      </Card>
      <Card padding="p-0" className={styles.tableCard}>
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          loadingMessage="Cargando plan de plazas..."
          emptyMessage="No hay registros."
          className={styles.tableUnwrapped}
        />
      </Card>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingId ? "Editar plaza" : "Añadir carrera al plan"}
        description="Completa los datos del registro de plazas."
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={closeForm}>Cancelar</SecondaryButton>
            <PrimaryButton className="!bg-slate-900 hover:!bg-slate-800" type="submit" form="plaza-form" disabled={stageFinished}>
              {editingId ? "Actualizar" : "Añadir"}
            </PrimaryButton>
          </>
        }
      >
        <form id="plaza-form" onSubmit={save} className={styles.formGrid}>
          <FormField label="Carrera">
            <Select required value={form.carrera} onChange={updateField("carrera")}>
              <option value="">Selecciona una carrera</option>
              {careers.map((career) => (
                <option key={career.id} value={career.id}>{career.codigo} · {career.nombre}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cantidad de plazas">
            <Input required min="1" type="number" value={form.cantidad_plazas} onChange={updateField("cantidad_plazas")} />
          </FormField>
          <FormField label="Tipo de otorgamiento">
            <Select required value={form.otorgamiento_tipo} onChange={updateField("otorgamiento_tipo")}>
              <option value="">Selecciona una opción</option>
              {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="CES">
            <Select required value={form.ces} onChange={updateField("ces")}>
              <option value="">Selecciona un CES</option>
              {ces.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Provincia">
            <Select required value={form.provincia} onChange={updateField("provincia")}>
              <option value="">Selecciona una provincia</option>
              {provinces.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Proceso">
            <Select required value={form.proceso} onChange={updateField("proceso")}>
              <option value="">Selecciona un proceso</option>
              {process && <option value={process.id}>{new Date(process.anio).getFullYear()}</option>}
            </Select>
          </FormField>
          <FormField label="Sexo">
            <Select value={form.sexo} onChange={updateField("sexo")}>
              <option value="A">A (Ambos)</option>
              <option value="F">F (Mujeres)</option>
              <option value="M">M (Hombres)</option>
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
