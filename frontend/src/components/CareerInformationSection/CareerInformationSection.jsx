import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../Buttons/PrimaryButton";
import Input from "../Input/Input";
import Modal from "../Modals/Modal";
import { addStudentInterestCareer, fetchStudentInterest, fetchStudentSolicitud } from "../../api/student.service";
import styles from "./CareerInformationSection.module.css";

const informationFields = [
  ["Descripción", "descripcion"],
  ["Campo laboral", "campo_laboral"],
  ["Requisitos", "requisitos"],
  ["Perfil del egresado", "perfil_egresado"],
];

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function CareerInformationSection({ items = [], provinceName = "Holguín", loading = false, user, activeStageNumber }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [detailsCareer, setDetailsCareer] = useState(null);
  const [ballotData, setBallotData] = useState(null);
  const [ballotLoading, setBallotLoading] = useState(false);
  const [ballotError, setBallotError] = useState("");
  const [addingToBallot, setAddingToBallot] = useState(false);
  const searchTerm = normalize(query.trim());
  const filteredItems = items.filter((career) =>
    !searchTerm || normalize(`${career.codigo} ${career.nombre}`).includes(searchTerm),
  );
  const isStudentBallotStage = user?.rol === "estudiante" && [2, 3].includes(activeStageNumber);

  useEffect(() => {
    if (!detailsCareer || !isStudentBallotStage) {
      setBallotData(null);
      setBallotError("");
      setBallotLoading(false);
      return undefined;
    }

    let active = true;
    setBallotData(null);
    setBallotError("");
    setBallotLoading(true);
    const loadBallot = activeStageNumber === 2 ? fetchStudentInterest : fetchStudentSolicitud;
    loadBallot()
      .then((data) => {
        if (active) setBallotData(data);
      })
      .catch((error) => {
        if (active) setBallotError(error.message);
      })
      .finally(() => {
        if (active) setBallotLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detailsCareer?.id, user?.id, isStudentBallotStage, activeStageNumber]);

  const ballotItems = ballotData?.items || [];
  const maxItems = ballotData?.max_items || 0;
  const matchingPlan = activeStageNumber === 3
    ? ballotData?.available_plans?.find((plan) => plan.carrera_codigo === detailsCareer?.codigo)
    : null;
  const careerAlreadyAdded = detailsCareer && activeStageNumber === 2
    ? ballotItems.some((item) => Number(item.carrera) === Number(detailsCareer.id))
    : detailsCareer && activeStageNumber === 3
      ? ballotItems.some((item) => item.carrera_codigo === detailsCareer.codigo)
      : false;
  const ballotIsFull = Boolean(ballotData && ballotItems.length >= maxItems);
  const canAddToBallot = Boolean(
    ballotData?.puede_editar
    && !ballotIsFull
    && !careerAlreadyAdded
    && (activeStageNumber !== 3 || (ballotData?.escalafon_valido && matchingPlan)),
  );

  let ballotHint = "";
  if (ballotLoading) ballotHint = "Consultando tu boleta...";
  else if (ballotError) ballotHint = ballotError;
  else if (ballotData && activeStageNumber === 3 && !ballotData.escalafon_valido) ballotHint = `No apareces en el escalafón del proceso ${ballotData.plan_anio}.`;
  else if (ballotData && careerAlreadyAdded) ballotHint = "Esta carrera ya está en tu boleta.";
  else if (ballotData && ballotIsFull) ballotHint = `Tu boleta está llena (${ballotItems.length}/${maxItems}).`;
  else if (ballotData && !ballotData.puede_editar) ballotHint = "Tu boleta no está disponible para edición.";
  else if (ballotData && activeStageNumber === 3 && !matchingPlan) ballotHint = `No hay plaza para esta carrera en el plan ${ballotData.plan_anio} de ${ballotData.student?.provincia || "tu provincia"}.`;
  else if (ballotData) ballotHint = `Espacios disponibles: ${maxItems - ballotItems.length}.`;

  const addCareerToBallot = async () => {
    if (!canAddToBallot || !detailsCareer) return;
    setAddingToBallot(true);
    setBallotError("");
    try {
      if (activeStageNumber === 2) {
        await addStudentInterestCareer(detailsCareer.id);
        setDetailsCareer(null);
        navigate("/estudiante/boleta-interes");
        return;
      }
      const addPlanId = matchingPlan.id;
      setDetailsCareer(null);
      navigate("/estudiante/boleta", { state: { addPlanId } });
    } catch (error) {
      setBallotError(error.message);
    } finally {
      setAddingToBallot(false);
    }
  };

  return (
    <section id="carreras" className={styles.section} aria-labelledby="career-information-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Catálogo provincial</p>
          <h2 className={styles.title} id="career-information-title">Información de las carreras</h2>
        </div>
        <span className={styles.province}>{provinceName}</span>
      </div>

      {loading ? (
        <p className={styles.status} role="status">Cargando carreras...</p>
      ) : items.length === 0 ? (
        <p className={styles.status} role="status">No hay carreras con información publicada para esta provincia.</p>
      ) : (
        <>
          <div className={styles.panel}>
            <div className={styles.search}>
              <Input
                id="career-information-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar carrera por nombre o código"
              />
            </div>
            <div className={styles.listViewport} aria-label={`Carreras con información de ${provinceName}`}>
              {filteredItems.length === 0 ? (
                <p className={styles.status} role="status">No hay carreras que coincidan con la búsqueda.</p>
              ) : (
                <ul className={styles.careerList}>
                  {filteredItems.map((career) => (
                    <li className={styles.careerRow} key={career.id}>
                      <div className={styles.careerIdentity}>
                        <span className={styles.code}>{career.codigo}</span>
                        <span className={styles.careerName}>{career.nombre}</span>
                      </div>
                      <PrimaryButton
                        className={styles.detailsButton}
                        onClick={() => setDetailsCareer(career)}
                      >
                        Ver detalles
                      </PrimaryButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Modal
            open={Boolean(detailsCareer)}
            onClose={() => setDetailsCareer(null)}
            title={detailsCareer?.nombre}
            description={`${detailsCareer?.codigo || ""} · ${detailsCareer?.ces_nombre || ""}`}
            size="lg"
            bodyClassName={styles.detailsModalBody}
          >
            <dl className={styles.details}>
              {informationFields.filter(([, field]) => detailsCareer?.[field]?.trim()).map(([label, field]) => (
                <div className={styles.detail} key={field}>
                  <dt>{label}</dt>
                  <dd>{detailsCareer[field]}</dd>
                </div>
              ))}
            </dl>
            {isStudentBallotStage && (
              <div className={styles.ballotAction}>
                <PrimaryButton
                  onClick={addCareerToBallot}
                  disabled={ballotLoading || addingToBallot || !canAddToBallot}
                >
                  {addingToBallot
                    ? "Agregando..."
                    : activeStageNumber === 2
                      ? "Agregar a boleta de interés"
                      : "Agregar a boleta de solicitud"}
                </PrimaryButton>
                {ballotHint && <p role="status">{ballotHint}</p>}
              </div>
            )}
          </Modal>
        </>
      )}
    </section>
  );
}