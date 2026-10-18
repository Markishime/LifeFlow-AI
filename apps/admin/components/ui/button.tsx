import {forwardRef, type ButtonHTMLAttributes} from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

const variants = cva('button', {variants: {variant: {default: '', outline: 'button-outline'}}, defaultVariants: {variant: 'default'}});
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & {asChild?: boolean}>(
  ({className, variant, asChild, ...props}, ref) => {const Component = asChild ? Slot : 'button'; return <Component ref={ref} className={twMerge(clsx(variants({variant}), className))} {...props}/>;});
Button.displayName = 'Button';
