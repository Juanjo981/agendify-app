-- =============================================================================
-- Agendify — Módulo de recetas médicas
-- PostgreSQL 16
--
-- Diseño híbrido recomendado:
--
--   recetas
--     Cabecera y contenido editable de la receta.
--     Mantiene una referencia rápida al PDF vigente.
--
--   receta_medicamentos
--     Medicamentos actuales y editables de la receta.
--
--   receta_versiones
--     Historial inmutable de cada PDF emitido y de los datos exactos
--     utilizados para generarlo.
--
-- Reglas principales:
--
--   1. Una receta nueva inicia como BORRADOR y version_actual = 0.
--   2. Al emitirla por primera vez:
--        - se genera version-1.pdf;
--        - se crea receta_versiones número 1;
--        - la receta pasa a EMITIDA.
--   3. Editar una receta EMITIDA genera una nueva versión.
--   4. "Guardar como copia" crea una receta nueva con id_receta_origen.
--   5. En la BD solo se guardan object keys de R2, nunca URLs firmadas.
--   6. Los PDFs y snapshots históricos no deben modificarse.
--
-- Ruta R2 recomendada:
--
--   {id_profesional}/{id_paciente}/recetas/{id_receta}/version-{n}.pdf
--
-- Ejemplo:
--
--   7/35/recetas/182/version-1.pdf
--   7/35/recetas/182/version-2.pdf
--
-- IMPORTANTE:
-- Verificar antes de ejecutar que las tablas existentes sean exactamente:
--
--   profesionales(id_profesional)
--   pacientes(id_paciente)
--   usuarios(id_usuario)
--   plantilla_receta(id_plantilla_receta)
-- =============================================================================


-- =============================================================================
-- 1. FUNCIÓN PARA UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION set_recetas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. TABLA PRINCIPAL: recetas
-- =============================================================================

CREATE TABLE IF NOT EXISTS recetas (
    id_receta                          BIGSERIAL PRIMARY KEY,

    -- Relaciones principales
    id_profesional                     BIGINT NOT NULL,
    id_paciente                        BIGINT NOT NULL,

    -- Plantilla que originó la receta.
    -- Es una referencia informativa: el snapshot preserva el diseño histórico.
    id_plantilla_receta                BIGINT,

    -- Receta original cuando se utiliza "Guardar como copia".
    id_receta_origen                   BIGINT,

    -- Nombre visible dentro de Agendify y al descargar el archivo.
    -- El nombre no forma parte del object key de R2.
    nombre                             VARCHAR(255) NOT NULL,

    -- Datos actuales y editables de la receta
    fecha_emision                      DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Snapshots básicos del paciente para que un cambio futuro en su ficha
    -- no modifique los datos mostrados en esta receta.
    paciente_nombre                    VARCHAR(200) NOT NULL,
    paciente_fecha_nacimiento_snapshot DATE,
    edad_texto                         VARCHAR(40),

    diagnostico                        TEXT,
    indicaciones                       TEXT,

    proxima_cita_fecha                 DATE,
    proxima_cita_hora                  TIME,

    -- Información visible únicamente para el profesional.
    notas_internas                     TEXT,

    -- Configuración visual actual utilizada para editar o regenerar la receta.
    -- Cada versión emitida conserva también su propio snapshot inmutable.
    configuracion_plantilla_snapshot   JSONB,

    -- Ciclo documental:
    --
    -- BORRADOR:
    --   todavía no posee un PDF definitivo.
    --
    -- EMITIDA:
    --   posee al menos una versión PDF.
    --
    -- ANULADA:
    --   permanece en el histórico, pero ya no tiene validez.
    --
    -- ELIMINADA:
    --   borrado lógico administrativo.
    estado                             VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',

    -- Un borrador comienza en 0.
    -- La primera emisión crea la versión 1.
    version_actual                     INTEGER NOT NULL DEFAULT 0,

    -- Referencia rápida a la versión PDF vigente.
    -- El historial completo se encuentra en receta_versiones.
    r2_object_key_actual               VARCHAR(1000),
    nombre_archivo_actual              VARCHAR(500),
    pdf_content_type_actual            VARCHAR(100),
    pdf_size_bytes_actual              BIGINT,
    pdf_hash_sha256_actual             VARCHAR(64),
    pdf_generado_at                    TIMESTAMP,

    -- Ciclo de vida
    created_at                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    emitida_at                         TIMESTAMP,
    ultima_emision_at                  TIMESTAMP,
    anulada_at                         TIMESTAMP,
    eliminada_at                       TIMESTAMP,

    -- Auditoría
    created_by                         BIGINT,
    updated_by                         BIGINT,
    anulada_by                         BIGINT,
    eliminada_by                       BIGINT,

    -- -------------------------------------------------------------------------
    -- Foreign keys
    -- -------------------------------------------------------------------------

    CONSTRAINT fk_recetas_profesional
        FOREIGN KEY (id_profesional)
        REFERENCES profesionales (id_profesional)
        ON DELETE RESTRICT,

    CONSTRAINT fk_recetas_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES pacientes (id_paciente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_recetas_plantilla
        FOREIGN KEY (id_plantilla_receta)
        REFERENCES plantilla_receta (id_plantilla_receta)
        ON DELETE SET NULL,

    CONSTRAINT fk_recetas_origen
        FOREIGN KEY (id_receta_origen)
        REFERENCES recetas (id_receta)
        ON DELETE SET NULL,

    CONSTRAINT fk_recetas_created_by
        FOREIGN KEY (created_by)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT fk_recetas_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT fk_recetas_anulada_by
        FOREIGN KEY (anulada_by)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT fk_recetas_eliminada_by
        FOREIGN KEY (eliminada_by)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL,

    -- -------------------------------------------------------------------------
    -- Checks
    -- -------------------------------------------------------------------------

    CONSTRAINT ck_recetas_nombre
        CHECK (LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT ck_recetas_paciente_nombre
        CHECK (LENGTH(TRIM(paciente_nombre)) > 0),

    CONSTRAINT ck_recetas_estado
        CHECK (
            estado IN (
                'BORRADOR',
                'EMITIDA',
                'ANULADA',
                'ELIMINADA'
            )
        ),

    CONSTRAINT ck_recetas_version_actual
        CHECK (version_actual >= 0),

    CONSTRAINT ck_recetas_pdf_size
        CHECK (
            pdf_size_bytes_actual IS NULL
            OR pdf_size_bytes_actual >= 0
        ),

    -- Un borrador debe permanecer sin versión definitiva.
    CONSTRAINT ck_recetas_borrador
        CHECK (
            estado <> 'BORRADOR'
            OR (
                version_actual = 0
                AND r2_object_key_actual IS NULL
                AND emitida_at IS NULL
            )
        ),

    -- Una receta emitida debe tener una versión y un PDF vigente.
    CONSTRAINT ck_recetas_emitida
        CHECK (
            estado <> 'EMITIDA'
            OR (
                version_actual >= 1
                AND r2_object_key_actual IS NOT NULL
                AND nombre_archivo_actual IS NOT NULL
                AND pdf_generado_at IS NOT NULL
                AND emitida_at IS NOT NULL
            )
        ),

    -- Una receta anulada debe indicar cuándo fue anulada.
    -- Puede conservar el PDF que tenía cuando estaba emitida.
    CONSTRAINT ck_recetas_anulada
        CHECK (
            estado <> 'ANULADA'
            OR anulada_at IS NOT NULL
        ),

    -- Una receta eliminada lógicamente debe indicar cuándo se eliminó.
    CONSTRAINT ck_recetas_eliminada
        CHECK (
            estado <> 'ELIMINADA'
            OR eliminada_at IS NOT NULL
        )
);


COMMENT ON TABLE recetas IS
    'Cabecera y contenido actual editable de recetas médicas. El histórico inmutable vive en receta_versiones.';

COMMENT ON COLUMN recetas.id_plantilla_receta IS
    'Referencia informativa a plantilla_receta. El snapshot preserva la apariencia utilizada.';

COMMENT ON COLUMN recetas.id_receta_origen IS
    'Receta original cuando este registro fue creado mediante Guardar como copia.';

COMMENT ON COLUMN recetas.nombre IS
    'Nombre visible de la receta. No se utiliza como parte fija del object key en R2.';

COMMENT ON COLUMN recetas.paciente_nombre IS
    'Snapshot del nombre mostrado en la receta para evitar cambios históricos al renombrar al paciente.';

COMMENT ON COLUMN recetas.paciente_fecha_nacimiento_snapshot IS
    'Fecha de nacimiento utilizada al calcular la edad mostrada en la receta.';

COMMENT ON COLUMN recetas.edad_texto IS
    'Edad exactamente mostrada, por ejemplo: 30 años, 8 meses o 1 año 3 meses.';

COMMENT ON COLUMN recetas.configuracion_plantilla_snapshot IS
    'Configuración visual actual usada durante la edición o regeneración del documento.';

COMMENT ON COLUMN recetas.estado IS
    'BORRADOR, EMITIDA, ANULADA o ELIMINADA.';

COMMENT ON COLUMN recetas.version_actual IS
    '0 para borrador sin PDF; 1 o superior para recetas emitidas.';

COMMENT ON COLUMN recetas.r2_object_key_actual IS
    'Object key del PDF vigente en Cloudflare R2. No contiene una URL pública o firmada.';


-- =============================================================================
-- 3. TABLA: receta_medicamentos
-- =============================================================================

CREATE TABLE IF NOT EXISTS receta_medicamentos (
    id_receta_medicamento      BIGSERIAL PRIMARY KEY,
    id_receta                  BIGINT NOT NULL,

    -- Posición visual dentro del formulario y del PDF.
    orden                      INTEGER NOT NULL DEFAULT 1,

    nombre                     VARCHAR(300) NOT NULL,
    dosis                      VARCHAR(255),
    frecuencia                 VARCHAR(255),
    duracion                   VARCHAR(255),
    indicaciones_adicionales   TEXT,

    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receta_medicamentos_receta
        FOREIGN KEY (id_receta)
        REFERENCES recetas (id_receta)
        ON DELETE CASCADE,

    CONSTRAINT ck_receta_medicamentos_orden
        CHECK (orden >= 1),

    CONSTRAINT ck_receta_medicamentos_nombre
        CHECK (LENGTH(TRIM(nombre)) > 0),

    -- Evita que dos medicamentos de la misma receta ocupen la misma posición.
    -- Esta restricción crea automáticamente un índice en PostgreSQL.
    CONSTRAINT uq_receta_medicamentos_receta_orden
        UNIQUE (id_receta, orden)
);


COMMENT ON TABLE receta_medicamentos IS
    'Medicamentos actuales y editables de una receta médica.';

COMMENT ON COLUMN receta_medicamentos.orden IS
    'Posición visual única del medicamento dentro de la receta.';


-- =============================================================================
-- 4. TABLA: receta_versiones
-- =============================================================================

CREATE TABLE IF NOT EXISTS receta_versiones (
    id_receta_version                  BIGSERIAL PRIMARY KEY,
    id_receta                          BIGINT NOT NULL,

    numero_version                     INTEGER NOT NULL,

    -- CREACION:
    --   primera emisión de la receta.
    --
    -- ACTUALIZACION:
    --   nueva versión de una receta ya emitida.
    --
    -- Una copia no utiliza tipo COPIA aquí:
    -- crea otra fila en recetas y comienza con CREACION.
    tipo_guardado                      VARCHAR(30) NOT NULL,

    -- Snapshot completo e inmutable de los datos que produjeron el PDF:
    --
    -- paciente,
    -- fecha,
    -- diagnóstico,
    -- indicaciones,
    -- medicamentos,
    -- próxima cita,
    -- datos visibles del profesional,
    -- cualquier otro valor impreso.
    datos_snapshot                     JSONB NOT NULL,

    -- Configuración visual exacta utilizada para generar esta versión.
    configuracion_plantilla_snapshot   JSONB,

    -- Archivo correspondiente a esta versión en Cloudflare R2.
    r2_object_key                      VARCHAR(1000) NOT NULL,
    nombre_archivo                     VARCHAR(500) NOT NULL,
    pdf_content_type                   VARCHAR(100) NOT NULL
                                       DEFAULT 'application/pdf',
    pdf_size_bytes                     BIGINT,
    pdf_hash_sha256                    VARCHAR(64),

    created_at                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                         BIGINT,

    CONSTRAINT fk_receta_versiones_receta
        FOREIGN KEY (id_receta)
        REFERENCES recetas (id_receta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_receta_versiones_created_by
        FOREIGN KEY (created_by)
        REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT ck_receta_versiones_numero
        CHECK (numero_version >= 1),

    CONSTRAINT ck_receta_versiones_tipo
        CHECK (
            tipo_guardado IN (
                'CREACION',
                'ACTUALIZACION'
            )
        ),

    CONSTRAINT ck_receta_versiones_nombre_archivo
        CHECK (LENGTH(TRIM(nombre_archivo)) > 0),

    CONSTRAINT ck_receta_versiones_content_type
        CHECK (pdf_content_type = 'application/pdf'),

    CONSTRAINT ck_receta_versiones_pdf_size
        CHECK (
            pdf_size_bytes IS NULL
            OR pdf_size_bytes >= 0
        ),

    CONSTRAINT uq_receta_versiones_receta_numero
        UNIQUE (id_receta, numero_version),

    CONSTRAINT uq_receta_versiones_r2_object_key
        UNIQUE (r2_object_key)
);


COMMENT ON TABLE receta_versiones IS
    'Historial inmutable de cada versión emitida de una receta y su PDF almacenado en Cloudflare R2.';

COMMENT ON COLUMN receta_versiones.datos_snapshot IS
    'Contenido clínico exacto utilizado para generar esta versión del PDF.';

COMMENT ON COLUMN receta_versiones.configuracion_plantilla_snapshot IS
    'Configuración visual exacta utilizada para generar esta versión del PDF.';

COMMENT ON COLUMN receta_versiones.r2_object_key IS
    'Object key único del PDF de esta versión en R2. Nunca una URL firmada.';

COMMENT ON COLUMN receta_versiones.pdf_hash_sha256 IS
    'Hash SHA-256 opcional para comprobar la integridad del archivo.';


-- =============================================================================
-- 5. ÍNDICES: recetas
-- =============================================================================

-- Listados generales por profesional.
CREATE INDEX IF NOT EXISTS idx_recetas_profesional
    ON recetas (
        id_profesional,
        fecha_emision DESC
    );

-- Historial general de un paciente.
CREATE INDEX IF NOT EXISTS idx_recetas_paciente
    ON recetas (
        id_paciente,
        fecha_emision DESC
    );

-- Consulta principal por profesional, paciente y estado.
CREATE INDEX IF NOT EXISTS idx_recetas_prof_pac_estado
    ON recetas (
        id_profesional,
        id_paciente,
        estado,
        fecha_emision DESC
    );

-- Borradores recientes del profesional.
CREATE INDEX IF NOT EXISTS idx_recetas_borradores_profesional
    ON recetas (
        id_profesional,
        updated_at DESC
    )
    WHERE estado = 'BORRADOR';

-- Recetas emitidas recientes del paciente.
CREATE INDEX IF NOT EXISTS idx_recetas_emitidas_paciente
    ON recetas (
        id_paciente,
        fecha_emision DESC
    )
    WHERE estado = 'EMITIDA';

-- Copias creadas desde una receta original.
CREATE INDEX IF NOT EXISTS idx_recetas_origen
    ON recetas (id_receta_origen)
    WHERE id_receta_origen IS NOT NULL;

-- El object key actual no puede pertenecer simultáneamente
-- a dos recetas diferentes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_recetas_r2_object_key_actual
    ON recetas (r2_object_key_actual)
    WHERE r2_object_key_actual IS NOT NULL;


-- =============================================================================
-- 6. ÍNDICES: receta_versiones
-- =============================================================================

-- La restricción UNIQUE (id_receta, numero_version) ya crea un índice.
-- Este índice adicional facilita obtener versiones por fecha descendente.
CREATE INDEX IF NOT EXISTS idx_receta_versiones_receta_fecha
    ON receta_versiones (
        id_receta,
        created_at DESC
    );


-- =============================================================================
-- 7. TRIGGERS UPDATED_AT
-- =============================================================================

DROP TRIGGER IF EXISTS trg_recetas_updated_at
    ON recetas;

CREATE TRIGGER trg_recetas_updated_at
    BEFORE UPDATE ON recetas
    FOR EACH ROW
    EXECUTE FUNCTION set_recetas_updated_at();


DROP TRIGGER IF EXISTS trg_receta_medicamentos_updated_at
    ON receta_medicamentos;

CREATE TRIGGER trg_receta_medicamentos_updated_at
    BEFORE UPDATE ON receta_medicamentos
    FOR EACH ROW
    EXECUTE FUNCTION set_recetas_updated_at();


-- =============================================================================
-- 8. FLUJO TRANSACCIONAL RECOMENDADO
-- =============================================================================
--
-- CREACIÓN DE BORRADOR:
--
--   recetas.version_actual       = 0
--   recetas.estado               = 'BORRADOR'
--   recetas.r2_object_key_actual = NULL
--
--
-- PRIMERA EMISIÓN:
--
--   1. Insertar/actualizar recetas y receta_medicamentos.
--   2. Generar PDF temporalmente.
--   3. Subir a:
--
--        {profesional}/{paciente}/recetas/{receta}/version-1.pdf
--
--   4. Insertar receta_versiones:
--
--        numero_version = 1
--        tipo_guardado  = 'CREACION'
--
--   5. Actualizar recetas:
--
--        estado                  = 'EMITIDA'
--        version_actual          = 1
--        r2_object_key_actual    = object key de la versión
--        nombre_archivo_actual   = nombre visible
--        pdf_generado_at         = CURRENT_TIMESTAMP
--        emitida_at              = CURRENT_TIMESTAMP
--        ultima_emision_at       = CURRENT_TIMESTAMP
--
--
-- ACTUALIZACIÓN DE UNA RECETA EMITIDA:
--
--   1. Actualizar datos editables y medicamentos.
--   2. Calcular siguiente versión:
--
--        siguiente_version = version_actual + 1
--
--   3. Generar y subir:
--
--        version-{siguiente_version}.pdf
--
--   4. Insertar receta_versiones con:
--
--        tipo_guardado = 'ACTUALIZACION'
--
--   5. Actualizar referencias actuales en recetas.
--
-- No sobrescribir ni eliminar el PDF histórico anterior.
--
--
-- GUARDAR COMO COPIA:
--
--   1. Crear una nueva fila en recetas.
--   2. Asignar id_receta_origen = id de la receta copiada.
--   3. Copiar medicamentos.
--   4. Permitir un nombre nuevo.
--   5. Iniciar como:
--
--        estado         = 'BORRADOR'
--        version_actual = 0
--
--   6. Cuando se emita, crear su propia version-1.pdf.
--
--
-- ANULACIÓN:
--
--   estado     = 'ANULADA'
--   anulada_at = CURRENT_TIMESTAMP
--   anulada_by = usuario autenticado
--
-- El PDF y sus versiones deben conservarse.
--
--
-- ELIMINACIÓN LÓGICA:
--
--   estado       = 'ELIMINADA'
--   eliminada_at = CURRENT_TIMESTAMP
--   eliminada_by = usuario autenticado
--
-- No eliminar físicamente versiones ni objetos R2 desde este flujo.
-- =============================================================================


-- =============================================================================
-- 9. ROLLBACK OPCIONAL
-- NO ejecutar en producción sin validar pérdida de información.
-- =============================================================================

/*

DROP TRIGGER IF EXISTS trg_receta_medicamentos_updated_at
    ON receta_medicamentos;

DROP TRIGGER IF EXISTS trg_recetas_updated_at
    ON recetas;

DROP TABLE IF EXISTS receta_versiones;
DROP TABLE IF EXISTS receta_medicamentos;
DROP TABLE IF EXISTS recetas;

DROP FUNCTION IF EXISTS set_recetas_updated_at();

*/