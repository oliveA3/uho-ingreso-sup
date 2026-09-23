import { useEffect, useState } from "react";
import {
  createSuperAdminCatalogItem,
  deleteSuperAdminCatalogItem,
  fetchSuperAdminCatalog,
  updateSuperAdminCatalogItem,
} from "../../api/superadmin.service";
import { normalizeCatalogList } from "../../api/httpClient";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, PageHeader, Select, useConfirm } from "../../components";
import styles from "./NomencladoresPage.module.css";

const catalogs = {
  provincias: {
    title: "Provincias",
    icon: "🗺️",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
    ],
    activeField: "activa",
  },
  municipios: {
    title: "Municipios",
    icon: "🏘️",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
    ],
    activeField: "activo",
  },
  escuelas: {
    title: "Escuelas",
    icon: "🏫",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "codigo", label: "Código", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
      { name: "municipio", label: "Municipio", type: "select", optionsKey: "municipios" },
    ],
    activeField: "activa",
  },
  carreras: {
    title: "Carreras",
    icon: "🎓",
    fields: [
      { name: "codigo", label: "Código", type: "text" },
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "ces", label: "Universidad / CES", type: "select", optionsKey: "ces" },
      { name: "provincia", label: "Provincia", type: "select", optionsKey: "provincias" },
    ],
    activeField: "activa",
  },
  ces: {
    title: "CES / Universidades",
    icon: "🏛️",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
    ],
    activeField: "activa",
  },
  asignaturas: {
    title: "Asignaturas",
    icon: "📐",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
    ],
    activeField: "activa",
  },
  "tipos-otorgamiento": {
    title: "Tipos de Otorgamiento",
    icon: "🏷️",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
    ],
    activeField: "activa",
  },
};

function emptyForm(config) {
  return {
    ...Object.fromEntries(config.fields.map((field) => [field.name, ""])),
    [config.activeField]: true,
  };
}

export default function NomencladoresPage() {
  const confirm = useConfirm();
  const [resource, setResource] = useState("provincias");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pageCount, setPageCount] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [referenceOptions, setReferenceOptions] = useState({ ces: [], provincias: [], municipios: [] });
  const [exporting, setExporting] = useState(false);
  const config = catalogs[resource];
  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.nombre, item.codigo, item.descripcion]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = statusFilter === "todos"
      || (statusFilter === "activos" ? Boolean(item[config.activeField]) : !Boolean(item[config.activeField]));
    return matchesSearch && matchesStatus;
  });
  const activeItems = filteredItems.filter((item) => item[config.activeField]).length;

  async function loadItems(requestPage = page) {
    try {
      setError("");
      const response = await fetchSuperAdminCatalog(resource, {
        page: requestPage,
        page_size: pageSize,
        search: search.trim() || undefined,
      });
      const list = normalizeCatalogList(response);
      const total = Number(response?.count || list.length || 0);
      setItems(list);
      setTotalItems(total);
      setPageCount(Math.max(1, Math.ceil(total / pageSize)));
      setPage(requestPage);
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    }
  }

  async function loadReferenceOptions() {
    try {
      const [ces, provincias, municipios] = await Promise.all([
        fetchSuperAdminCatalog("ces"),
        fetchSuperAdminCatalog("provincias"),
        fetchSuperAdminCatalog("municipios"),
      ]);
      setReferenceOptions({
        ces: normalizeCatalogList(ces),
        provincias: normalizeCatalogList(provincias),
        municipios: normalizeCatalogList(municipios),
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    setPage(1);
    setStatusFilter("todos");
    setSearch("");
    setNotice("");
    setEditing(null);
    setForm(emptyForm(catalogs[resource]));
    loadItems(1);
    if (["municipios", "escuelas", "carreras"].includes(resource)) loadReferenceOptions();
  }, [resource]);

  useEffect(() => {
    if (!resource) return;
    loadItems(1);
  }, [search, resource]);

  useEffect(() => {
    if (resource !== "escuelas" || !form.provincia) return;
    fetchSuperAdminCatalog("municipios", { provincia: form.provincia })
      .then((municipios) => setReferenceOptions((current) => ({ ...current, municipios: normalizeCatalogList(municipios) })))
      .catch((requestError) => setError(requestError.message));
  }, [resource, form.provincia]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(config));
    setModalOpen(true);
  }

  function openEdit(item) {
    const municipality = referenceOptions.municipios.find((option) => option.id === item.municipio);
    setEditing(item);
    setForm({
      ...Object.fromEntries(config.fields.map((field) => [field.name, item[field.name] ?? ""])),
      [config.activeField]: item[config.activeField],
      provincia: municipality?.provincia ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = { ...form };
      if (resource === "escuelas") delete payload.provincia;
      config.fields.filter((field) => field.type === "number" || field.type === "select").forEach((field) => {
        payload[field.name] = Number(payload[field.name]);
      });
      if (editing) {
        await updateSuperAdminCatalogItem(resource, editing.id, payload);
      } else {
        await createSuperAdminCatalogItem(resource, payload);
      }
      setModalOpen(false);
      setNotice(`El registro de ${config.title.toLowerCase()} se creó correctamente.`);
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
      setNotice("");
    }
  }

  async function handleDelete(item) {
    const ok = await confirm({
      title: "Eliminar registro",
      message: `¿Eliminar ${item.nombre || item.codigo}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setError("");
      setNotice("");
      await deleteSuperAdminCatalogItem(resource, item.id);
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleActive(item) {
    try {
      setError("");
      setNotice("");
      await updateSuperAdminCatalogItem(resource, item.id, {
        [config.activeField]: !item[config.activeField],
      });
      await loadItems();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleExport() {
    try {
      setError("");
      setExporting(true);
      const response = await fetch(`/api/v1/import-export/export/${resource}/`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("No se pudo exportar el catálogo a Excel.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resource}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Se exportó el catálogo a Excel correctamente.");
    } catch (requestError) {
      setError(requestError.message || "No se pudo exportar el catálogo.");
      setNotice("");
    } finally {
      setExporting(false);
    }
  }

  const columns = [
    { key: "registro", header: "Registro", className: "font-medium text-slate-900", render: (item) => item.nombre || item.codigo },
    {
      key: "descripcion",
      header: "Descripción",
      render: (item) => item.descripcion || "—",
    },
    {
      key: "ultima_modificacion",
      header: "Últ. modificación",
      render: (item) => item.fecha_ultima_modificacion ? new Date(item.fecha_ultima_modificacion).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) : "—",
    },
    {
      key: "estado",
      header: "Estado",
      render: (item) => (
        <StatusToggle
          active={item[config.activeField]}
          onClick={() => toggleActive(item)}
          title={item[config.activeField] ? "Desactivar registro" : "Activar registro"}
        />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(item)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(item)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <PageHeader
          title="📚 Nomencladores"
          subtitle="Administra los catálogos."
          actions={
            <>
              <SecondaryButton onClick={handleExport} disabled={exporting}>
                {exporting ? "Exportando..." : "Exportar Excel"}
              </SecondaryButton>
              <PrimaryButton onClick={openCreate}>+ Nuevo registro</PrimaryButton>
            </>
          }
        />

        <div className={styles.catalogGrid}>
          {Object.entries(catalogs).map(([key, item]) => (
            <button key={key} type="button" onClick={() => setResource(key)} className={`${styles.catalogButton} ${resource === key ? styles.catalogButtonActive : ""}`}>
              <span className={styles.catalogIcon}>{item.icon}</span>
              <span className={styles.catalogTitle}>{item.title}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>{config.title}</h2>
          <div className="flex items-center gap-3">
            <span className={styles.listCount}>
              {filteredItems.length} registrados / {activeItems} activados
            </span>
          </div>
        </div>
        {error && <FeedbackMessage type="error" className="mt-4 rounded-2xl">{error}</FeedbackMessage>}
        {notice && <FeedbackMessage type="success" className="mt-4 rounded-2xl">{notice}</FeedbackMessage>}
        <div className={styles.searchField}>
          <label htmlFor="nomenclador-search" className={styles.searchLabel}>Buscar nomenclador</label>
          <Input
            id="nomenclador-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Buscar en ${config.title.toLowerCase()}...`}
            className="!mt-0"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filtrar por estado</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <span className="ml-auto text-sm text-slate-600">
            Página {page} de {pageCount} · {totalItems} registros
          </span>
        </div>
        <DataTable
          className="table-scroll mt-5"
          columns={columns}
          data={filteredItems}
          emptyMessage={items.length ? "No se encontraron registros." : "No hay registros."}
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <SecondaryButton type="button" onClick={() => loadItems(Math.max(1, page - 1))} disabled={page <= 1}>Anterior</SecondaryButton>
          <SecondaryButton type="button" onClick={() => loadItems(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>Siguiente</SecondaryButton>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? "Editar" : "Nuevo"} ${config.title}`}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="nomenclador-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="nomenclador-form" onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => (
            <FormField
              key={field.name}
              label={field.name === "descripcion" ? `${field.label} (opcional)` : field.label}
            >
              {field.type === "select" ? (
                <Select
                  required
                  value={form[field.name] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm({
                      ...form,
                      [field.name]: value,
                      ...(resource === "escuelas" && field.name === "provincia" ? { municipio: "" } : {}),
                    });
                  }}
                  disabled={resource === "escuelas" && field.name === "municipio" && !form.provincia}
                >
                  <option value="">Selecciona una opción</option>
                  {referenceOptions[field.optionsKey].map((option) => (
                    <option key={option.id} value={option.id}>{option.nombre}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  required={field.name === "nombre" || field.name === "codigo"}
                  type={field.type}
                  value={form[field.name] ?? ""}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                />
              )}
            </FormField>
          ))}
          <label className={styles.activeCheckbox}>
            <input
              type="checkbox"
              checked={Boolean(form[config.activeField])}
              onChange={(event) => setForm({ ...form, [config.activeField]: event.target.checked })}
              className={styles.checkbox}
            />
            Registro activo
          </label>
        </form>
      </Modal>
    </div>
  );
}
