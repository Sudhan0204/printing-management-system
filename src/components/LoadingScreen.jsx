export default function LoadingScreen({ message }) {
  return (
    <div className="status-screen">
      <div className="status-card">
        <span className="spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}
