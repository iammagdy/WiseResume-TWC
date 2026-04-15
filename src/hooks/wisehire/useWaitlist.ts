import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WaitlistFormData {
  name: string;
  email: string;
  company_name: string;
  company_size: string;
}

export interface WaitlistResult {
  success: boolean;
  already_registered?: boolean;
  message?: string;
}

async function joinWaitlist(data: WaitlistFormData): Promise<WaitlistResult> {
  const { data: fnData, error } = await supabase.functions.invoke<WaitlistResult>(
    'wisehire-waitlist-join',
    { body: data }
  );

  if (error) {
    throw new Error(error.message ?? 'Failed to join waitlist. Please try again.');
  }

  if (!fnData) {
    throw new Error('No response from server. Please try again.');
  }

  return fnData;
}

export function useWaitlist() {
  return useMutation<WaitlistResult, Error, WaitlistFormData>({
    mutationFn: joinWaitlist,
  });
}
