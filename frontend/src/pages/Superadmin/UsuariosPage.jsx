import { useEffect, useState } from "react";
import {
  createSuperAdminUser,
  deleteSuperAdminUser,
  fetchSuperAdminStudents,
  fetchSuperAdminCatalog,
  fetchSuperAdminUsers,
  updateSuperAdminUser,
} from "../../api/superadmin.service";
import EntityActionButton from "../../components/Buttons/EntityActionButton";
import StatusToggle from "../../components/Buttons/StatusToggle";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import SecondaryButton from "../../components/Buttons/SecondaryButton";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, FormField, Input, Modal, PageHeader, Select, useConfirm } from "../../components";
import styles from "./UsuariosPage.module.css";

const roles = [
  ["superadmin", "Super Administrador"],
  ["jefe_comision", "Jefe de Comisión"],
  ["ingreso_provincial", "Repr. Provincial"],
  ["ingreso_municipal", "Repr. Municipal"],
  ["director_escuela", "Director de Escuela"],
  ["secretario_escuela", "Secretario de Escuela"],
  ["estudiante", "Estudiante"],
];

const fieldLabels = {
  username: "Usuario",
  email: "Correo",
  first_name: "Nombre",
  last_name: "Apellidos",
};

const emptyForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  rol: "secretario_escuela",
  provincia: "",
  municipio: "",
  escuela: "",
  password: "",
  is_active: true,
};

export default function UsuariosPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({ rol: "", provincia: "", estado: "" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState({ anio: "", provincia: "", ci: "" });
  const [studentYears, setStudentYears] = useState([]);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      setUsers(await fetchSuperAdminUsers(filters));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuperAdminCatalog("provincias")
      .then(setProvinces)
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    setSchools([]);
    if (!form.provincia) return;
    fetchSuperAdminCatalog("municipios", { provincia: form.provincia })
      .then(setMunicipalities)
      .catch((requestError) => setError(requestError.message));
  }, [form.provincia]);

  useEffect(() => {
    setSchools([]);
    if (!form.municipio) return;
    fetchSuperAdminCatalog("escuelas", { municipio: form.municipio })
      .then(setSchools)
      .catch((requestError) => setError(requestError.message));
  }, [form.municipio]);

  const needsMunicipality = form.rol === "ingreso_municipal" || form.rol === "director_escuela" || form.rol === "secretario_escuela";
  const needsSchool = form.rol === "director_escuela" || form.rol === "secretario_escuela";

  useEffect(() => {
    loadUsers();
  }, [filters.rol, filters.provincia, filters.estado]);

  useEffect(() => {
    if (!studentsModalOpen) return;
    async function loadStudents() {
      try {
        setStudentsLoading(true);
        const data = await fetchSuperAdminStudents(studentFilters);
        setStudents(data);
        if (!studentFilters.anio) {
          setStudentYears([...new Set(data.flatMap((student) => student.anios))].sort((a, b) => b - a));
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setStudentsLoading(false);
      }
    }
    loadStudents();
  }, [studentsModalOpen, studentFilters.anio, studentFilters.provincia, studentFilters.ci]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalOpen(true);
  }

  function openStudents() {
    setStudentFilters({ anio: "", provincia: "", ci: "" });
    setStudentsModalOpen(true);
  }

  function openStudentEdit(student) {
    if (!student.user_id) return;
    openEdit({
      id: student.user_id,
      username: student.username,
      email: student.email,
      first_name: student.nombre,
      last_name: student.apellidos,
      rol: "estudiante",
      provincia: student.provincia_id,
      municipio: "",
      escuela: "",
      is_active: student.is_active,
    });
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      rol: user.rol || "superadmin",
      provincia: user.provincia || "",
      municipio: user.municipio || "",
      escuela: user.escuela || "",
      password: "",
      is_active: user.is_active,
    });
    setShowPassword(false);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      };
      ["provincia", "municipio", "escuela"].forEach((field) => {
        payload[field] = payload[field] ? Number(payload[field]) : null;
      });
      if (payload.rol === "superadmin") {
        payload.provincia = null;
        payload.municipio = null;
        payload.escuela = null;
      }
      if (!payload.password) delete payload.password;
      if (editing) {
        delete payload.username;
        await updateSuperAdminUser(editing.id, payload);
      } else {
        await createSuperAdminUser(payload);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleActive(user) {
    try {
      setError("");
      await updateSuperAdminUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleStudentActive(student) {
    if (!student.user_id) return;
    await toggleActive({ id: student.user_id, is_active: student.is_active });
    setStudents((current) => current.map((item) => item.id === student.id
      ? { ...item, is_active: !item.is_active }
      : item));
  }

  async function handleDelete(user) {
    const ok = await confirm({
      title: "Eliminar usuario",
      message: `¿Eliminar el usuario ${user.username}?`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setError("");
      await deleteSuperAdminUser(user.id);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    { key: "username", header: "Usuario", render: (user) => user.username },
    { key: "nombre", header: "Nombre", render: (user) => [user.first_name, user.last_name].filter(Boolean).join(" ") || "Sin nombre" },
    {
      key: "rol",
      header: "Rol",
      render: (user) => <span className={styles.roleBadge}>{user.rol_label}</span>,
    },
    { key: "alcance", header: "Alcance", render: (user) => user.provincia_nombre || user.municipio_nombre || user.escuela_nombre || "Global" },
    { key: "estado", header: "Estado", render: (user) => <StatusToggle active={user.is_active} onClick={() => toggleActive(user)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (user) => (
        <>
          <EntityActionButton variant="edit" onClick={() => openEdit(user)}>Editar</EntityActionButton>
          <EntityActionButton variant="delete" className="ml-2" onClick={() => handleDelete(user)}>Eliminar</EntityActionButton>
        </>
      ),
    },
  ];

  const studentColumns = [
    { key: "ci", header: "CI", render: (student) => student.ci },
    { key: "nombre", header: "Estudiante", render: (student) => `${student.nombre} ${student.apellidos}` },
    { key: "provincia", header: "Provincia", render: (student) => student.provincia },
    { key: "escuela", header: "Escuela", render: (student) => student.escuela },
    { key: "anios", header: "Años", render: (student) => student.anios.join(", ") || "Sin escalafón" },
    {
      key: "estado",
      header: "Cuenta",
      render: (student) => student.has_account
        ? <StatusToggle active={student.is_active} onClick={() => toggleStudentActive(student)} />
        : <span className={styles.noAccount}>Sin cuenta</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (student) => student.has_account
        ? <EntityActionButton variant="edit" onClick={() => openStudentEdit(student)}>Editar</EntityActionButton>
        : <span className={styles.mutedAction}>Pendiente de registro</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <Card padding="p-8">
        <PageHeader
          title="👥 Usuarios"
          subtitle="Gestión global de usuarios en todo el sistema."
          actions={<PrimaryButton onClick={openCreate}>+ Nuevo usuario</PrimaryButton>}
        />

        <SecondaryButton onClick={openStudents}>Ver estudiantes</SecondaryButton>

        <div className={styles.filtersGrid}>
          <FormField label="Rol">
            <Select value={filters.rol} onChange={(event) => setFilters({ ...filters, rol: event.target.value })}>
              <option value="">Todos</option>
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormField>
          <FormField label="Provincia">
            <Select value={filters.provincia} onChange={(event) => setFilters({ ...filters, provincia: event.target.value })}>
              <option value="">Todas</option>
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Estado">
            <Select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}>
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </FormField>
        </div>

        {error && <FeedbackMessage type="error" className="mt-5 rounded-2xl">{error}</FeedbackMessage>}
        <DataTable
          className="table-scroll mt-6"
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No hay usuarios para estos filtros."
        />
      </Card>

      <Modal
        open={studentsModalOpen}
        onClose={() => setStudentsModalOpen(false)}
        title="Estudiantes registrados"
        size="xl"
      >
        <div className={styles.studentFilters}>
          <FormField label="Año">
            <Select value={studentFilters.anio} onChange={(event) => setStudentFilters({ ...studentFilters, anio: event.target.value })}>
              <option value="">Todos los años</option>
              {studentYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
          </FormField>
          <FormField label="Provincia">
            <Select value={studentFilters.provincia} onChange={(event) => setStudentFilters({ ...studentFilters, provincia: event.target.value })}>
              <option value="">Todas</option>
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Buscar por CI">
            <Input value={studentFilters.ci} onChange={(event) => setStudentFilters({ ...studentFilters, ci: event.target.value })} placeholder="Número de identidad" />
          </FormField>
        </div>
        <DataTable
          className="table-scroll"
          columns={studentColumns}
          data={students}
          loading={studentsLoading}
          emptyMessage="No hay estudiantes para estos filtros."
        />
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" form="usuario-form">Guardar</PrimaryButton>
          </>
        }
      >
        <form id="usuario-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {["username", "email", "first_name", "last_name"].map((field) => (
            <FormField key={field} label={fieldLabels[field]}>
              <Input
                required={!editing || field !== "username"}
                disabled={editing && field === "username"}
                type={field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              />
            </FormField>
          ))}
          <FormField label="Rol">
            <Select
              required
              value={form.rol}
              onChange={(event) => {
                const role = event.target.value;
                setForm({ ...form, rol: role, provincia: "", municipio: "", escuela: "" });
              }}
            >
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormField>
          {form.rol !== "superadmin" && (
            <FormField label={<>Provincia{(needsMunicipality || needsSchool) && <span className={styles.requiredMark}> *</span>}</>}>
              <Select
                required={needsMunicipality || needsSchool}
                value={form.provincia}
                onChange={(event) => setForm({ ...form, provincia: event.target.value, municipio: "", escuela: "" })}
              >
                <option value="">Sin asignar</option>
                {provinces.map((province) => <option key={province.id} value={province.id}>{province.nombre}</option>)}
              </Select>
            </FormField>
          )}
          {needsMunicipality && (
            <FormField label={<>Municipio <span className={styles.requiredMark}>*</span></>}>
              <Select
                required
                value={form.municipio}
                onChange={(event) => setForm({ ...form, municipio: event.target.value, escuela: "" })}
                disabled={!form.provincia}
              >
                <option value="">Selecciona un municipio</option>
                {municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.nombre}</option>)}
              </Select>
            </FormField>
          )}
          {needsSchool && (
            <FormField label={<>Escuela <span className={styles.requiredMark}>*</span></>} className="sm:col-span-2">
              <Select required value={form.escuela} onChange={(event) => setForm({ ...form, escuela: event.target.value })} disabled={!form.municipio}>
                <option value="">Selecciona una escuela</option>
                {schools.map((school) => <option key={school.id} value={school.id}>{school.nombre}</option>)}
              </Select>
            </FormField>
          )}
          <label className={`${styles.activeCheckboxRow} sm:col-span-2`}>
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className={styles.checkbox} />
            Usuario activo
          </label>
          <FormField
            label={<>Contraseña{editing && <span className="font-normal text-slate-500"> (dejar vacía para conservarla)</span>}</>}
            className="sm:col-span-2"
          >
            <div className={styles.passwordFieldWrapper}>
              <Input
                required={!editing}
                minLength="8"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className={styles.passwordInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className={styles.passwordToggle}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <span className={showPassword ? "" : styles.passwordToggleIconHidden} aria-hidden="true">👁</span>
              </button>
            </div>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
