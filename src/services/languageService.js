import { supabase } from '../lib/supabase';

export const saveUserLanguage = async (language) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: 'User not authenticated' };
  
  const { data, error } = await supabase
    .from('user_settings')
    .update({ language })
    .eq('user_id', user.id);
    
  return { data, error };
};

export const getUserLanguage = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { language: null };
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('language')
    .eq('user_id', user.id)
    .single();
    
  if (error) return { language: null };
  
  return { language: data.language };
};