import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (data) {
        setProfile({
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update profile');
      throw error;
    }

    setProfile((prev) => prev ? { ...prev, ...updates } : null);
    toast.success('Profile updated successfully');
  }, [userId]);

  return { profile, loading, updateProfile };
}
