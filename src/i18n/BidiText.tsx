import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { getTextDirection } from './core';
import { useLocale } from './LocaleProvider';

interface BidiTextProps extends Omit<ComponentPropsWithoutRef<'bdi'>, 'children'> {
  children: ReactNode;
  value?: string;
}

export function BidiText({ children, value, dir, ...props }: BidiTextProps) {
  const { locale } = useLocale();
  const textValue = value ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : '');
  return (
    <bdi dir={dir ?? getTextDirection(textValue, locale)} {...props}>
      {children}
    </bdi>
  );
}
