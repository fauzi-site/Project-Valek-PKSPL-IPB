import React from 'react';

/**
 * Base Skeleton primitive component with subtle pulse and institutional styling.
 * Used to compose complex skeletons without layout shift.
 */
export const Skeleton = ({
  className = '',
  width,
  height,
  rounded = 'rounded-md',
  animate = true,
  style = {},
  ...props
}) => {
  const inlineStyles = {
    ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyles}
      className={`bg-slate-200/80 ${rounded} ${animate ? 'animate-pulse' : ''} ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
