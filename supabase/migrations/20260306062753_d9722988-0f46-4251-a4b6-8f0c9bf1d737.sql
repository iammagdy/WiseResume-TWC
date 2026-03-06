
-- Re-create triggers that may be missing (skip auth.users since it already exists)

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_preferences();

CREATE OR REPLACE TRIGGER on_application_change
  AFTER INSERT OR UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_change();
