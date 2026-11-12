import { useState } from 'react';

import { ProfileIcon } from './ProfileIcon.jsx';
import {
  SHADE_SUN_MAX,
  SHADE_SUN_STEP,
  balanceSide,
  balanceText,
  shadeSunBalance,
  weightsFromBalance,
} from './shadeSun.js';

const MAX_NAME_LENGTH = 40;
// Shade and sun share one bar (ADR-030); wind and green have their own (ADR-031).
const FACTOR_FIELDS = [
  { key: 'wind', label: 'Evitar viento', icon: 'wind' },
  { key: 'vegetation', label: 'Verde', icon: 'vegetation' },
];
// The same limit as the backend (ADR-023).
const MAX_DETOUR_PERCENTAGE = 40;

export function RouteProfileEditor({ profile = null, onSave, onCancel }) {
  const [name, setName] = useState(profile?.name ?? '');
  // Routes saved before PBI-8.2 come without wind: it counts as 0. A route saved with shade and sun
  // at once keeps the larger one (ADR-030).
  const [weights, setWeights] = useState(() => {
    const saved = { shade: 50, sun: 0, wind: 0, vegetation: 0, ...profile?.weights };
    return { ...saved, ...weightsFromBalance(shadeSunBalance(saved)) };
  });
  const balance = shadeSunBalance(weights);
  const [maxDetour, setMaxDetour] = useState(profile?.maxDetourPercentage ?? 25);
  const onlyTime =
    weights.shade === 0 && weights.sun === 0 && weights.wind === 0 && weights.vegetation === 0;
  const [errors, setErrors] = useState({});
  const shadeSunError = errors.shade || errors.sun;
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Escribe un nombre para la ruta.' });
      return;
    }
    setIsSaving(true);
    setErrors({});
    try {
      await onSave({ name: name.trim(), weights, maxDetourPercentage: maxDetour });
    } catch (error) {
      setErrors({ ...error.fields, form: error.fields ? '' : error.message });
      setIsSaving(false);
    }
  }

  return (
    <form className="route-profile-editor" onSubmit={submit} noValidate>
      <label className="route-profile-name">
        Nombre
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Por ejemplo, Verano"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'route-profile-name-error' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {errors.name && (
        <p id="route-profile-name-error" className="field-error">
          {errors.name}
        </p>
      )}
      {/* One bar: shade to the left, neutral in the middle, sun to the right (ADR-030). */}
      <div className="route-profile-weight route-profile-weight-shade-sun">
        <span>
          <ProfileIcon kind={balance > 0 ? 'sun' : 'shade'} />
          <label htmlFor="route-profile-shade-sun">Sombra o sol</label>
          <output htmlFor="route-profile-shade-sun">{balanceText(balance)}</output>
        </span>
        <span className="shade-sun-ends" aria-hidden="true">
          <span>
            <ProfileIcon kind="shade" />
            Sombra
          </span>
          <span>
            Sol
            <ProfileIcon kind="sun" />
          </span>
        </span>
        <input
          id="route-profile-shade-sun"
          className={`shade-sun-range is-${balanceSide(balance)}`}
          type="range"
          min={-SHADE_SUN_MAX}
          max={SHADE_SUN_MAX}
          step={SHADE_SUN_STEP}
          value={balance}
          aria-valuetext={balanceText(balance)}
          aria-invalid={Boolean(shadeSunError)}
          onChange={(event) =>
            setWeights((current) => ({
              ...current,
              ...weightsFromBalance(Number(event.target.value)),
            }))
          }
        />
        {shadeSunError && <small className="field-error">{shadeSunError}</small>}
      </div>
      {FACTOR_FIELDS.map(({ key, label, icon }) => (
        // An <output> inside the label would take the label instead of the slider.
        <div key={key} className={`route-profile-weight route-profile-weight-${key}`}>
          <span>
            <ProfileIcon kind={icon} />
            <label htmlFor={`route-profile-${key}`}>{label}</label>
            <output htmlFor={`route-profile-${key}`}>{weights[key]} %</output>
          </span>
          <input
            id={`route-profile-${key}`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={weights[key]}
            aria-valuetext={`${weights[key]} %`}
            onChange={(event) =>
              setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))
            }
          />
          {errors[key] && <small className="field-error">{errors[key]}</small>}
        </div>
      ))}
      <div className="route-profile-weight route-profile-weight-time">
        <span>
          <ProfileIcon kind="time" />
          <label htmlFor="route-profile-detour">Tiempo extra máximo</label>
          <output htmlFor="route-profile-detour">+{maxDetour} %</output>
        </span>
        <input
          id="route-profile-detour"
          type="range"
          min="0"
          max={MAX_DETOUR_PERCENTAGE}
          step="5"
          value={maxDetour}
          disabled={onlyTime}
          aria-valuetext={`${maxDetour} % más de tiempo`}
          aria-describedby="route-profile-detour-help"
          onChange={(event) => setMaxDetour(Number(event.target.value))}
        />
        <small id="route-profile-detour-help" className="route-profile-help">
          {onlyTime
            ? 'Con sombra y sol en neutro y el viento y el verde a 0 % es la ruta más rápida: no hay rodeo.'
            : `Cuánto más puede tardar que la ruta más rápida: con +${maxDetour} %, un paseo de 20 min puede durar hasta ${Math.floor(20 * (1 + maxDetour / 100))} min.`}
        </small>
        {errors.maxDetourPercentage && (
          <small className="field-error">{errors.maxDetourPercentage}</small>
        )}
      </div>
      {errors.form && (
        <p className="form-message form-message-error" role="alert">
          {errors.form}
        </p>
      )}
      <div className="profile-dialog-actions">
        <button type="button" className="secondary-button" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="profile-dialog-confirm" disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
