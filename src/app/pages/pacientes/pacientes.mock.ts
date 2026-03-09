// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AdjuntoMeta {
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  previewUrl?: string; // object URL (images only)
}

export interface NotaDto {
  id_nota: number;
  fecha: string; // ISO date 'YYYY-MM-DD'
  contenido: string;
  adjunto?: AdjuntoMeta;
}

export interface CitaDto {
  id_cita: number;
  fecha: string;
  hora: string;
  tipo: string;
  estado: 'Confirmada' | 'Pendiente' | 'Cancelada';
  notas?: string;
}

export interface PacienteDto {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  notas_generales: string;
  activo: boolean;
  direccion?: string;
  alertas?: string[];
  citas: CitaDto[];
  notas: NotaDto[];
}

// ─── Sesión clínica ───────────────────────────────────────────────────────────

export interface SesionPaciente {
  id_sesion: number;
  id_paciente: number;
  fecha: string;        // 'YYYY-MM-DD'
  hora: string;         // 'HH:mm'
  duracion_min: number;
  tipo: string;
  resumen: string;
  adjunto?: AdjuntoMeta;
}

// ─── Historial de eventos ─────────────────────────────────────────────────────

export type HistorialTipoEvento =
  | 'cita_confirmada'
  | 'cita_completada'
  | 'cita_cancelada'
  | 'cita_pendiente'
  | 'cita_pospuesta'
  | 'no_asistio'
  | 'sesion_registrada'
  | 'pago_registrado'
  | 'pago_pendiente'
  | 'reprogramacion'
  | 'nota_agregada';

export interface HistorialEvento {
  id: string;
  fecha: string;        // 'YYYY-MM-DD'
  hora?: string;
  tipo: HistorialTipoEvento;
  descripcion: string;
  detalle?: string;
}

// ─── Mock sesiones ────────────────────────────────────────────────────────────

export const SESIONES_MOCK_DATA: SesionPaciente[] = [
  {
    id_sesion: 1, id_paciente: 1, fecha: '2026-02-10', hora: '10:00',
    duracion_min: 45, tipo: 'Sesión clínica',
    resumen: 'Se revisó evolución del tratamiento para migraña. Paciente refiere mejoría notable. Se ajustan dosis.',
  },
  {
    id_sesion: 2, id_paciente: 1, fecha: '2026-01-15', hora: '11:30',
    duracion_min: 30, tipo: 'Consulta de seguimiento',
    resumen: 'Control tensión arterial. Valores dentro del rango esperado. Sin cambios en medicación.',
  },
  {
    id_sesion: 3, id_paciente: 4, fecha: '2026-02-05', hora: '15:00',
    duracion_min: 60, tipo: 'Sesión psicología',
    resumen: 'Se trabajan técnicas de respiración diafragmática y reestructuración cognitiva. Progreso positivo.',
  },
  {
    id_sesion: 4, id_paciente: 6, fecha: '2026-02-20', hora: '10:30',
    duracion_min: 30, tipo: 'Control clínico',
    resumen: 'Revisión TA: 132/85. Buena adherencia a dieta baja en sodio. Pendiente analítica en 3 meses.',
  },
  {
    id_sesion: 5, id_paciente: 6, fecha: '2025-12-10', hora: '10:30',
    duracion_min: 30, tipo: 'Control clínico',
    resumen: 'TA: 140/90. Se ajusta dosis enalapril a 20 mg. Recomendación: reducir estrés laboral.',
  },
  {
    id_sesion: 6, id_paciente: 18, fecha: '2026-02-08', hora: '17:00',
    duracion_min: 50, tipo: 'Fisioterapia',
    resumen: 'Mejoría en flexión lumbar. Se realizan ejercicios de estabilización core y movilidad vertebral.',
  },
  {
    id_sesion: 7, id_paciente: 18, fecha: '2026-01-08', hora: '17:00',
    duracion_min: 50, tipo: 'Fisioterapia',
    resumen: 'Primera sesión del mes. Tensión muscular paravertebral. Termoterapia + ejercicios de estiramiento.',
  },
];

// ─── Mock Dataset (25 pacientes) ─────────────────────────────────────────────

export const PACIENTES_MOCK_DATA: PacienteDto[] = [
  {
    id_paciente: 1,
    nombre: 'María',
    apellido: 'Torres',
    email: 'maria.torres@email.com',
    telefono: '+34 612 345 678',
    fecha_nacimiento: '1993-05-15',
    notas_generales: 'Historial de migraña. Alergia a la penicilina.',
    activo: true,
    direccion: 'Calle Mayor 45, 3º B, Madrid',
    alertas: ['Alergia a la penicilina', 'Migraña crónica'],
    citas: [
      { id_cita: 101, fecha: '2026-02-10', hora: '10:00', tipo: 'Consulta general', estado: 'Confirmada', notas: 'Revisión rutinaria' },
      { id_cita: 102, fecha: '2026-01-15', hora: '11:30', tipo: 'Seguimiento', estado: 'Confirmada', notas: 'Control tensión arterial' },
      { id_cita: 103, fecha: '2026-03-20', hora: '09:00', tipo: 'Consulta general', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 1001, fecha: '2026-02-10', contenido: 'Paciente refiere mejoría con el nuevo tratamiento para las migrañas.' },
      { id_nota: 1002, fecha: '2026-01-15', contenido: 'Se recomienda dieta baja en sodio y aumentar hidratación.' },
    ],
  },
  {
    id_paciente: 2,
    nombre: 'Carlos',
    apellido: 'Ramírez',
    email: 'carlos.ramirez@email.com',
    telefono: '+34 623 456 789',
    fecha_nacimiento: '1979-11-20',
    notas_generales: 'Diabetes tipo 2. Medicación: metformina 850 mg.',
    activo: true,
    direccion: 'Av. de la Constitución 12, Sevilla',
    alertas: ['Diabetes tipo 2 — control glucémico mensual'],
    citas: [
      { id_cita: 201, fecha: '2026-01-28', hora: '08:30', tipo: 'Control diabetes', estado: 'Confirmada', notas: 'HbA1c: 7.2 %' },
      { id_cita: 202, fecha: '2026-03-15', hora: '08:30', tipo: 'Control diabetes', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 2001, fecha: '2026-01-28', contenido: 'Control glucémico estable. HbA1c dentro del rango objetivo.' },
    ],
  },
  {
    id_paciente: 3,
    nombre: 'Ana Lucía',
    apellido: 'Fernández',
    email: 'analucia.fernandez@email.com',
    telefono: '+34 634 567 890',
    fecha_nacimiento: '1997-03-08',
    notas_generales: '',
    activo: true,
    citas: [],
    notas: [],
  },
  {
    id_paciente: 4,
    nombre: 'Javier',
    apellido: 'Morales',
    email: 'javier.morales@email.com',
    telefono: '+34 645 678 901',
    fecha_nacimiento: '1988-07-22',
    notas_generales: 'Ansiedad moderada. En tratamiento psicológico desde 2024.',
    activo: true,
    citas: [
      { id_cita: 401, fecha: '2026-02-05', hora: '15:00', tipo: 'Psicología', estado: 'Confirmada' },
      { id_cita: 402, fecha: '2026-02-19', hora: '15:00', tipo: 'Psicología', estado: 'Cancelada', notas: 'Canceló por viaje de trabajo' },
      { id_cita: 403, fecha: '2026-03-05', hora: '15:00', tipo: 'Psicología', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 4001, fecha: '2026-02-05', contenido: 'Se trabajan técnicas de respiración y mindfulness. Progreso positivo.' },
    ],
  },
  {
    id_paciente: 5,
    nombre: 'Sofía',
    apellido: 'Navarro',
    email: 'sofia.navarro@email.com',
    telefono: '+34 656 789 012',
    fecha_nacimiento: '2001-12-30',
    notas_generales: 'Primera visita. Sin antecedentes relevantes.',
    activo: true,
    citas: [
      { id_cita: 501, fecha: '2026-03-10', hora: '12:00', tipo: 'Primera consulta', estado: 'Pendiente' },
    ],
    notas: [],
  },
  {
    id_paciente: 6,
    nombre: 'Miguel',
    apellido: 'Castro',
    email: 'miguel.castro@email.com',
    telefono: '+34 667 890 123',
    fecha_nacimiento: '1975-09-14',
    notas_generales: 'Hipertensión. Medicación: enalapril 10 mg/día.',
    activo: true,
    citas: [
      { id_cita: 601, fecha: '2025-12-10', hora: '10:30', tipo: 'Control tensión', estado: 'Confirmada', notas: 'TA: 140/90' },
      { id_cita: 602, fecha: '2026-02-20', hora: '10:30', tipo: 'Control tensión', estado: 'Confirmada', notas: 'TA: 132/85 — mejoría notable' },
    ],
    notas: [
      { id_nota: 6001, fecha: '2026-02-20', contenido: 'Buena adherencia al tratamiento. Reducción de sodio en dieta.' },
      { id_nota: 6002, fecha: '2025-12-10', contenido: 'Se ajusta dosis de enalapril a 20 mg. Próximo control en 2 meses.' },
    ],
  },
  {
    id_paciente: 7,
    nombre: 'Valentina',
    apellido: 'López',
    email: 'valentina.lopez@email.com',
    telefono: '+34 678 901 234',
    fecha_nacimiento: '1995-06-03',
    notas_generales: '',
    activo: false,
    citas: [
      { id_cita: 701, fecha: '2025-10-15', hora: '09:30', tipo: 'Consulta general', estado: 'Confirmada' },
    ],
    notas: [],
  },
  {
    id_paciente: 8,
    nombre: 'Andrés',
    apellido: 'Gutiérrez',
    email: 'andres.gutierrez@email.com',
    telefono: '+34 689 012 345',
    fecha_nacimiento: '1982-04-17',
    notas_generales: 'Asma leve. Broncodilatador de rescate salbutamol.',
    activo: true,
    citas: [
      { id_cita: 801, fecha: '2026-01-20', hora: '11:00', tipo: 'Control respiratorio', estado: 'Confirmada' },
      { id_cita: 802, fecha: '2026-04-10', hora: '11:00', tipo: 'Control respiratorio', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 8001, fecha: '2026-01-20', contenido: 'Función pulmonar estable. Sin crisis en los últimos 3 meses.' },
    ],
  },
  {
    id_paciente: 9,
    nombre: 'Daniela',
    apellido: 'Romero',
    email: 'daniela.romero@email.com',
    telefono: '+34 690 123 456',
    fecha_nacimiento: '1990-08-25',
    notas_generales: 'Hipotiroidismo. Levotiroxina 75 mcg en ayunas.',
    activo: true,
    citas: [
      { id_cita: 901, fecha: '2026-02-28', hora: '08:00', tipo: 'Control tiroides', estado: 'Confirmada', notas: 'TSH: 2.1 mIU/L — normal' },
      { id_cita: 902, fecha: '2026-05-28', hora: '08:00', tipo: 'Control tiroides', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 9001, fecha: '2026-02-28', contenido: 'TSH en rango normal. Mantener dosis actual de levotiroxina.' },
    ],
  },
  {
    id_paciente: 10,
    nombre: 'Luis',
    apellido: 'Hernández',
    email: 'luis.hernandez@email.com',
    telefono: '+34 601 234 567',
    fecha_nacimiento: '1968-01-05',
    notas_generales: 'Artritis reumatoide. Reumatología cada 6 meses.',
    activo: true,
    citas: [
      { id_cita: 1001, fecha: '2025-11-12', hora: '14:00', tipo: 'Reumatología', estado: 'Confirmada' },
      { id_cita: 1002, fecha: '2026-05-12', hora: '14:00', tipo: 'Reumatología', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 10001, fecha: '2025-11-12', contenido: 'Sin brotes activos. Continúa metotrexato 15 mg semanal.' },
    ],
  },
  {
    id_paciente: 11,
    nombre: 'Patricia',
    apellido: 'Ruiz',
    email: 'patricia.ruiz@email.com',
    telefono: '+34 612 345 000',
    fecha_nacimiento: '1985-10-19',
    notas_generales: '',
    activo: true,
    citas: [],
    notas: [],
  },
  {
    id_paciente: 12,
    nombre: 'Roberto',
    apellido: 'Sánchez',
    email: 'roberto.sanchez@email.com',
    telefono: '+34 623 456 001',
    fecha_nacimiento: '1972-02-28',
    notas_generales: 'Colesterol alto. Estatinas desde 2020.',
    activo: true,
    citas: [
      { id_cita: 1201, fecha: '2026-01-10', hora: '09:00', tipo: 'Analítica', estado: 'Confirmada', notas: 'LDL: 98 mg/dL — en objetivo' },
    ],
    notas: [
      { id_nota: 12001, fecha: '2026-01-10', contenido: 'LDL controlado. Continuar rosuvastatina 10 mg.' },
    ],
  },
  {
    id_paciente: 13,
    nombre: 'Gabriela',
    apellido: 'Morales',
    email: 'gabriela.morales@email.com',
    telefono: '+34 634 567 002',
    fecha_nacimiento: '1998-07-11',
    notas_generales: 'Endometriosis diagnosticada en 2024.',
    activo: true,
    citas: [
      { id_cita: 1301, fecha: '2026-03-01', hora: '16:00', tipo: 'Ginecología', estado: 'Pendiente' },
      { id_cita: 1302, fecha: '2025-09-15', hora: '16:00', tipo: 'Ginecología', estado: 'Confirmada' },
    ],
    notas: [],
  },
  {
    id_paciente: 14,
    nombre: 'Fernando',
    apellido: 'Vega',
    email: 'fernando.vega@email.com',
    telefono: '+34 645 678 003',
    fecha_nacimiento: '1991-03-22',
    notas_generales: '',
    activo: true,
    citas: [],
    notas: [],
  },
  {
    id_paciente: 15,
    nombre: 'Clara',
    apellido: 'Muñoz',
    email: 'clara.munoz@email.com',
    telefono: '+34 656 789 004',
    fecha_nacimiento: '1980-12-05',
    notas_generales: 'Hipotiroidismo. Levotiroxina 50 mcg.',
    activo: false,
    citas: [
      { id_cita: 1501, fecha: '2025-08-20', hora: '10:00', tipo: 'Endocrinología', estado: 'Confirmada' },
    ],
    notas: [],
  },
  {
    id_paciente: 16,
    nombre: 'Diego',
    apellido: 'Ortiz',
    email: 'diego.ortiz@email.com',
    telefono: '+34 667 890 005',
    fecha_nacimiento: '2003-06-14',
    notas_generales: 'Acné severo. En tratamiento dermatológico con isotretinoína.',
    activo: true,
    citas: [
      { id_cita: 1601, fecha: '2026-02-14', hora: '13:00', tipo: 'Dermatología', estado: 'Confirmada', notas: 'Mejoría visible con isotretinoína' },
      { id_cita: 1602, fecha: '2026-04-14', hora: '13:00', tipo: 'Dermatología', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 16001, fecha: '2026-02-14', contenido: 'Buen progreso. Continuar tratamiento 3 meses más. Evitar exposición solar.' },
    ],
  },
  {
    id_paciente: 17,
    nombre: 'Elena',
    apellido: 'Jiménez',
    email: 'elena.jimenez@email.com',
    telefono: '+34 678 901 006',
    fecha_nacimiento: '1965-04-30',
    notas_generales: 'Menopausia. Terapia hormonal sustitutiva desde 2023.',
    activo: true,
    citas: [
      { id_cita: 1701, fecha: '2025-04-30', hora: '11:00', tipo: 'Ginecología', estado: 'Confirmada' },
      { id_cita: 1702, fecha: '2026-04-30', hora: '11:00', tipo: 'Ginecología', estado: 'Pendiente' },
    ],
    notas: [],
  },
  {
    id_paciente: 18,
    nombre: 'Pablo',
    apellido: 'Díaz',
    email: 'pablo.diaz@email.com',
    telefono: '+34 689 012 007',
    fecha_nacimiento: '1977-09-08',
    notas_generales: 'Lumbalgia crónica. Fisioterapia mensual recomendada.',
    activo: true,
    citas: [
      { id_cita: 1801, fecha: '2026-01-08', hora: '17:00', tipo: 'Fisioterapia', estado: 'Confirmada' },
      { id_cita: 1802, fecha: '2026-02-08', hora: '17:00', tipo: 'Fisioterapia', estado: 'Confirmada' },
      { id_cita: 1803, fecha: '2026-03-08', hora: '17:00', tipo: 'Fisioterapia', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 18001, fecha: '2026-02-08', contenido: 'Mejoría en flexión lumbar. Reducir sesiones a cada 6 semanas.' },
    ],
  },
  {
    id_paciente: 19,
    nombre: 'Camila',
    apellido: 'Herrera',
    email: 'camila.herrera@email.com',
    telefono: '+34 690 123 008',
    fecha_nacimiento: '2000-01-20',
    notas_generales: '',
    activo: true,
    citas: [],
    notas: [],
  },
  {
    id_paciente: 20,
    nombre: 'Ricardo',
    apellido: 'Vargas',
    email: 'ricardo.vargas@email.com',
    telefono: '+34 601 234 009',
    fecha_nacimiento: '1983-11-27',
    notas_generales: 'Insomnio crónico. Derivado a neurología.',
    activo: true,
    citas: [
      { id_cita: 2001, fecha: '2026-02-25', hora: '18:00', tipo: 'Neurología', estado: 'Cancelada', notas: 'Canceló por trabajo' },
      { id_cita: 2002, fecha: '2026-03-25', hora: '18:00', tipo: 'Neurología', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 20001, fecha: '2026-01-15', contenido: 'Higiene del sueño mejorada. Lorazepam solo en casos extremos.' },
    ],
  },
  {
    id_paciente: 21,
    nombre: 'Isabel',
    apellido: 'Aguilar',
    email: 'isabel.aguilar@email.com',
    telefono: '+34 612 345 010',
    fecha_nacimiento: '1989-08-16',
    notas_generales: '',
    activo: true,
    citas: [
      { id_cita: 2101, fecha: '2026-03-12', hora: '10:00', tipo: 'Consulta general', estado: 'Pendiente' },
    ],
    notas: [],
  },
  {
    id_paciente: 22,
    nombre: 'Hugo',
    apellido: 'Flores',
    email: 'hugo.flores@email.com',
    telefono: '+34 623 456 011',
    fecha_nacimiento: '1971-05-03',
    notas_generales: 'EPOC grado 2. Ex-fumador desde 2018.',
    activo: true,
    citas: [
      { id_cita: 2201, fecha: '2025-12-20', hora: '09:30', tipo: 'Neumología', estado: 'Confirmada' },
      { id_cita: 2202, fecha: '2026-06-20', hora: '09:30', tipo: 'Neumología', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 22001, fecha: '2025-12-20', contenido: 'FEV1 estable. Continuar rehabilitación pulmonar 3 veces por semana.' },
    ],
  },
  {
    id_paciente: 23,
    nombre: 'Natalia',
    apellido: 'Cruz',
    email: 'natalia.cruz@email.com',
    telefono: '+34 634 567 012',
    fecha_nacimiento: '2004-02-14',
    notas_generales: 'Celiaquía confirmada. Dieta estricta sin gluten.',
    activo: true,
    citas: [
      { id_cita: 2301, fecha: '2026-01-30', hora: '12:30', tipo: 'Nutrición', estado: 'Confirmada', notas: 'Buena adherencia a dieta sin gluten' },
    ],
    notas: [],
  },
  {
    id_paciente: 24,
    nombre: 'Tomás',
    apellido: 'Mora',
    email: 'tomas.mora@email.com',
    telefono: '+34 645 678 013',
    fecha_nacimiento: '1986-07-29',
    notas_generales: '',
    activo: false,
    citas: [],
    notas: [],
  },
  {
    id_paciente: 25,
    nombre: 'Adriana',
    apellido: 'Blanco',
    email: 'adriana.blanco@email.com',
    telefono: '+34 656 789 014',
    fecha_nacimiento: '1994-10-07',
    notas_generales: 'Embarazo 20 semanas. Control prenatal mensual.',
    activo: true,
    citas: [
      { id_cita: 2501, fecha: '2026-01-07', hora: '10:00', tipo: 'Prenatal', estado: 'Confirmada', notas: 'Eco 20 semanas: todo normal' },
      { id_cita: 2502, fecha: '2026-02-07', hora: '10:00', tipo: 'Prenatal', estado: 'Confirmada', notas: 'PA normal, peso adecuado' },
      { id_cita: 2503, fecha: '2026-03-07', hora: '10:00', tipo: 'Prenatal', estado: 'Pendiente' },
    ],
    notas: [
      { id_nota: 25001, fecha: '2026-02-07', contenido: 'Embarazo de curso normal. Suplementación con ácido fólico y hierro. Sin complicaciones.' },
    ],
  },
];
