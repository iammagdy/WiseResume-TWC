 import * as React from 'react';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { cn } from '@/lib/utils';
 import { AlertCircle } from 'lucide-react';
 
 interface FormFieldProps {
   id: string;
   label: string;
   icon?: React.ReactNode;
   error?: string;
   touched?: boolean;
   required?: boolean;
   children?: React.ReactNode;
 }
 
 interface InputFormFieldProps extends FormFieldProps {
   type?: 'text' | 'email' | 'password' | 'tel' | 'url';
   value: string;
   onChange: (value: string) => void;
   onBlur?: () => void;
   placeholder?: string;
   autoComplete?: string;
   rightElement?: React.ReactNode;
 }
 
 interface TextareaFormFieldProps extends FormFieldProps {
   value: string;
   onChange: (value: string) => void;
   onBlur?: () => void;
   placeholder?: string;
   rows?: number;
   maxLength?: number;
   showCount?: boolean;
 }
 
 export function InputFormField({
   id,
   label,
   icon,
   error,
   touched,
   required,
   type = 'text',
   value,
   onChange,
   onBlur,
   placeholder,
   autoComplete,
   rightElement,
 }: InputFormFieldProps) {
   const showError = touched && error;
 
   return (
     <div className="space-y-1.5">
       <Label htmlFor={id} className="flex items-center gap-2 text-sm">
         {icon && <span className="text-muted-foreground">{icon}</span>}
         {label}
         {required && <span className="text-destructive">*</span>}
       </Label>
       <div className="relative">
         <Input
           id={id}
           type={type}
           value={value}
           onChange={(e) => onChange(e.target.value)}
           onBlur={onBlur}
           placeholder={placeholder}
           autoComplete={autoComplete}
           className={cn(
             'h-12',
             showError && 'border-destructive focus-visible:ring-destructive',
             rightElement && 'pr-14'
           )}
           aria-invalid={showError ? 'true' : undefined}
           aria-describedby={showError ? `${id}-error` : undefined}
         />
         {rightElement && (
           <div className="absolute right-0 top-0 h-full flex items-center">
             {rightElement}
           </div>
         )}
       </div>
       {showError && (
         <p
           id={`${id}-error`}
           className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in"
           role="alert"
         >
           <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
           {error}
         </p>
       )}
     </div>
   );
 }
 
 export function TextareaFormField({
   id,
   label,
   icon,
   error,
   touched,
   required,
   value,
   onChange,
   onBlur,
   placeholder,
   rows = 6,
   maxLength,
   showCount,
 }: TextareaFormFieldProps) {
   const showError = touched && error;
   const isOverLimit = maxLength && value.length > maxLength;
 
   return (
     <div className="space-y-1.5">
       <Label htmlFor={id} className="flex items-center gap-2 text-sm">
         {icon && <span className="text-muted-foreground">{icon}</span>}
         {label}
         {required && <span className="text-destructive">*</span>}
       </Label>
       <Textarea
         id={id}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         onBlur={onBlur}
         placeholder={placeholder}
         rows={rows}
         className={cn(
           'resize-none',
           showError && 'border-destructive focus-visible:ring-destructive'
         )}
         aria-invalid={showError ? 'true' : undefined}
         aria-describedby={showError ? `${id}-error` : undefined}
       />
       <div className="flex items-center justify-between">
         {showError ? (
           <p
             id={`${id}-error`}
             className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in"
             role="alert"
           >
             <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
             {error}
           </p>
         ) : (
           <span />
         )}
         {showCount && maxLength && (
           <p
             className={cn(
               'text-sm',
               isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
             )}
           >
             {value.length}/{maxLength}
           </p>
         )}
       </div>
     </div>
   );
 }