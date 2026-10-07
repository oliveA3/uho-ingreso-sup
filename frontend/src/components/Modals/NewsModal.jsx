import { useState } from "react";
import Modal from "./Modal";
import FormField from "../FormField/FormField";
import Input from "../Input/Input";
import TextArea from "../TextArea/TextArea";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import FeedbackMessage from "../FeedbackMessage/FeedbackMessage";
import styles from "./NewsModal.module.css";

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function buildInitialForm(news) {
  return {
    titulo: news?.titulo || "",
    contenido: news?.contenido || "",
    fecha_expiracion: news?.fecha_expiracion || "",
    permanente: Boolean(news?.permanente),
    url_externa: news?.url_externa || "",
    multimedia: null,
    quitar_multimedia: false,
  };
}

export default function NewsModal({ news = null, saving = false, error = "", onClose, onSubmit }) {
  const [form, setForm] = useState(() => buildInitialForm(news));

  function handleSubmit(event) {
    event.preventDefault();
    const payload = new FormData();
    payload.append("titulo", form.titulo.trim());
    payload.append("contenido", form.contenido.trim());
    payload.append("permanente", String(form.permanente));
    if (!form.permanente) payload.append("fecha_expiracion", form.fecha_expiracion);
    payload.append("url_externa", form.url_externa.trim());
    if (form.multimedia) payload.append("multimedia", form.multimedia);
    if (form.quitar_multimedia) payload.append("quitar_multimedia", "true");
    onSubmit(payload);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={news ? "Editar noticia" : "Nueva noticia"}
      size="lg"
      footer={(
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton type="submit" form="provincial-news-form" disabled={saving}>
            {saving ? "Guardando..." : "Guardar noticia"}
          </PrimaryButton>
        </>
      )}
    >
      <form id="provincial-news-form" onSubmit={handleSubmit} className={styles.form}>
        {error && <FeedbackMessage type="error" className={styles.formError}>{error}</FeedbackMessage>}
        <FormField label="Título">
          <Input required maxLength="200" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} />
        </FormField>
        <FormField label="Contenido">
          <TextArea required rows={6} value={form.contenido} onChange={(event) => setForm({ ...form, contenido: event.target.value })} />
        </FormField>

        <label className={styles.permanentToggle}>
          <input
            type="checkbox"
            checked={form.permanente}
            onChange={(event) => setForm({ ...form, permanente: event.target.checked })}
          />
          Publicación permanente
        </label>

        {!form.permanente && (
          <FormField label="Fecha de expiración">
            <Input
              type="date"
              required
              min={localDateValue()}
              value={form.fecha_expiracion}
              onChange={(event) => setForm({ ...form, fecha_expiracion: event.target.value })}
            />
          </FormField>
        )}

        <FormField label="Enlace externo (opcional)">
          <Input
            type="url"
            maxLength="500"
            placeholder="https://sitio.ejemplo/noticia"
            value={form.url_externa}
            onChange={(event) => setForm({ ...form, url_externa: event.target.value })}
          />
        </FormField>
        <FormField label="Multimedia (imagen, video, PDF, Word o Excel; máximo 25 MB)">
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.ogg,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(event) => setForm({ ...form, multimedia: event.target.files?.[0] || null, quitar_multimedia: false })}
          />
        </FormField>
        {news?.multimedia_nombre && !form.quitar_multimedia && (
          <div className={styles.currentMedia}>
            <a className={styles.currentMediaLink} href={news.multimedia_download_url}>
              {news.multimedia_nombre}
            </a>
            <label className={styles.removeMediaToggle}>
              <input type="checkbox" checked={form.quitar_multimedia} onChange={(event) => setForm({ ...form, quitar_multimedia: event.target.checked })} />
              Quitar
            </label>
          </div>
        )}
        {news?.imagen_portada_url && (
          <div className={styles.coverPreview}>
            <img className={styles.coverImage} src={news.imagen_portada_url} alt="Portada actual" />
            <span className={styles.coverDescription}>Portada obtenida del enlace externo</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
