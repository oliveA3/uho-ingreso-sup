import { useEffect, useState } from "react";
import { fetchStudentsWithoutAccount, createStudentAccount } from "../../api/school.service";
import { fetchLandingData } from "../../api/landing.service";
import FeedbackMessage from "../../components/FeedbackMessage/FeedbackMessage";
import { Card, DataTable, PageHeader } from "../../components";
import CreateStudentAccountModal from "../../components/Modals/CreateStudentAccountModal";
import PrimaryButton from "../../components/Buttons/PrimaryButton";
import styles from "./SinCuentaPage.module.css";

const emptyForm = { username: "", email: "", password: "" };

export default function SecretarioSinCuentaPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [canCreateAccounts, setCanCreateAccounts] = useState(false);
  const [stageError, setStageError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStudentsWithoutAccount();
      setStudents(data.students || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let active = true;
    fetchLandingData()
      .then((data) => {
        if (!active) return;
        const stageTwo = (data.etapas || []).find((stage) => stage.numero === 2);
        if (!stageTwo) throw new Error("No se encontró el estado de la Etapa 2.");
        setCanCreateAccounts(["en_curso", "completada"].includes(stageTwo?.estado));
        setStageError("");
      })
      .catch((requestError) => {
        if (active) setStageError(`No se pudo comprobar la etapa del proceso: ${requestError.message}`);
      });
    return () => { active = false; };
  }, []);

  function openCreateModal(student) {
    setSelectedStudent(student);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setFormError("");
    setCreatingAccount(true);
    try {
      const payload = { username: form.username.trim(), email: form.email.trim() };
      if (form.password) payload.password = form.password;
      await createStudentAccount(selectedStudent.id, payload);
      setModalOpen(false);
      setNotice(`Cuenta creada. Usuario: ${payload.username}. Se enviaron instrucciones a ${payload.email}.`);
      await load();
    } catch (err) {
      setFormError(err.message || "Error al crear la cuenta.");
    } finally {
      setCreatingAccount(false);
    }
  }

  function updateFormField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const columns = [
    { key: "ci", header: "CI", className: styles.ciCell, render: (s) => s.ci },
    { key: "nombre", header: "Nombre", className: styles.nameCell, render: (s) => `${s.nombre} ${s.apellidos}` },
    { key: "indice", header: "Índice general", render: (s) => s.indice_general ?? "--" },
    ...(canCreateAccounts ? [{
      key: "acciones",
      header: "Acciones",
      className: styles.rowActionCell,
      render: (s) => (
        <PrimaryButton className={styles.rowActionButton} type="button" onClick={() => openCreateModal(s)}>
          Crear cuenta
        </PrimaryButton>
      ),
    }] : []),
  ];

  return (
    <Card>
      <PageHeader
        title="Estudiantes Sin Cuenta"
        subtitle="Lista de estudiantes que aún no han creado cuenta para que puedas gestionar su acceso."
      />

      {notice && <FeedbackMessage type="success" className={styles.warningMessage}>{notice}</FeedbackMessage>}
      {students.length > 0 && <FeedbackMessage type="warning" className={styles.warningMessage}>Hay {students.length} estudiante(s) sin cuenta activa.</FeedbackMessage>}
      {error && <FeedbackMessage type="error" className={styles.errorMessage}>{error}</FeedbackMessage>}
      {stageError && <FeedbackMessage type="error" className={styles.errorMessage}>{stageError}</FeedbackMessage>}

      <DataTable
        className={styles.table}
        columns={columns}
        data={students}
        loading={loading}
        loadingMessage="Cargando estudiantes..."
        emptyMessage="No hay estudiantes sin cuenta."
      />

      <CreateStudentAccountModal
        open={modalOpen}
        student={selectedStudent}
        form={form}
        error={formError}
        submitting={creatingAccount}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateAccount}
        onChange={updateFormField}
      />
    </Card>
  );
}
