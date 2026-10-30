import { Icon } from "./ui.jsx"

export default function WeatherAlerts({ alerts, mode }) {
  if (!alerts?.length) return null
  return (
    <section className="weather-alerts" aria-label="Weather alerts">
      {alerts.map((alert) => (
        <div key={alert}>
          <span className="alert-icon">
            <Icon name="storm" size={18} />
          </span>
          <span>
            <small>
              {mode === "preview" ? "Preview advisory" : "Weather advisory"}
            </small>
            <strong>{alert}</strong>
          </span>
        </div>
      ))}
    </section>
  )
}
