# Supabase Setup Guide (Actualizado)

## 1. Crear Proyecto
Crea un proyecto en [Supabase](https://supabase.com/).

## 2. Script de Base de Datos
Ejecuta este script en el **SQL Editor**:

```sql
-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name TEXT NOT NULL,
  course TEXT NOT NULL,
  student_id TEXT NOT NULL, -- Matrícula única
  reason TEXT NOT NULL,
  offense_type TEXT NOT NULL CHECK (offense_type IN ('Leve', 'Grave', 'Muy Grave')),
  agreement TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  director_signature_url TEXT,
  psychologist_signature_url TEXT,
  student_signature_url TEXT,
  evidence_image_url TEXT, -- Foto del estudiante
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_student_id ON reports(student_id);
CREATE INDEX IF NOT EXISTS idx_student_name ON reports(student_name);

-- Habilitar RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Política de acceso público (Demo)
CREATE POLICY "Acceso total público" ON reports FOR ALL USING (true);

-- Vista para ver estudiantes con más de 5 reportes (Lista Negra)
CREATE OR REPLACE VIEW blacklist AS
SELECT 
    student_id, 
    student_name, 
    course,
    COUNT(*) as total_reports
FROM reports
GROUP BY student_id, student_name, course
HAVING COUNT(*) >= 5;
```

## 3. Configuración de Storage
1. Ve a **Storage**.
2. Crea un bucket llamado `report-assets`.
3. Hazlo **Público**.
4. En **Policies**, permite `SELECT` e `INSERT` para usuarios anónimos (público).

## 4. Variables de Entorno (.env)
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anonima
```
