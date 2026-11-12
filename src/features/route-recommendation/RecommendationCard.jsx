import { ProfileIcon } from '../route-profiles/ProfileIcon.jsx';
import { WEIGHT_FIELDS } from '../route-profiles/RouteProfileEditor.jsx';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const format = (value) => numberFormat.format(value);

// Where the wind comes from, as the eight points of the compass.
export function compassPoint(directionDeg) {
  return COMPASS[Math.round((((directionDeg % 360) + 360) % 360) / 45) % 8];
}

// The local time of the Open-Meteo value ("2026-11-12T10:45" → "10:45").
const observedTime = (observedAt) =>
  typeof observedAt === 'string' && observedAt.length >= 16 ? observedAt.slice(11, 16) : null;

export function weatherSummary(weather) {
  if (!weather) return 'No hay datos del tiempo actual.';
  const time = observedTime(weather.observedAt);
  const feels = Number.isFinite(weather.apparentTemperature)
    ? ` (sensación ${format(weather.apparentTemperature)} °C)`
    : '';
  const gusts = Number.isFinite(weather.windGusts)
    ? `, rachas de ${format(weather.windGusts)} km/h`
    : '';
  return (
    `Tiempo usado${time ? ` (dato de las ${time})` : ''}: ${format(weather.temperature)} °C${feels}` +
    ` · viento de ${format(weather.windSpeed)} km/h del ${compassPoint(weather.windDirection)}${gusts}.`
  );
}

/**
 * Why the recommended route (PBI-9.1) is what it is: the criterion, the reason, the weights the
 * backend applied (same icons and 0-100 scale as the route editor) and the weather it used. On small
 * screens it folds with the comparison and keeps only the criterion and the reason.
 */
export function RecommendationCard({ recommendation, isExpanded = true }) {
  if (!recommendation) return null;
  const { label, reason, weights, maxDetourPercentage, weather } = recommendation;
  const weighs = WEIGHT_FIELDS.some(({ key }) => weights[key] > 0);

  return (
    <section
      className={`panel-section recommendation-card ${isExpanded ? '' : 'is-collapsed'}`}
      aria-labelledby="recommendation-title"
    >
      <h2 id="recommendation-title">
        <ProfileIcon kind="recommended" />
        Recomendada: {label}
      </h2>
      <p className="recommendation-reason" role="status">
        {reason}
      </p>
      <div className="recommendation-details">
        <ul className="recommendation-weights" aria-label="Pesos aplicados">
          {WEIGHT_FIELDS.map(({ key, label: factor, icon }) => (
            <li key={key} className={`recommendation-weight recommendation-weight-${key}`}>
              <ProfileIcon kind={icon} />
              <span id={`recommendation-weight-${key}`}>{factor}</span>
              <meter
                min="0"
                max="100"
                value={weights[key]}
                aria-labelledby={`recommendation-weight-${key}`}
              />
              <span className="recommendation-weight-value">{weights[key]} %</span>
            </li>
          ))}
          <li className="recommendation-weight recommendation-weight-time">
            <ProfileIcon kind="time" />
            <span>Tiempo extra máximo</span>
            <span className="recommendation-weight-value">
              {weighs ? `+${maxDetourPercentage} %` : 'Sin rodeo'}
            </span>
          </li>
        </ul>
        <p className="recommendation-weather">{weatherSummary(weather)}</p>
        {weather && <p className="recommendation-attribution">Datos del tiempo: Open-Meteo.</p>}
      </div>
    </section>
  );
}
