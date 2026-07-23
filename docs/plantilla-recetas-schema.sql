-- =============================================================================
-- Agendify — Plantilla de recetas (PostgreSQL)
-- Asociada 1:1 al profesional autenticado.
-- Ejecutar en el esquema correspondiente del backend.
-- =============================================================================

-- IMPORTANTE: ajusta el nombre de la tabla/columna FK si en tu BD es distinto
-- (ej. profesional / profesionales). El frontend no depende del nombre SQL.

CREATE TABLE IF NOT EXISTS plantilla_receta (
    id_plantilla_receta   BIGSERIAL PRIMARY KEY,
    id_profesional        BIGINT NOT NULL,
    configuracion         JSONB NOT NULL,
    version_config        INTEGER NOT NULL DEFAULT 1,
    logo_url              TEXT NULL,
    firma_url             TEXT NULL,
    sello_url             TEXT NULL,
    activo                BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_plantilla_receta_profesional UNIQUE (id_profesional),
    CONSTRAINT fk_plantilla_receta_profesional
        FOREIGN KEY (id_profesional)
        REFERENCES profesionales (id_profesional)
        ON DELETE CASCADE,
    CONSTRAINT ck_plantilla_receta_version CHECK (version_config >= 1)
);

COMMENT ON TABLE plantilla_receta IS
    'Configuración de plantilla de recetas por profesional (1:1).';
COMMENT ON COLUMN plantilla_receta.configuracion IS
    'JSON completo PlantillaRecetasConfigDto (visibilidad, identidad, distribución, pie).';
COMMENT ON COLUMN plantilla_receta.logo_url IS
    'Denormalizado opcional de configuracion.identidad.logo_url.';
COMMENT ON COLUMN plantilla_receta.firma_url IS
    'Denormalizado opcional de configuracion.pie.firma_url (firma visual, no certificada).';
COMMENT ON COLUMN plantilla_receta.sello_url IS
    'Denormalizado opcional de configuracion.pie.sello_url.';

CREATE INDEX IF NOT EXISTS idx_plantilla_receta_profesional
    ON plantilla_receta (id_profesional);

CREATE INDEX IF NOT EXISTS idx_plantilla_receta_config_gin
    ON plantilla_receta USING GIN (configuracion);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_plantilla_receta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plantilla_receta_updated_at ON plantilla_receta;
CREATE TRIGGER trg_plantilla_receta_updated_at
    BEFORE UPDATE ON plantilla_receta
    FOR EACH ROW
    EXECUTE PROCEDURE set_plantilla_receta_updated_at();

-- -----------------------------------------------------------------------------
-- Ejemplo de insert con configuración mínima (opcional / seeds de prueba)
-- -----------------------------------------------------------------------------
-- INSERT INTO plantilla_receta (id_profesional, configuracion, version_config)
-- VALUES (
--   1,
--   '{
--     "version": 1,
--     "visibilidad": {
--       "nombre": true,
--       "especialidad": true,
--       "cedula_profesional": true,
--       "telefono_profesional": true,
--       "email": false,
--       "nombre_consultorio": true,
--       "telefono_consultorio": true,
--       "direccion_consultorio": true
--     },
--     "datos_visualizacion": {
--       "nombre": "",
--       "especialidad": "",
--       "cedula_profesional": "",
--       "telefono_profesional": "",
--       "email": "",
--       "nombre_consultorio": "",
--       "telefono_consultorio": "",
--       "direccion_consultorio": ""
--     },
--     "identidad": {
--       "mostrar_logo": true,
--       "logo_url": null,
--       "color_id": "indigo",
--       "encabezado": "minimalista",
--       "tipografia": "moderna",
--       "separador": "sutil"
--     },
--     "distribucion": {
--       "formato": "carta",
--       "layout": "clasica",
--       "secciones": {
--         "fecha_emision": true,
--         "datos_paciente": true,
--         "edad_paciente": true,
--         "diagnostico": false,
--         "medicamentos": true,
--         "indicaciones": true,
--         "proxima_cita": false,
--         "firma": true,
--         "sello": false,
--         "aviso_legal": true
--       },
--       "etiquetas": {
--         "paciente": "Paciente",
--         "diagnostico": "Diagnóstico",
--         "medicamentos": "Medicamentos",
--         "indicaciones": "Indicaciones",
--         "proxima_cita": "Próxima cita",
--         "firma": "Firma del profesional",
--         "aviso_legal": "Aviso legal"
--       },
--       "espaciado": "normal",
--       "tamano_texto": "mediano"
--     },
--     "pie": {
--       "firma_url": null,
--       "sello_url": null,
--       "mostrar_nombre_bajo_firma": true,
--       "mostrar_especialidad_bajo_firma": true,
--       "mostrar_cedula_bajo_firma": true,
--       "texto_pie": "Esta receta es personal y no debe compartirse.",
--       "mostrar_telefono": true,
--       "mostrar_correo": false,
--       "mostrar_direccion": true,
--       "mostrar_numero_pagina": false,
--       "mostrar_fecha_generacion": true
--     }
--   }'::jsonb,
--   1
-- );
