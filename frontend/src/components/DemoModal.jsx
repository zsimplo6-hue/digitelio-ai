export default function DemoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-[92vw] max-w-3xl rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/50 text-white"
        >
          ✕
        </button>
        <video controls autoPlay className="w-full block">
          <source src="/videos/demo-digitelio.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
