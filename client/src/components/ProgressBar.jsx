// client/src/components/ProgressBar.jsx — UI-02
// Dynamic width uses inline style — NEVER use Tailwind dynamic classes like w-[${n}%]
// Two overlapping divs: gray background + teal foreground
export default function ProgressBar({ percent }) {
  const pct = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-teal-500 h-2 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
