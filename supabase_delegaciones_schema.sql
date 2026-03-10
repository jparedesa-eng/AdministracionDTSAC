CREATE TABLE public.telefonia_geraprobador (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_creador_id uuid NOT NULL, -- UUID interno del colaborador
    usuario_nombre text,              
    gerente_id uuid NOT NULL,         -- UUID interno del gerente aprobador
    gerente_nombre text,             
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS temporalmente
ALTER TABLE public.telefonia_geraprobador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a todos los usuarios autenticados"
ON public.telefonia_geraprobador FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Permitir full acceso autenticados"
ON public.telefonia_geraprobador FOR ALL
TO authenticated USING (true) WITH CHECK (true);