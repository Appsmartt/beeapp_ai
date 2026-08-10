import type { Transaction } from './types';

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'txn_1001', usuarioId: 'usr_001', usuarioNombre: 'María Gómez', planId: 'plus', tipo: 'renovacion', estado: 'pagado', monto: 99000, fecha: '2026-07-14', metodoPago: 'Tarjeta de crédito' },
  { id: 'txn_1002', usuarioId: 'usr_002', usuarioNombre: 'Laura Ramos', planId: 'pro', tipo: 'renovacion', estado: 'fallido', monto: 249000, fecha: '2026-07-10', metodoPago: 'Tarjeta de débito' },
  { id: 'txn_1003', usuarioId: 'usr_003', usuarioNombre: 'Sofía Castro', planId: 'enterprise', tipo: 'alta', estado: 'pagado', monto: 599000, fecha: '2026-07-08', metodoPago: 'Transferencia' },
  { id: 'txn_1004', usuarioId: 'usr_005', usuarioNombre: 'Camila Herrera', planId: 'plus', tipo: 'alta', estado: 'pagado', monto: 99000, fecha: '2026-07-05', metodoPago: 'Tarjeta de crédito' },
  { id: 'txn_1005', usuarioId: 'usr_006', usuarioNombre: 'Juan Pablo Rojas', planId: 'pro', tipo: 'cancelacion', estado: 'pagado', monto: 0, fecha: '2026-06-30', metodoPago: 'N/A' },
  { id: 'txn_1006', usuarioId: 'usr_007', usuarioNombre: 'Valentina Ortiz', planId: 'enterprise', tipo: 'renovacion', estado: 'pagado', monto: 599000, fecha: '2026-06-27', metodoPago: 'Transferencia' },
  { id: 'txn_1007', usuarioId: 'usr_009', usuarioNombre: 'Isabella Muñoz', planId: 'plus', tipo: 'renovacion', estado: 'pendiente', monto: 99000, fecha: '2026-06-20', metodoPago: 'Tarjeta de crédito' },
  { id: 'txn_1008', usuarioId: 'usr_010', usuarioNombre: 'Santiago Vargas', planId: 'pro', tipo: 'alta', estado: 'pagado', monto: 249000, fecha: '2026-06-18', metodoPago: 'Tarjeta de crédito' },
  { id: 'txn_1009', usuarioId: 'usr_012', usuarioNombre: 'Nicolás Restrepo', planId: 'enterprise', tipo: 'renovacion', estado: 'pagado', monto: 599000, fecha: '2026-06-11', metodoPago: 'Transferencia' },
  { id: 'txn_1010', usuarioId: 'usr_002', usuarioNombre: 'Laura Ramos', planId: 'pro', tipo: 'reembolso', estado: 'reembolsado', monto: -249000, fecha: '2026-06-02', metodoPago: 'Tarjeta de débito' },
  { id: 'txn_1011', usuarioId: 'usr_001', usuarioNombre: 'María Gómez', planId: 'plus', tipo: 'alta', estado: 'pagado', monto: 99000, fecha: '2026-01-14', metodoPago: 'Tarjeta de crédito' },
  { id: 'txn_1012', usuarioId: 'usr_003', usuarioNombre: 'Sofía Castro', planId: 'pro', tipo: 'cancelacion', estado: 'pagado', monto: 0, fecha: '2025-08-19', metodoPago: 'N/A' },
];
