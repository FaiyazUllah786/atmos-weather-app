import { Icon } from "./ui.jsx"

function Particles({ type, intensity }) {
  if (!type || type === "none" || type === "rays") return null
  const count = Math.max(5, Math.round(intensity / 5))
  return (
    <div className={`weather-particles particles-${type}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={{
            "--particle-index": index,
            "--particle-left": `${(index * 37) % 97}%`,
            "--particle-top": `${(index * 17) % 91}%`,
            "--particle-delay": `${-((index * 0.37) % 3)}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function WeatherScene({ weather, animations = true, mode }) {
  const isNight = weather.timeOfDay === "night"
  const cloudLevel = [
    "clouds",
    "dense-clouds",
    "rain",
    "heavy-rain",
    "drizzle",
    "lightning",
    "lightning-rain",
    "night-rain",
    "moon-clouds",
    "sleet",
    "hail",
  ].includes(weather.animationType)
  const denseClouds = [
    "dense-clouds",
    "heavy-rain",
    "lightning",
    "lightning-rain",
    "night-rain",
    "hail",
  ].includes(weather.animationType)
  const lightning = weather.animationType.includes("lightning")
  const snowing = weather.particleType === "snow"

  return (
    <div
      className={`weather-scene scene-${weather.backgroundTheme} ${
        isNight ? "is-night" : ""
      } ${denseClouds ? "is-dense" : ""} ${
        animations ? "" : "animations-paused"
      }`}
      aria-label={`Atmospheric illustration for ${weather.label}`}
    >
      <div className="scene-orbit orbit-one" />
      <div className="scene-orbit orbit-two" />
      {(weather.animationType.includes("sun") || isNight) && (
        <div className="celestial">
          {isNight ? (
            <Icon name="moon" size={74} />
          ) : (
            <>
              <div className="sun-rays" />
              <div className="sun-core" />
            </>
          )}
        </div>
      )}
      {isNight && (
        <div className="stars">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      )}
      {cloudLevel && (
        <div className="cloud cloud-back">
          <span />
          <span />
          <span />
        </div>
      )}
      {cloudLevel && (
        <div className="cloud cloud-front">
          <span />
          <span />
          <span />
        </div>
      )}
      {denseClouds && (
        <div className="cloud cloud-storm">
          <span />
          <span />
          <span />
        </div>
      )}
      {lightning && (
        <div className="lightning-bolt">
          <span />
          <span />
        </div>
      )}
      <Particles
        type={weather.particleType}
        intensity={weather.particleIntensity}
      />
      {["fog", "haze", "dust"].includes(weather.particleType) && (
        <div className={`atmosphere-layer ${weather.particleType}`}>
          <i />
          <i />
          <i />
        </div>
      )}
      <div className={`scene-ground ${snowing ? "frosted" : ""}`} />
      <div className="scene-shadow" />
      <div className="scene-label">
        <span>
          {mode === "preview" ? "Simulated preview" : "Live atmosphere"}
        </span>
        <strong>
          {weather.alerts?.length
            ? weather.alerts[0]
            : weather.precipitationType !== "none"
              ? `${weather.precipitationProbability}% precipitation`
              : `${weather.visibility} km visibility`}
        </strong>
      </div>
    </div>
  )
}
