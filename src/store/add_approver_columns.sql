-- Add columns to store the name of the approver
ALTER TABLE public.telefonia_solicitudes
ADD COLUMN aprobacion_gerencia_nombre text,
ADD COLUMN aprobacion_admin_nombre text;

-- Optional: Add comments
COMMENT ON COLUMN public.telefonia_solicitudes.aprobacion_gerencia_nombre IS 'Nombre del usuario que aprobó a nivel Gerencia';
COMMENT ON COLUMN public.telefonia_solicitudes.aprobacion_admin_nombre IS 'Nombre del usuario que aprobó a nivel Administración';
