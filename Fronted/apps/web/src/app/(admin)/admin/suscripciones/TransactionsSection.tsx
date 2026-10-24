'use client';

import { useEffect, useMemo, useState } from 'react';
import { listAdminTransactions } from '@beeapp/api-client';
import FilterBar, { type FilterConfig } from '@/components/admin/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import Pagination from '@/components/admin/Pagination';
import SlidePanel from '@/components/admin/SlidePanel';
import StatusBadge from '@/components/admin/StatusBadge';
import PlanBadge from '@/components/admin/PlanBadge';
import type { Transaction } from '@/lib/admin/types';
import { toTransaction } from '@/lib/admin/mapRecords';
import { formatCurrencyCOP, formatDate } from '@/lib/admin/format';
import { TRANSACTION_TIPO_LABELS } from '@/lib/admin/labels';

const PAGE_SIZE = 6;

const COLUMNS: DataTableColumn<Transaction>[] = [
  { key: 'usuario', header: 'Usuario', render: (row) => row.usuarioNombre },
  { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planId={row.planId} /> },
  { key: 'tipo', header: 'Tipo', render: (row) => TRANSACTION_TIPO_LABELS[row.tipo], hideOnMobile: true },
  { key: 'estado', header: 'Estado', render: (row) => <StatusBadge status={row.estado} /> },
  { key: 'monto', header: 'Monto', render: (row) => formatCurrencyCOP(row.monto), align: 'right' },
  { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.fecha), align: 'right', hideOnMobile: true },
];

export default function TransactionsSection() {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listAdminTransactions({ page: 1, pageSize: 100 })
      .then((result) => setRows(result.items.map(toTransaction)))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las transacciones.');
      });
  }, []);

  const filters: FilterConfig[] = [
    {
      id: 'estado',
      label: 'Estado',
      value: estado,
      options: [
        { value: 'pagado', label: 'Pagado' },
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'fallido', label: 'Fallido' },
        { value: 'reembolsado', label: 'Reembolsado' },
      ],
    },
    {
      id: 'tipo',
      label: 'Tipo',
      value: tipo,
      options: Object.entries(TRANSACTION_TIPO_LABELS).map(([value, label]) => ({ value, label })),
    },
  ];

  const filteredData = useMemo(() => {
    return rows.filter((txn) => {
      const matchesSearch = txn.usuarioNombre.toLowerCase().includes(search.toLowerCase());
      const matchesEstado = !estado || txn.estado === estado;
      const matchesTipo = !tipo || txn.tipo === tipo;
      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [rows, search, estado, tipo]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (id: string, value: string) => {
    setPage(1);
    if (id === 'estado') setEstado(value);
    if (id === 'tipo') setTipo(value);
  };

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <span className="panel-card-title">Transacciones</span>
      </div>

      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Buscar por usuario..."
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <DataTable
        columns={COLUMNS}
        data={paginatedData}
        keyExtractor={(row) => row.id}
        onRowClick={setSelected}
        emptyMessage="No se encontraron transacciones con estos filtros."
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filteredData.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title="Detalle de transacción">
        {selected && (
          <div className="detail-rows">
            <div className="detail-row">
              <span className="detail-row-label">Usuario</span>
              <span className="detail-row-value">{selected.usuarioNombre}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Plan</span>
              <span className="detail-row-value"><PlanBadge planId={selected.planId} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Tipo</span>
              <span className="detail-row-value">{TRANSACTION_TIPO_LABELS[selected.tipo]}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Estado</span>
              <span className="detail-row-value"><StatusBadge status={selected.estado} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Monto</span>
              <span className="detail-row-value">{formatCurrencyCOP(selected.monto)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Método de pago</span>
              <span className="detail-row-value">{selected.metodoPago}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Fecha</span>
              <span className="detail-row-value">{formatDate(selected.fecha)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">ID de transacción</span>
              <span className="detail-row-value">{selected.id}</span>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
