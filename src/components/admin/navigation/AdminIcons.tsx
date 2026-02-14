import React from 'react';
import Svg, { Path, Circle, SvgProps } from 'react-native-svg';
import { THEME } from '../../../theme/blobTheme';

interface IconProps extends SvgProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 2.2;

export const AdminIcons = {
  Home: ({ color = THEME.colors.textSecondary, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3 9.5L12 3L21 9.5V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12H15V22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),

  Groups: ({ color = THEME.colors.textSecondary, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H10L12 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),

  Plus: ({ color = '#FFF', size = DEFAULT_SIZE, strokeWidth = 2.5, ...props }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),

  Approvals: ({ color = THEME.colors.textSecondary, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M9 11L12 14L22 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),

  Settings: ({ color = THEME.colors.textSecondary, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12.22 2H11.78C9.72 2.01 8.04 3.69 8.03 5.75V5.87C8.03 6.97 7.13 7.87 6.03 7.87H5.91C3.85 7.88 2.17 9.56 2.16 11.62V12.38C2.17 14.44 3.85 16.12 5.91 16.13H6.03C7.13 16.13 8.03 17.03 8.03 18.13V18.25C8.04 20.31 9.72 21.99 11.78 22H12.22C14.28 21.99 15.96 20.31 15.97 18.25V18.13C15.97 17.03 16.87 16.13 17.97 16.13H18.09C20.15 16.12 21.83 14.44 21.84 12.38V11.62C21.83 9.56 20.15 7.88 18.09 7.87H17.97C16.87 7.87 15.97 6.97 15.97 5.87V5.75C15.96 3.69 14.28 2.01 12.22 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
};
