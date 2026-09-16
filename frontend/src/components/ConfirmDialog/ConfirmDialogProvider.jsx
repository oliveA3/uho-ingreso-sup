import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Modal from "../Modals/Modal";
import PrimaryButton from "../Buttons/PrimaryButton";
import SecondaryButton from "../Buttons/SecondaryButton";
import styles from "./ConfirmDialogProvider.module.css";

const ConfirmContext = createContext(() => Promise.resolve(false));

const TONE_BUTTON_CLASS = {
  default: "",
  danger: styles.dangerButton,
};

export function ConfirmDialogProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => {
    if (typeof options === "string") options = { message: options };
    return new Promise((resolve) => {
      setRequest({ ...options, resolve });
    });
  }, []);

  const resolveAndClose = useCallback((result) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(request)}
        onClose={() => resolveAndClose(false)}
        title={request?.title || "Confirmar acción"}
        size="sm"
        footer={
          <>
            <SecondaryButton onClick={() => resolveAndClose(false)}>
              {request?.cancelLabel || "Cancelar"}
            </SecondaryButton>
            <PrimaryButton
              className={TONE_BUTTON_CLASS[request?.tone || "default"]}
              onClick={() => resolveAndClose(true)}
            >
              {request?.confirmLabel || "Aceptar"}
            </PrimaryButton>
          </>
        }
      >
        <p className={styles.message}>{request?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Promise-based replacement for window.confirm, styled with the app's brand tokens. */
export function useConfirm() {
  return useContext(ConfirmContext);
}
