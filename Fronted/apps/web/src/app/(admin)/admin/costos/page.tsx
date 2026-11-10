'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminCostReport, setAdminSetting, type AdminCostReport } from '@beeapp/api-client';

const PRICE_FIELDS: Array<[keyof AdminCostReport['unitPrices'], string, string]> = [
  ['aiCredit', 'Crédito de IA', 'cost_ai_credit_usd'],
  ['callMinute', 'Minuto de llamada', 'cost_call_minute_usd'],
  ['storageGb', 'GB de almacenamiento', 'cost_storage_gb_usd'],
  ['egressGb', 'GB de tráfico', 'cost_egress_gb_usd'],
  ['realtimeMinute', 'Minuto en tiempo real', 'cost_realtime_minute_usd'],
  ['backendUser', 'Usuario activo en backend', 'cost_backend_user_usd'],
  ['otp', 'OTP', 'cost_otp_usd'],
  ['copPerUsd', 'Pesos por dólar', 'cost_cop_per_usd'],
];

function money(value: number) {
  return `US$ ${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export default function CostosPage() {
  const [report, setReport] = useState<AdminCostReport | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState({ free: '0.25', plus: '0.75', pro: '1.00' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mix, setMix] = useState({ free: '100', plus: '20', pro: '10' });
  const [planPrices, setPlanPrices] = useState({ plus: '4', pro: '8' });
  const [usage, setUsage] = useState({ ai: '20', calls: '10', storage: '1' });
  const [conversion, setConversion] = useState('5');

  useEffect(() => {
    getAdminCostReport()
      .then((next) => {
        setReport(next);
        setPrices(Object.fromEntries(PRICE_FIELDS.map(([key]) => [key, String(next.unitPrices[key])])));
        setThresholds({
          free: String(next.thresholds.free),
          plus: String(next.thresholds.plus),
          pro: String(next.thresholds.pro),
        });
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No fue posible calcular los costos.');
      });
  }, []);

  const simulation = useMemo(() => {
    const free = Number(mix.free) || 0;
    const plus = Number(mix.plus) || 0;
    const pro = Number(mix.pro) || 0;
    const users = free + plus + pro;
    const converted = Math.round(free * ((Number(conversion) || 0) / 100));
    const revenue = plus * (Number(planPrices.plus) || 0) + (pro + converted) * (Number(planPrices.pro) || 0);
    const unit = (Number(usage.ai) || 0) * (Number(prices.aiCredit) || 0)
      + (Number(usage.calls) || 0) * (Number(prices.callMinute) || 0)
      + (Number(usage.storage) || 0) * (Number(prices.storageGb) || 0)
      + (Number(prices.backendUser) || 0);
    const cost = users * unit;
    return {
      users,
      converted,
      revenue,
      cost,
      margin: revenue - cost,
      perUser: users > 0 ? cost / users : 0,
    };
  }, [conversion, mix, planPrices, prices, usage]);

  const savePrices = async () => {
    setError('');
    setMessage('');
    try {
      for (const [key, , setting] of PRICE_FIELDS) {
        await setAdminSetting(setting, prices[key] || '0');
      }
      await setAdminSetting('cost_alert_free_usd', thresholds.free);
      await setAdminSetting('cost_alert_plus_usd', thresholds.plus);
      await setAdminSetting('cost_alert_pro_usd', thresholds.pro);
      setReport(await getAdminCostReport());
      setMessage('Precios y umbrales guardados.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar los precios.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="form-hint">
        El costo se estima con el uso del mes y los precios unitarios. No sale de las facturas de OpenAI, Agora o Supabase. El ingreso de cada cohorte está en dólares usando los pesos por dólar de esta página.
      </p>
      {error ? <p className="page-toolbar-subtitle">{error}</p> : null}
      {message ? <p className="form-hint">{message}</p> : null}
      <div className="plan-limits-grid">
        {(report?.plans || []).map((plan) => (
          <div
            key={plan.planId}
            className="panel-card"
            style={plan.overThreshold ? { border: '1px solid #F44336', background: '#FDECEC' } : undefined}
          >
            <span className="panel-card-title">{plan.planId}</span>
            <p>{money(plan.costPerActiveUser)} por usuario activo</p>
            <p className="form-hint">{plan.activeUsers} usuarios activos · total {money(plan.totalCost)}</p>
            {plan.overThreshold ? <p className="page-toolbar-subtitle">Supera el umbral del plan.</p> : null}
          </div>
        ))}
      </div>
      {report ? (
        <div className="panel-card">
          <span className="panel-card-title">Uso del mes</span>
          <p>IA {money(report.totals.ai)} · llamadas {money(report.totals.calls)} · almacenamiento {money(report.totals.storage)}</p>
          <p>Tráfico {money(report.totals.egress)} · tiempo real {money(report.totals.realtime)} · backend {money(report.totals.backend)} · OTP {money(report.totals.otp)}</p>
          <p>Conversión de Free a pago: {(report.conversion.rate * 100).toFixed(1)}% ({report.conversion.paidUsers} de {report.conversion.freeUsers + report.conversion.paidUsers})</p>
        </div>
      ) : null}
      <div className="panel-card">
        <span className="panel-card-title">Margen por cohorte</span>
        {(report?.cohorts || []).map((cohort) => (
          <p key={cohort.month}>
            {cohort.month}: {cohort.users} personas · ingreso {money(cohort.revenueUsd)} · costo {money(cohort.costUsd)} · margen {money(cohort.marginUsd)}
          </p>
        ))}
      </div>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="panel-card-title">Precios unitarios y umbrales</span>
        <div className="plan-limits-grid">
          {PRICE_FIELDS.map(([key, label]) => (
            <div className="form-field" key={key}>
              <label className="form-field-label">{label}</label>
              <input className="form-field-input" value={prices[key] || ''} onChange={(event) => setPrices((current) => ({ ...current, [key]: event.target.value }))} />
            </div>
          ))}
          {(['free', 'plus', 'pro'] as const).map((plan) => (
            <div className="form-field" key={plan}>
              <label className="form-field-label">Umbral {plan} (US$)</label>
              <input className="form-field-input" value={thresholds[plan]} onChange={(event) => setThresholds((current) => ({ ...current, [plan]: event.target.value }))} />
            </div>
          ))}
        </div>
        <button className="confirm-dialog-btn-confirm" type="button" onClick={() => void savePrices()}>Guardar precios</button>
      </div>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="panel-card-title">Simulador</span>
        <p className="form-hint">Prueba una mezcla de planes y precios. No se guarda nada.</p>
        <div className="plan-limits-grid">
          {(['free', 'plus', 'pro'] as const).map((plan) => (
            <div className="form-field" key={plan}>
              <label className="form-field-label">Usuarios {plan}</label>
              <input className="form-field-input" value={mix[plan]} onChange={(event) => setMix((current) => ({ ...current, [plan]: event.target.value }))} />
            </div>
          ))}
          <div className="form-field">
            <label className="form-field-label">Precio Plus (US$)</label>
            <input className="form-field-input" value={planPrices.plus} onChange={(event) => setPlanPrices((current) => ({ ...current, plus: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Precio Pro (US$)</label>
            <input className="form-field-input" value={planPrices.pro} onChange={(event) => setPlanPrices((current) => ({ ...current, pro: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Conversión Free (%)</label>
            <input className="form-field-input" value={conversion} onChange={(event) => setConversion(event.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Créditos IA por usuario</label>
            <input className="form-field-input" value={usage.ai} onChange={(event) => setUsage((current) => ({ ...current, ai: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-field-label">Minutos de llamada</label>
            <input className="form-field-input" value={usage.calls} onChange={(event) => setUsage((current) => ({ ...current, calls: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-field-label">GB almacenados</label>
            <input className="form-field-input" value={usage.storage} onChange={(event) => setUsage((current) => ({ ...current, storage: event.target.value }))} />
          </div>
        </div>
        <p>Ingreso {money(simulation.revenue)} · costo {money(simulation.cost)} · margen {money(simulation.margin)}</p>
        <p>Costo por usuario {money(simulation.perUser)} · {simulation.converted} usuarios Free pasarían a Pro</p>
      </div>
    </div>
  );
}
