export function LoadingSpinner({ size = "1em", className = "" }) {
  return (
    <span
      className={`app-loading-spinner ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

