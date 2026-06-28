import type { DimensionValue } from 'react-native';

export function isTabletWidth(width: number) {
  return width >= 768;
}

export function getContentMaxWidth(width: number, tabletMaxWidth = 900): DimensionValue {
  return isTabletWidth(width) ? tabletMaxWidth : '100%';
}

export function getHorizontalPadding(width: number) {
  if (width >= 1024) return 56;
  if (isTabletWidth(width)) return 40;
  return 20;
}