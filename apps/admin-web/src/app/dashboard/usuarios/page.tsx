'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Flag } from 'lucide-react';
import FilterBar, { type FilterConfig } from '@/components/FilterBar';
import DataTable, { type DataTableColumn, type SortState } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import PlanBadge from '@/components/PlanBadge';
import { MOCK_USERS } from '@/mocks/users';
import type { AdminUser } from '@/mocks/types';
import { formatDate } from '@/utils/format';
import { VISIBILITY_LABELS } from '@/utils/labels';

const PAGE_SIZE = 8;

export default function UsuariosPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [plan, setPlan] = useState('');
  const [visibilidad, setVisibilidad] = useState('');
  const [registro, setRegistro] = useState('');
  const [reportes, setReportes] = useState('');
  const [red, setRed] = useState('');
  const [actividad, setActividad] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'fecha', direction: 'desc' });

  const filters: FilterConfig[] = [
    {
      id: 'estado',
      label: 'Estado',
      value: estado,
      options: [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' },
        { value: 'suspendido', label: 'Suspendido' },
        { value: 'bloqueado', label: 'Bloqueado' },
        { value: 'pendiente', label: 'Pendiente' },
      ],
    },
    {
      id: 'plan',
      label: 'Plan',
      value: plan,
      options: [
        { value: 'free', label: 'Free' },
        { value: 'plus', label: 'Plus' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
      ],
    },
    {
      id: 'actividad',
      label: 'Actividad Comercial',
      value: actividad,
      options: [
        { value: 'productos', label: 'Productos' },
        { value: 'servicios', label: 'Servicios' },
        { value: 'ambos', label: 'Ambos' },
        { value: 'ninguno', label: 'Ninguno' },
      ],
    },
    {
      id: 'visibilidad',
      label: 'Visibilidad',
      value: visibilidad,
      options: [
        { value: 'publico', label: 'Público' },
        { value: 'privado', label: 'Privado' },
        { value: 'solo_equipo', label: 'Solo equipo' },
      ],
    },
    {
      id: 'registro',
      label: 'Fecha de registro',
      value: registro,
      options: [
        { value: '30', label: 'Últimos 30 días' },
        { value: '90', label: 'Últimos 90 días' },
        { value: '365', label: 'Último año' },
      ],
    },
    {
      id: 'reportes',
      label: 'Reportes',
      value: reportes,
      options: [
        { value: 'con_reportes', label: 'Con reportes' },
        { value: 'sin_reportes', label: 'Sin reportes' },
      ],
    },
    {
      id: 'red',
      label: 'Red empresarial',
      value: red,
      options: [
        { value: 'visibles', label: 'Visibles en la red' },
        { value: 'pendientes_verificacion', label: 'Pendientes de verificar' },
      ],
    },
  ];

  const handleFilterChange = (id: string, value: string) => {
    setPage(1);
    if (id === 'estado') setEstado(value);
    if (id === 'plan') setPlan(value);
    if (id === 'visibilidad') setVisibilidad(value);
    if (id === 'registro') setRegistro(value);
    if (id === 'reportes') setReportes(value);
    if (id === 'red') setRed(value);
    if (id === 'actividad') setActividad(value);
  };

  const filteredUsers = useMemo(() => {
    const now = Date.now();
    return MOCK_USERS.filter((user) => {
      const matchesSearch =
        user.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesEstado = !estado || user.estado === estado;
      const matchesPlan = !plan || user.planId === plan;
      const matchesVisibilidad = !visibilidad || user.visibilidadRed === visibilidad;
      const matchesRegistro =
        !registro || now - new Date(user.fechaRegistro).getTime() <= Number(registro) * 24 * 60 * 60 * 1000;
      const matchesReportes =
        !reportes || (reportes === 'con_reportes' ? user.reportesCount > 0 : user.reportesCount === 0);
      const matchesRed =
        !red || (red === 'visibles' ? user.visibilidadRed !== 'privado' : user.verificacionRed === 'pendiente');
      const matchesActividad =
        !actividad || (user.actividadComercial && user.actividadComercial.tipo === actividad);
      return matchesSearch && matchesEstado && matchesPlan && matchesVisibilidad && matchesRegistro && matchesReportes && matchesRed && matchesActividad;
    });
  }, [search, estado, plan, visibilidad, registro, reportes, red, actividad]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers].sort((a, b) => {
      const cmp =
        sort.key === 'usuario'
          ? a.nombreCompleto.localeCompare(b.nombreCompleto)
          : new Date(a.fechaRegistro).getTime() - new Date(b.fechaRegistro).getTime();
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredUsers, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const paginatedUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSortChange = (key: string) => {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  };

  const goToDetail = (user: AdminUser) => router.push(`/dashboard/usuarios/${user.id}`);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'usuario',
      header: 'Usuario',
      sortable: true,
      render: (row) => (
        <div className="table-user-cell">
          <div className="table-user-avatar">{row.iniciales}</div>
          <div className="table-user-name-col">
            <span className="table-user-name">{row.nombreCompleto}</span>
            <span className="table-user-email">{row.email}</span>
          </div>
        </div>
      ),
    },
    { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
    { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planId={row.planId} /> },
    {
      key: 'actividad',
      header: 'Actividad',
      render: (row) => {
        const act = row.actividadComercial?.tipo || 'ninguno';
        const colors: Record<string, string> = {
          productos: '#20c997',
          servicios: '#0d6efd',
          ambos: '#6025d2',
          ninguno: '#6c757d',
        };
        return (
          <span style={{
            textTransform: 'capitalize',
            fontWeight: 'bold',
            fontSize: '12px',
            color: colors[act] || '#6c757d',
          }}>
            {act}
          </span>
        );
      }
    },
    { key: 'visibilidad', header: 'Visibilidad', render: (row) => VISIBILITY_LABELS[row.visibilidadRed], hideOnMobile: true },
    {
      key: 'reportes',
      header: 'Reportes',
      render: (row) => (
        <span className={`reports-count-badge ${row.reportesCount > 0 ? 'has-reports' : 'no-reports'}`}>
          <Flag size={13} />
          {row.reportesCount}
        </span>
      ),
    },
    { key: 'red', header: 'Red empresarial', render: (row) => <StatusBadge status={row.verificacionRed} />, hideOnMobile: true },
    { key: 'fecha', header: 'Registro', sortable: true, align: 'right', render: (row) => formatDate(row.fechaRegistro) },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          className="table-row-action-btn"
          title="Ver detalle"
          onClick={(event) => {
            event.stopPropagation();
            goToDetail(row);
          }}
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-toolbar-heading">
          <span className="page-toolbar-title">Usuarios registrados</span>
          <span className="page-toolbar-subtitle">{sortedUsers.length} usuarios encontrados</span>
        </div>
      </div>

      <div className="panel-card">
        <FilterBar
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Buscar por nombre o correo..."
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        <DataTable
          columns={columns}
          data={paginatedUsers}
          keyExtractor={(row) => row.id}
          onRowClick={goToDetail}
          sort={sort}
          onSortChange={handleSortChange}
          emptyMessage="No se encontraron usuarios con estos filtros."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sortedUsers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
