import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

export default function ExportButton({ variant = "secondary", children, ...props }) {
  const Button = variant === "primary" ? PrimaryButton : SecondaryButton;
  return <Button {...props}>↑ {children}</Button>;
}
