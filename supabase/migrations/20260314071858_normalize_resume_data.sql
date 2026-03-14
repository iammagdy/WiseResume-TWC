-- US2: Normalize Resume Data
-- Created: 2026-03-14

-- 1. Create normalized tables
CREATE TABLE public.resume_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
    company TEXT NOT NULL,
    "position" TEXT NOT NULL,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    highlights TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.resume_educations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
    school TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.resume_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    "level" TEXT, -- e.g., 'Beginner', 'Intermediate', 'Expert'
    category TEXT, -- e.g., 'Languages', 'Tools', 'Soft Skills'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(resume_id, name)
);

CREATE TABLE public.resume_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    issuer TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.resume_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_certifications ENABLE ROW LEVEL SECURITY;

-- 3. Data Migration (JSONB -> Relational)
DO $$ 
DECLARE 
    res_rec RECORD;
    exp_item JSONB;
    edu_item JSONB;
    skill_item JSONB;
    cert_item JSONB;
BEGIN
    FOR res_rec IN SELECT * FROM public.resumes LOOP
        -- Parse Experiences
        IF res_rec.experience IS NOT NULL THEN
            FOR exp_item IN SELECT * FROM jsonb_array_elements(res_rec.experience) LOOP
                INSERT INTO public.resume_experiences (
                    resume_id, company, "position", location, start_date, end_date, is_current, description, highlights
                ) VALUES (
                    res_rec.id, 
                    exp_item->>'company', 
                    exp_item->>'position', 
                    exp_item->>'location', 
                    exp_item->>'startDate', 
                    exp_item->>'endDate', 
                    (exp_item->>'current')::boolean, 
                    exp_item->>'description', 
                    ARRAY(SELECT jsonb_array_elements_text(exp_item->'highlights'))
                );
            END LOOP;
        END IF;

        -- Parse Education
        IF res_rec.education IS NOT NULL THEN
            FOR edu_item IN SELECT * FROM jsonb_array_elements(res_rec.education) LOOP
                INSERT INTO public.resume_educations (
                    resume_id, school, degree, field_of_study, location, start_date, end_date, is_current, description
                ) VALUES (
                    res_rec.id, 
                    edu_item->>'school', 
                    edu_item->>'degree', 
                    edu_item->>'fieldOfStudy', 
                    edu_item->>'location', 
                    edu_item->>'startDate', 
                    edu_item->>'endDate', 
                    (edu_item->>'current')::boolean, 
                    edu_item->>'description'
                );
            END LOOP;
        END IF;

        -- Parse Skills (Handling both object and string formats if they exist)
        IF res_rec.skills IS NOT NULL THEN
            FOR skill_item IN SELECT * FROM jsonb_array_elements(res_rec.skills) LOOP
                IF jsonb_typeof(skill_item) = 'object' THEN
                    INSERT INTO public.resume_skills (resume_id, name, "level", category)
                    VALUES (res_rec.id, skill_item->>'name', skill_item->>'level', skill_item->>'category')
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

-- 4. Hybrid Sync Triggers
-- Function to update the JSONB cache on the resumes table when relational data changes
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
$$ LANGUAGE plpgsql;

-- Apply triggers to child tables
CREATE TRIGGER trigger_sync_experience AFTER INSERT OR UPDATE OR DELETE ON public.resume_experiences
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();
CREATE TRIGGER trigger_sync_education AFTER INSERT OR UPDATE OR DELETE ON public.resume_educations
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();
CREATE TRIGGER trigger_sync_skills AFTER INSERT OR UPDATE OR DELETE ON public.resume_skills
    FOR EACH ROW EXECUTE FUNCTION public.sync_resume_json_cache();

COMMENT ON TABLE public.resume_experiences IS 'Normalized work experience.';
COMMENT ON TABLE public.resume_educations IS 'Normalized education history.';
COMMENT ON TABLE public.resume_skills IS 'Normalized skills for indexed search.';
COMMENT ON TABLE public.resume_certifications IS 'Normalized certifications.';
