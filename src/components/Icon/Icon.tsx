import React from 'react';
import { icons } from '@/components/Icon/icons';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name?: string;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({
  name = '',
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  className = '',
  ...restProps
}) => {
  const iconHtml = name && icons[name] ? icons[name] : null;

  if (iconHtml) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`feather ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: iconHtml }}
        {...restProps}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`feather feather-help-circle ${className}`.trim()}
      {...restProps}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
};

export default Icon;
