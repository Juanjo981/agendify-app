import { PermisoDetalle } from '../models/equipo.model';

export const PERMISOS_DETALLES: PermisoDetalle[] = [
  {
    key: 'agenda',
    label: 'Agenda',
    descripcion: 'Puede ver y gestionar la agenda del consultorio',
    icono: 'calendar-outline',
  },
  {
    key: 'citas',
    label: 'Citas',
    descripcion: 'Puede crear, editar y cancelar citas',
    icono: 'medical-outline',
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    descripcion: 'Puede registrar y editar fichas de pacientes',
    icono: 'people-outline',
  },
  {
    key: 'sesiones',
    label: 'Sesiones',
    descripcion: 'Puede ver y gestionar las sesiones y sus notas',
    icono: 'document-text-outline',
  },
  {
    key: 'estadisticas',
    label: 'Estadisticas',
    descripcion: 'Puede consultar las estadisticas del consultorio',
    icono: 'stats-chart-outline',
  },
  {
    key: 'configuracion',
    label: 'Configuracion',
    descripcion: 'Puede acceder a la configuracion del sistema',
    icono: 'settings-outline',
  },
];
