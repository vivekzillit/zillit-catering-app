// Glass — reusable frosted-glass container. Every card, modal, nav bar,
// and sheet in the app uses this so the glassmorphism look is consistent.

import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import clsx from 'clsx';

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  subtle?: boolean;
  children?: ReactNode;
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { subtle = false, className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx(subtle ? 'glass-subtle' : 'glass', className)}
      {...rest}
    >
      {children}
    </div>
  );
});
