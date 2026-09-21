import { useEffect, useState } from "react";
import {
    createProvincialCareer,
    deleteProvincialCareer,
    exportProvincialCareers,
    fetchProvincialCareers,
    fetchProvincialCes,
    fetchProvincialProvinces,
    importProvincialCareers,
    updateProvincialCareer,
} from "../../api/provincial.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, Select, useConfirm } from "../../components";
import styles from "./CarrerasPage.module.css";

const emptyForm = { codigo: "", nombre: "", ces: "", provincia: "" };
const normalize = (value) =>
    String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

export default function CarrerasPage() {
    const confirm = useConfirm();
    const [careers, setCareers] = useState([]);
    const [ces, setCes] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    async function loadCareers(showLoading = true) {
        try {
            if (showLoading) setLoading(true);
            setError("");
            setCareers(await fetchProvincialCareers());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadCareers();
        Promise.all([fetchProvincialProvinces(), fetchProvincialCes()])
            .then(([provinceData, cesData]) => {
                setProvinces(provinceData);
                setCes(cesData);
            })
            .catch((requestError) => setError(requestError.message));
    }, []);
    function openCreate() {
        setEditing(null);
        setForm({ ...emptyForm });
        setModalOpen(true);
    }
    function openEdit(career) {
        setEditing(career);
        setForm({
            codigo: career.codigo,
            nombre: career.nombre,
            ces: String(career.ces),
            provincia: String(career.provincia),
        });
        setModalOpen(true);
    }
    async function handleSubmit(event) {
        event.preventDefault();
        try {
            setBusy(true);
            setError("");
            const payload = {
                ...form,
                ces: Number(form.ces),
                provincia: Number(form.provincia),
                activa: editing?.activa ?? true,
            };
            if (editing) await updateProvincialCareer(editing.id, payload);
            else await createProvincialCareer(payload);
            setModalOpen(false);
            await loadCareers(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }
    async function toggleCareer(career) {
        try {
            await updateProvincialCareer(career.id, { activa: !career.activa });
            await loadCareers(false);
        } catch (requestError) {
            setError(requestError.message);
        }
    }
    async function handleDelete(career) {
        const ok = await confirm({
            title: "Eliminar carrera",
            message: `¿Eliminar la carrera ${career.nombre}?`,
            confirmLabel: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;
        try {
            await deleteProvincialCareer(career.id);
            await loadCareers(false);
        } catch (requestError) {
            setError(requestError.message);
        }
    }
    async function handleImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setBusy(true);
            setError("");
            setNotice("");
            const result = await importProvincialCareers(file);
            setImportOpen(false);
            setNotice(`Catálogo reemplazado. ${result.inserted} carreras importadas.`);
            await loadCareers(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
            event.target.value = "";
        }
    }
    async function handleExport() {
        try {
            const blob = await exportProvincialCareers();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "carreras.xlsx";
            link.click();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    const filteredCareers = careers.filter((career) =>
        normalize(career.nombre).includes(normalize(search)),
    );

    const columns = [
        { key: "codigo", header: "Código", render: (c) => c.codigo },
        { key: "nombre", header: "Nombre", className: styles.strongCell, render: (c) => c.nombre },
        { key: "ces", header: "CES", render: (c) => c.ces_nombre },
        { key: "provincia", header: "Provincia", render: (c) => c.provincia_nombre },
        { key: "estado", header: "Estado", render: (c) => <StatusToggle active={c.activa} activeLabel="Activa" inactiveLabel="Inactiva" onClick={() => toggleCareer(c)} /> },
        {
            key: "acciones",
            header: "Acciones",
            render: (c) => (
                <>
                    <EntityActionButton variant="edit" onClick={() => openEdit(c)}>Editar</EntityActionButton>
                    <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(c)}>Eliminar</EntityActionButton>
                </>
            ),
        },
    ];

    return (
        <div className={styles.page}>
            <Card padding="p-8">
                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.eyebrow}>
                            Catálogo de Carreras
                        </p>
                        <h1 className={styles.title}>
                            Lista de carreras
                        </h1>
                        <p className={styles.description}>
                            Gestiona el catálogo oficial.
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <PrimaryButton className={styles.darkButton} onClick={openCreate}>+ Añadir Carrera</PrimaryButton>
                        <PrimaryButton onClick={() => setImportOpen(true)}>Importar Excel</PrimaryButton>
                        <SecondaryButton onClick={handleExport}>Exportar Excel</SecondaryButton>
                    </div>
                </div>
                {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
                {notice && <FeedbackMessage type="success" className="mt-5 rounded-2xl">{notice}</FeedbackMessage>}
            </Card>
            <Card padding="p-8">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre" className={styles.searchInput} />
                <DataTable className={styles.table} columns={columns} data={filteredCareers} loading={loading} emptyMessage="No hay carreras para mostrar." />
            </Card>
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? "Editar carrera" : "Nueva carrera"}
                footer={
                    <>
                        <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={busy} type="submit" form="carrera-form">{busy ? "Guardando..." : "Guardar"}</PrimaryButton>
                    </>
                }
            >
                <form id="carrera-form" onSubmit={handleSubmit} className={styles.formGrid}>
                    {[["Código", "codigo"], ["Nombre", "nombre"]].map(([label, field]) => (
                        <FormField key={field} label={label}>
                            <Input required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
                        </FormField>
                    ))}
                    {[["CES", "ces", ces], ["Provincia", "provincia", provinces]].map(([label, field, options]) => (
                        <FormField key={field} label={label}>
                            <Select required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}>
                                <option value="">Selecciona {label.toLowerCase()}</option>
                                {options.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}
                            </Select>
                        </FormField>
                    ))}
                </form>
            </Modal>
            <Modal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                title="Importar carreras"
                footer={<SecondaryButton onClick={() => setImportOpen(false)}>Cancelar</SecondaryButton>}
            >
                <p className={styles.importText}>El catálogo actual será reemplazado por las filas del Excel.</p>
                <p className={styles.importHint}>Columnas: Código, Nombre, CES, Provincia.</p>
                <Input type="file" accept=".xlsx,.xls" onChange={handleImport} className={styles.importInput} />
            </Modal>
        </div>
    );
}
