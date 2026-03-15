-- Migrate data from JSONB columns to relational tables
DO $$ 
DECLARE 
    res_rec RECORD;
    exp_item JSONB;
    edu_item JSONB;
    skill_item JSONB;
BEGIN
    FOR res_rec IN SELECT * FROM public.resumes LOOP
        -- Parse Experiences
        IF res_rec.experience IS NOT NULL AND jsonb_typeof(res_rec.experience) = 'array' THEN
            FOR exp_item IN SELECT * FROM jsonb_array_elements(res_rec.experience) LOOP
                INSERT INTO public.resume_experiences (
                    resume_id, company, "position", location, start_date, end_date, is_current, description, highlights
                ) VALUES (
                    res_rec.id, 
                    COALESCE(exp_item->>'company', 'Unknown Company'), 
                    COALESCE(exp_item->>'position', 'Unknown Position'), 
                    exp_item->>'location', 
                    exp_item->>'startDate', 
                    exp_item->>'endDate', 
                    COALESCE((exp_item->>'current')::boolean, false), 
                    exp_item->>'description', 
                    ARRAY(SELECT jsonb_array_elements_text(COALESCE(exp_item->'highlights', '[]'::jsonb)))
                ) ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;

        -- Parse Education
        IF res_rec.education IS NOT NULL AND jsonb_typeof(res_rec.education) = 'array' THEN
            FOR edu_item IN SELECT * FROM jsonb_array_elements(res_rec.education) LOOP
                INSERT INTO public.resume_educations (
                    resume_id, school, degree, field_of_study, location, start_date, end_date, is_current, description
                ) VALUES (
                    res_rec.id, 
                    COALESCE(edu_item->>'school', 'Unknown School'), 
                    edu_item->>'degree', 
                    edu_item->>'fieldOfStudy', 
                    edu_item->>'location', 
                    edu_item->>'startDate', 
                    edu_item->>'endDate', 
                    COALESCE((edu_item->>'current')::boolean, false), 
                    edu_item->>'description'
                ) ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;

        -- Parse Skills
        IF res_rec.skills IS NOT NULL AND jsonb_typeof(res_rec.skills) = 'array' THEN
            FOR skill_item IN SELECT * FROM jsonb_array_elements(res_rec.skills) LOOP
                IF jsonb_typeof(skill_item) = 'object' THEN
                    INSERT INTO public.resume_skills (resume_id, name, "level", category)
                    VALUES (res_rec.id, COALESCE(skill_item->>'name', 'Unknown Skill'), skill_item->>'level', skill_item->>'category')
                    ON CONFLICT (resume_id, name) DO NOTHING;
                ELSE
                    INSERT INTO public.resume_skills (resume_id, name)
                    VALUES (res_rec.id, skill_item::text)
                    ON CONFLICT (resume_id, name) DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Triggers for keeping JSONB cache in sync
CREATE OR REPLACE FUNCTION public.sync_resume_json_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_resume_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_resume_id = OLD.resume_id;
    ELSE
        target_resume_id = NEW.resume_id;
    END IF;

    -- Update parent resumes table with fresh JSONB aggregations
    UPDATE public.resumes
    SET 
        experience = (
            SELECT jsonb_agg(exp) 
            FROM (SELECT company, "position", location, start_date as "startDate", end_date as "endDate", is_current as "current", description, highlights FROM public.resume_experiences WHERE resume_id = target_resume_id) exp
        ),
        education = (
            SELECT jsonb_agg(edu) 
            FROM (SELECT school, degree, field_of_study as "fieldOfStudy", location, start_date as "startDate", end_date as "endDate", is_current as "current", description FROM public.resume_educations WHERE resume_id = target_resume_id) edu
        ),
        skills = (
            SELECT jsonb_agg(name) FROM public.resume_skills WHERE resume_id = target_resume_id
        ),
        updated_at = now()
    WHERE id = target_resume_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_sync_experience ON public.resume_experiences;
CREATE TRIGGER trigger_sync_experience AFTER INSERT OR UPDATE OR DELETE ON public.resume_experiences
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();

DROP TRIGGER IF EXISTS trigger_sync_education ON public.resume_educations;
CREATE TRIGGER trigger_sync_education AFTER INSERT OR UPDATE OR DELETE ON public.resume_educations
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();

DROP TRIGGER IF EXISTS trigger_sync_skills ON public.resume_skills;
CREATE TRIGGER trigger_sync_skills AFTER INSERT OR UPDATE OR DELETE ON public.resume_skills
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();
