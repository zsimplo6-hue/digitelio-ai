export default function DemoButton({ onOpenModal }) {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.querySelector('#apercu');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onOpenModal();
    }
  };

  return (
    <a
      href="#apercu"
      onClick={handleClick}
      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full
                 bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold
                 shadow-[0_8px_24px_rgba(124,58,237,0.35)]
                 transition-all duration-300 ease-out
                 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_14px_32px_rgba(124,58,237,0.5)]
                 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
    >
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-[10px]">▶</span>
      Voir la démo
    </a>
  );
}
