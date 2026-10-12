import PrimaryButton from "./PrimaryButton";

export default function ImportButton({ children, ...props }) {
  return <PrimaryButton {...props}>↓ {children}</PrimaryButton>;
}
