import styles from "./TextArea.module.css";

export default function TextArea({ className = "", ...props }) {
  return <textarea className={`${styles.textarea} ${className}`} {...props} />;
}
