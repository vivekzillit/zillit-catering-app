import clsx from 'clsx';
import type { DietaryTag } from '@/shared/types';
import { DIETARY_TAG_LABELS } from '@/shared/types';

interface DietaryTagChipProps {
  tag: DietaryTag;
  active?: boolean;
  onClick?: () => void;
}

export function DietaryTagChip({ tag, active = false, onClick }: DietaryTagChipProps) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={clsx(
        'chip',
        active && 'chip-active',
        interactive && 'cursor-pointer hover:scale-[1.03] active:scale-95'
      )}
    >
      {DIETARY_TAG_LABELS[tag]}
    </button>
  );
}
