import PrimaryButton from "./PrimaryButton";

export default function AddButton({ children, ...props }) {
  return <PrimaryButton {...props}>+ {children}</PrimaryButton>;
}
