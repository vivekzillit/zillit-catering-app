// Orange-tinted initial avatar used inline across chat cells.

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  const initial = name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full border border-brand-400/40 bg-gradient-to-br from-brand-500/40 to-brand-600/40 font-bold text-brand-200 backdrop-blur-lg"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.45) }}
    >
      {initial}
    </span>
  );
}
