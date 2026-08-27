export default function PrimaryButton({ as: Element = "button", children, className = "", ...props }) {
  return (
    <Element
      className={`inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </Element>
  );
}
