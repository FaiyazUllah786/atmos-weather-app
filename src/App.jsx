import { useEffect, useMemo, useState } from "react"
import WeatherScene from "./components/WeatherScene.jsx"
import WeatherPlayground from "./components/WeatherPlayground.jsx"
import WeatherAlerts from "./components/WeatherAlerts.jsx"
import InteractiveMap from "./components/InteractiveMap.jsx"
import { Button, Icon } from "./components/ui.jsx"
import {
  createPreviewWeather,
  defaultConditionId,
  weatherConditionMap,
} from "./data/weatherConditions.js"
import {
  getApiKey,
  getComprehensiveWeather,
  hasApiKey,
  saveCustomApiKey,
  searchLocations,
} from "./services/weatherService.js"

const defaultCities = [
  {
    city: "San Francisco",
    country: "United States",
    lat: 37.7749,
    lon: -122.4194,
    temp: 22,
    condition: "Partly cloudy",
    conditionId: "partly-cloudy",
    time: "10:42 AM",
    color: "gold",
  },
  {
    city: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
    temp: 16,
    condition: "Light rain",
    conditionId: "light-rain",
    time: "6:42 PM",
    color: "blue",
  },
  {
    city: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    temp: 14,
    condition: "Clear night",
    conditionId: "clear-night",
    time: "2:42 AM",
    color: "violet",
  },
  {
    city: "Sydney",
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
    temp: 25,
    condition: "Clear sky",
    conditionId: "clear-day",
    time: "3:42 AM",
    color: "cyan",
  },
]

function Header({ dark, setDark, onSearch, onSettings, city }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <span />
          <span />
          <span />
        </div>
        <strong>Atmos</strong>
      </div>
      <Button className="search-trigger" onClick={onSearch}>
        <Icon name="search" />
        <span>Search cities worldwide</span>
        <kbd>⌘ K</kbd>
      </Button>
      <div className="header-actions">
        <Button className="location-pill" onClick={onSearch}>
          <Icon name="location" size={17} />
          <span>{city.city}</span>
        </Button>
        <Button
          className="icon-button theme-toggle"
          onClick={() => setDark(!dark)}
          label="Toggle color theme"
        >
          <Icon name={dark ? "sun" : "moon"} />
        </Button>
        <Button className="avatar" onClick={onSettings} label="Open settings">
          AM
        </Button>
      </div>
    </header>
  )
}

function Sidebar({ view, setView, weather, mode, hasKey }) {
  const links = [
    ["dashboard", "home", "Weather"],
    ["map", "map", "Weather map"],
    ["locations", "heart", "Locations"],
    ["settings", "settings", "Settings"],
  ]
  const alerts = weather.alerts || []
  return (
    <aside className="sidebar">
      <nav>
        {links.map(([id, icon, label]) => (
          <Button
            key={id}
            className={`nav-link ${view === id ? "active" : ""}`}
            onClick={() => setView(id)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Button>
        ))}
      </nav>
      <div className={`sidebar-weather ${alerts.length ? "warning" : ""}`}>
        <div>
          <Icon name={alerts.length ? "storm" : weather.icon} />
          <span>{alerts.length ? "Weather alert" : "Conditions"}</span>
        </div>
        <strong>{alerts[0] || weather.label}</strong>
        <small>{weather.description}</small>
      </div>
      <div className="sidebar-foot">
        <span>Weather data</span>
        <strong>
          {mode === "preview"
            ? "Simulated preview"
            : hasKey
              ? "OpenWeatherMap Live"
              : "Demo mode"}
        </strong>
      </div>
    </aside>
  )
}

function Hourly({ unit, hourly, weather }) {
  const convert = (n) => (unit === "C" ? n : Math.round((n * 9) / 5 + 32))
  const items = hourly && hourly.length ? hourly : []

  return (
    <section className="glass-panel hourly-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Forecast</span>
          <h2>Next 24 hours</h2>
        </div>
        <Button className="text-button" onClick={() => {}}>
          24h detail <Icon name="arrow" size={16} />
        </Button>
      </div>
      <div className="hourly-scroll">
        {items.map((slot, index) => {
          const miniIcon = slot.icon || weather.icon || "cloud"
          return (
            <div
              className={`hour-card ${
                index === 0 ? "active" : ""
              } condition-${weather.category?.toLowerCase() || "clear"}`}
              key={`${slot.time}-${index}`}
            >
              <span>{slot.time}</span>
              <div className={`weather-mini ${miniIcon}`}>
                <Icon name={miniIcon} size={24} />
              </div>
              <strong>{convert(slot.temp)}°</strong>
              <small>
                <Icon name="droplet" size={12} />
                {slot.rain}
              </small>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MetricCard({ icon, label, value, children, className = "" }) {
  return (
    <article className={`glass-panel metric-card ${className}`}>
      <div className="metric-label">
        <Icon name={icon} size={17} />
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      {children}
    </article>
  )
}

function Dashboard({
  unit,
  city,
  weather,
  hourly,
  daily,
  mode,
  animations,
  liveStatus,
  showAlerts,
  hasKey,
  onOpenSettings,
}) {
  const convert = (n) =>
    unit === "C" ? Math.round(n) : Math.round((n * 9) / 5 + 32)

  const temp = convert(weather.temperature)
  const feelsLike = convert(weather.feelsLike)
  const low = convert(weather.temperatureRange[0])
  const high = convert(weather.temperatureRange[1])
  const firstIcon = weather.icon === "moon-cloud" ? "moon" : weather.icon

  // Wind speed conversion
  const windDisplay =
    unit === "C"
      ? `${weather.windSpeed} km/h`
      : `${Math.round(weather.windSpeed * 0.621371)} mph`
  const gustDisplay =
    unit === "C"
      ? `${weather.windGust || Math.round(weather.windSpeed * 1.35)} km/h`
      : `${Math.round((weather.windGust || weather.windSpeed * 1.35) * 0.621371)} mph`

  // Visibility conversion
  const visDisplay =
    unit === "C"
      ? `${weather.visibility} km`
      : `${Math.round(weather.visibility * 0.621371 * 10) / 10} mi`

  // UV index position
  const uvValue = weather.uvIndex ?? 4
  const uvPercentage = Math.min(90, Math.max(5, (uvValue / 11) * 100))

  // AQI data
  const aqi = weather.aqi || {
    label: "1 · Good",
    description: "Air quality is satisfactory. Perfect for outdoor plans.",
    percentage: 18,
    components: { pm2_5: 8, pm10: 14, o3: 22 },
  }

  // Daylight / Night logic
  const isNight = weather.timeOfDay === "night"
  const sunProgress = weather.sunProgress ?? 50

  return (
    <div className="dashboard-view">
      {/* Missing API Key Guidance Banner */}
      {!hasKey && mode === "live" && (
        <div
          className="glass-panel"
          style={{
            padding: "12px 18px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(121, 225, 210, 0.08)",
            borderColor: "rgba(121, 225, 210, 0.25)",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon name="settings" size={18} />
            <span style={{ fontSize: "12px", color: "var(--text)" }}>
              Running in demo mode. Configure your{" "}
              <strong>OpenWeatherMap API Key</strong> to activate live feeds
              worldwide.
            </span>
          </div>
          <Button
            className="text-button"
            onClick={onOpenSettings}
            style={{ fontWeight: 700 }}
          >
            Configure Key →
          </Button>
        </div>
      )}

      {mode === "live" && liveStatus === "loading" && (
        <div className="data-state loading-state">
          <i />
          <span>Refreshing live OpenWeather conditions…</span>
        </div>
      )}
      {mode === "live" && liveStatus === "error" && (
        <div className="data-state error-state">
          <Icon name="cloud" size={17} />
          <span>Live feed unavailable. Displaying cached conditions.</span>
        </div>
      )}

      {showAlerts && <WeatherAlerts alerts={weather.alerts} mode={mode} />}

      <section className="hero glass-panel">
        <div className="hero-copy">
          <div className={`live-chip ${mode === "preview" ? "preview" : ""}`}>
            <i />{" "}
            {mode === "preview"
              ? "Simulated preview"
              : hasKey
                ? "Live OpenWeather"
                : "Demo weather"}
          </div>
          <p className="date">
            {weather.localDateString || "Today"} <span>•</span>{" "}
            {weather.localTime || city.time}
          </p>
          <div className="place">
            <Icon name="location" size={18} />
            <span>
              {city.city}, {city.country}
            </span>
          </div>
          <div className="temperature">
            {temp}
            <sup>°{unit}</sup>
          </div>
          <h1>{weather.label}</h1>
          <p className="summary">{weather.description}</p>
          <div className="hero-stats">
            <div>
              <span>Feels like</span>
              <strong>{feelsLike}°</strong>
            </div>
            <div>
              <span>High / Low</span>
              <strong>
                {high}° / {low}°
              </strong>
            </div>
            <div>
              <span>Chance of rain</span>
              <strong>{weather.precipitationProbability}%</strong>
            </div>
          </div>
        </div>
        <WeatherScene weather={weather} animations={animations} mode={mode} />
      </section>

      <Hourly unit={unit} hourly={hourly} weather={weather} />

      <section className="content-grid">
        <div className="forecast glass-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Extended forecast</span>
              <h2>5-day forecast</h2>
            </div>
            <Button className="round-button" label="Forecast info">
              <Icon name="chevron" />
            </Button>
          </div>
          <div className="day-list">
            {(daily || []).map((dayItem, index) => (
              <div className="day-row" key={`${dayItem.day}-${index}`}>
                <strong>{dayItem.day}</strong>
                <span className="day-condition">
                  <Icon
                    name={index === 0 ? firstIcon : dayItem.icon || "cloud"}
                    size={20}
                  />
                  {index === 0 ? weather.label : dayItem.condition}
                </span>
                <span className="low">
                  {index === 0 ? low : convert(dayItem.low)}°
                </span>
                <div className="temp-range">
                  <i style={{ width: `${dayItem.range}%` }} />
                </div>
                <span>{index === 0 ? high : convert(dayItem.high)}°</span>
              </div>
            ))}
          </div>
        </div>

        <div className="metrics-grid">
          <MetricCard
            icon="wind"
            label="Wind"
            value={windDisplay}
            className="wind-card"
          >
            <div
              className="compass"
              style={{
                "--wind-rotation": `${weather.windDeg ?? 245}deg`,
              }}
            >
              <span>N</span>
              <i />
              <b>{weather.windDirection || "WSW"}</b>
            </div>
            <p>Gusts up to {gustDisplay}</p>
          </MetricCard>

          <MetricCard
            icon="droplet"
            label="Humidity"
            value={`${weather.humidity}%`}
          >
            <div className="meter">
              <i style={{ width: `${weather.humidity}%` }} />
            </div>
            <p>
              {weather.humidity > 80
                ? "Very humid conditions"
                : weather.humidity > 40
                  ? "Comfortable humidity"
                  : "Dry air"}
            </p>
          </MetricCard>

          <MetricCard icon="sun" label="UV index" value={`${uvValue}`}>
            <div className="severity">
              <span>
                {uvValue > 6 ? "High" : uvValue > 2 ? "Moderate" : "Low"}
              </span>
              <div>
                <i style={{ marginLeft: `${uvPercentage}%` }} />
              </div>
            </div>
            <p>
              {uvValue > 5 ? "Sun protection recommended" : "Low exposure risk"}
            </p>
          </MetricCard>

          <MetricCard icon="eye" label="Visibility" value={visDisplay}>
            <div className="horizon">
              <i />
              <i />
              <i />
            </div>
            <p>
              {weather.visibility < 4
                ? "Significantly reduced visibility"
                : "Clear visibility"}
            </p>
          </MetricCard>
        </div>

        <section className="glass-panel sun-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {isNight ? "Moon cycle" : "Sun cycle"}
              </span>
              <h2>{isNight ? "Moonrise & moonset" : "Sunrise & sunset"}</h2>
            </div>
            <span className="daylight">
              {weather.daylightDuration || "12h daylight"}
            </span>
          </div>
          <div className="sun-path">
            <div className="arc">
              <i style={{ left: `${sunProgress}%` }} />
            </div>
            <div className="sun-times">
              <div>
                <span>Sunrise</span>
                <strong>{weather.sunrise || "6:30 AM"}</strong>
              </div>
              <div>
                <span>Sunset</span>
                <strong>{weather.sunset || "7:15 PM"}</strong>
              </div>
            </div>
          </div>
        </section>

        <MetricCard
          icon="air"
          label="Air quality"
          value={aqi.label}
          className="aqi-card"
        >
          <div className="aqi-scale">
            <i style={{ left: `${aqi.percentage || 18}%` }} />
          </div>
          <p>{aqi.description}</p>
          <div className="pollutants">
            <span>
              PM2.5 <b>{aqi.components?.pm2_5 ?? 8}</b>
            </span>
            <span>
              PM10 <b>{aqi.components?.pm10 ?? 14}</b>
            </span>
            <span>
              O₃ <b>{aqi.components?.o3 ?? 22}</b>
            </span>
          </div>
        </MetricCard>
      </section>
    </div>
  )
}

function LocationsView({
  savedCities,
  onSelectCity,
  onRemoveCity,
  onOpenSearch,
  unit,
}) {
  const convert = (n) =>
    unit === "C" ? Math.round(n) : Math.round((n * 9) / 5 + 32)

  return (
    <div className="page-view">
      <div className="page-title">
        <div>
          <span className="eyebrow">Your world</span>
          <h1>Saved locations</h1>
          <p>Real-time conditions across the places that matter to you.</p>
        </div>
        <Button className="primary-button" onClick={onOpenSearch}>
          <span>+</span> Add location
        </Button>
      </div>
      <div className="location-grid">
        {savedCities.map((item, i) => (
          <div
            key={`${item.city}-${item.country}`}
            className={`location-card glass-panel ${item.color || "cyan"}`}
            onClick={() => onSelectCity(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectCity(item)
              }
            }}
          >
            <div className="location-top">
              <span>{i === 0 ? "Current location" : item.country}</span>
              <Button
                className="round-button"
                style={{ width: "32px", height: "32px" }}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveCity(item)
                }}
                label={`Remove ${item.city}`}
              >
                <Icon name="heart" size={16} />
              </Button>
            </div>
            <div className="location-weather">
              <div>
                <h2>{item.city}</h2>
                <p>{item.condition}</p>
              </div>
              <strong>{convert(item.temp)}°</strong>
            </div>
            <div className="location-bottom">
              <span>{item.time || "Local time"}</span>
              <span>
                H:{convert(item.temp + 3)}° L:{convert(item.temp - 4)}°
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsView({
  dark,
  setDark,
  unit,
  setUnit,
  showAlerts,
  setShowAlerts,
  reducedMotion,
  setReducedMotion,
  onKeyUpdated,
}) {
  const [apiKeyInput, setApiKeyInput] = useState(() => getApiKey() || "")
  const [keySavedMessage, setKeySavedMessage] = useState("")

  const handleSaveKey = () => {
    saveCustomApiKey(apiKeyInput.trim())
    setKeySavedMessage("API key saved! Refreshing live weather…")
    if (onKeyUpdated) onKeyUpdated()
    setTimeout(() => setKeySavedMessage(""), 3500)
  }

  const handleClearKey = () => {
    saveCustomApiKey("")
    setApiKeyInput("")
    setKeySavedMessage("Key cleared. Reverting to demo mode.")
    if (onKeyUpdated) onKeyUpdated()
    setTimeout(() => setKeySavedMessage(""), 3500)
  }

  const isConfigured = hasApiKey()

  return (
    <div className="page-view settings-view">
      <div className="page-title">
        <div>
          <span className="eyebrow">Preferences & Integration</span>
          <h1>Settings</h1>
          <p>Customize units, appearance, and OpenWeatherMap credentials.</p>
        </div>
      </div>
      <section className="glass-panel settings-panel">
        <div className="settings-section">
          <div>
            <h2>Temperature unit</h2>
            <p>Choose Celsius or Fahrenheit across all forecasts and cards.</p>
          </div>
          <div className="segmented">
            <Button
              className={unit === "C" ? "active" : ""}
              onClick={() => setUnit("C")}
            >
              Celsius <b>°C</b>
            </Button>
            <Button
              className={unit === "F" ? "active" : ""}
              onClick={() => setUnit("F")}
            >
              Fahrenheit <b>°F</b>
            </Button>
          </div>
        </div>

        <div className="settings-section">
          <div>
            <h2>Appearance</h2>
            <p>Switch between daylight and cinematic midnight themes.</p>
          </div>
          <div className="theme-cards">
            <Button
              className={!dark ? "active" : ""}
              onClick={() => setDark(false)}
            >
              <div className="theme-preview light-preview" />
              <span>Light</span>
            </Button>
            <Button
              className={dark ? "active" : ""}
              onClick={() => setDark(true)}
            >
              <div className="theme-preview dark-preview" />
              <span>Dark</span>
            </Button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <h2>Weather alerts</h2>
            <p>Surface severe meteorological advisories.</p>
          </div>
          <Button
            className={`switch ${showAlerts ? "active" : ""}`}
            onClick={() => setShowAlerts(!showAlerts)}
            label="Toggle weather alerts"
          >
            <i />
          </Button>
        </div>

        <div className="settings-row">
          <div>
            <h2>Reduced motion</h2>
            <p>Pause 3D atmospheric celestial motion and particle rain/snow.</p>
          </div>
          <Button
            className={`switch ${reducedMotion ? "active" : ""}`}
            onClick={() => setReducedMotion(!reducedMotion)}
            label="Toggle reduced motion"
          >
            <i />
          </Button>
        </div>

        {/* OpenWeatherMap API Key Integration Section */}
        <div className="settings-section" style={{ display: "block" }}>
          <div style={{ marginBottom: "16px" }}>
            <h2>OpenWeatherMap API Key</h2>
            <p>
              Connect your official OpenWeather API key. You can set it here or
              via <code>VITE_OPENWEATHER_API_KEY</code> in <code>.env</code>.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your OpenWeatherMap API Key"
              style={{
                flex: "1 1 280px",
                height: "44px",
                background: "rgba(127, 143, 167, 0.08)",
                border: "1px solid var(--border-strong)",
                borderRadius: "12px",
                padding: "0 14px",
                color: "var(--text)",
              }}
            />
            <Button className="primary-button" onClick={handleSaveKey}>
              Save Key
            </Button>
            {isConfigured && (
              <Button
                className="round-button"
                style={{ width: "44px", height: "44px" }}
                onClick={handleClearKey}
                label="Clear Key"
              >
                <Icon name="x" size={16} />
              </Button>
            )}
          </div>
          {keySavedMessage && (
            <p
              style={{
                color: "var(--accent)",
                fontSize: "12px",
                marginTop: "10px",
                fontWeight: 600,
              }}
            >
              ✓ {keySavedMessage}
            </p>
          )}
          <div
            style={{
              marginTop: "12px",
              fontSize: "11px",
              color: "var(--muted)",
            }}
          >
            Status:{" "}
            <strong
              style={{
                color: isConfigured ? "var(--accent)" : "var(--warm)",
              }}
            >
              {isConfigured ? "● Key Configured" : "○ Demo Mode Active"}
            </strong>
          </div>
        </div>
      </section>
    </div>
  )
}

function SearchOverlay({ close, setCity }) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [geoLocating, setGeoLocating] = useState(false)

  // Debounced geocoding search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchLocations(query)
        setSearchResults(results)
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 320)

    return () => clearTimeout(timer)
  }, [query])

  // Geolocation trigger
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCity({
          city: "My Location",
          country: "",
          lat: latitude,
          lon: longitude,
          temp: 20,
          condition: "Current",
          conditionId: "partly-cloudy",
        })
        setGeoLocating(false)
        close()
      },
      (err) => {
        console.warn("Geolocation denied or failed:", err)
        setGeoLocating(false)
        alert(
          "Could not access your location. Please check browser permissions.",
        )
      },
      { timeout: 8000 },
    )
  }

  const defaultList = defaultCities

  return (
    <div className="overlay" onMouseDown={close}>
      <div
        className="search-modal glass-panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-search">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, state or country worldwide…"
          />
          {query && (
            <Button onClick={() => setQuery("")} label="Clear query">
              <Icon name="x" size={16} />
            </Button>
          )}
          <Button onClick={close} label="Close search">
            <Icon name="x" />
          </Button>
        </div>

        <div
          style={{
            padding: "10px 8px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            className="text-button"
            onClick={handleCurrentLocation}
            disabled={geoLocating}
          >
            <Icon name="location" size={16} />
            <span>
              {geoLocating ? "Finding location…" : "Use current GPS location"}
            </span>
          </Button>
        </div>

        <div className="search-meta">
          <span>{query ? "Search results" : "Popular destinations"}</span>
          <small>
            {isSearching
              ? "Searching OpenWeather…"
              : query
                ? `${searchResults.length} places`
                : `${defaultList.length} places`}
          </small>
        </div>

        <div className="results">
          {query
            ? searchResults.map((item, idx) => (
                <Button
                  key={`${item.name}-${item.lat}-${item.lon}-${idx}`}
                  onClick={() => {
                    setCity({
                      city: item.name,
                      country:
                        item.country + (item.state ? `, ${item.state}` : ""),
                      lat: item.lat,
                      lon: item.lon,
                      temp: 20,
                      condition: "Live",
                      conditionId: "partly-cloudy",
                    })
                    close()
                  }}
                >
                  <div className="result-icon blue">
                    <Icon name="location" />
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {[item.state, item.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  <div className="result-temp">
                    <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                      {item.lat.toFixed(2)}°, {item.lon.toFixed(2)}°
                    </span>
                  </div>
                  <Icon name="chevron" />
                </Button>
              ))
            : defaultList.map((c) => (
                <Button
                  key={c.city}
                  onClick={() => {
                    setCity(c)
                    close()
                  }}
                >
                  <div className={`result-icon ${c.color || "blue"}`}>
                    <Icon
                      name={
                        c.condition?.includes("rain")
                          ? "rain"
                          : c.condition?.includes("night")
                            ? "moon"
                            : "sun"
                      }
                    />
                  </div>
                  <div>
                    <strong>{c.city}</strong>
                    <span>{c.country}</span>
                  </div>
                  <div className="result-temp">
                    <strong>{c.temp}°</strong>
                    <span>{c.condition}</span>
                  </div>
                  <Icon name="chevron" />
                </Button>
              ))}

          {query && !searchResults.length && !isSearching && (
            <div className="empty-state">
              <div>
                <Icon name="search" size={30} />
              </div>
              <h2>No places found</h2>
              <p>Check the spelling or try a nearby city or country name.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MobileNav({ view, setView }) {
  return (
    <nav className="mobile-nav">
      {[
        ["dashboard", "home", "Home"],
        ["map", "map", "Map"],
        ["locations", "heart", "Locations"],
        ["settings", "settings", "Settings"],
      ].map(([id, icon, text]) => (
        <Button
          key={id}
          className={view === id ? "active" : ""}
          onClick={() => setView(id)}
        >
          <Icon name={icon} />
          <span>{text}</span>
        </Button>
      ))}
    </nav>
  )
}

export default function App() {
  // Theme & Preferences State
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("atmos_theme")
    return saved !== null ? saved === "dark" : true
  })
  const [unit, setUnit] = useState(() => {
    return localStorage.getItem("atmos_unit") || "C"
  })
  const [showAlerts, setShowAlerts] = useState(() => {
    const saved = localStorage.getItem("atmos_alerts")
    return saved !== null ? saved === "true" : true
  })
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem("atmos_reduced_motion")
    return saved !== null ? saved === "true" : false
  })

  // Navigation & Search
  const [view, setView] = useState("dashboard")
  const [search, setSearch] = useState(false)

  // Selected City & Saved Locations
  const [city, setCity] = useState(defaultCities[0])
  const [savedCities, setSavedCities] = useState(() => {
    try {
      const stored = localStorage.getItem("atmos_saved_locations")
      return stored ? JSON.parse(stored) : defaultCities
    } catch (_) {
      return defaultCities
    }
  })

  // Weather & Playground State
  const [mode, setMode] = useState("live")
  const [selectedId, setSelectedId] = useState(defaultConditionId)
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const [liveStatus, setLiveStatus] = useState("loading")

  const [liveWeather, setLiveWeather] = useState(() => ({
    ...createPreviewWeather(weatherConditionMap[defaultConditionId], {
      temperature: 22,
      windSpeed: 14,
      intensity: 18,
    }),
    simulated: false,
  }))
  const [hourlyForecast, setHourlyForecast] = useState([])
  const [dailyForecast, setDailyForecast] = useState([])
  const [hasKey, setHasKey] = useState(() => hasApiKey())

  const [controls, setControls] = useState({
    temperature: 22,
    intensity: 18,
    windSpeed: 14,
    animations: true,
  })

  // Persist preferences
  useEffect(() => {
    localStorage.setItem("atmos_theme", dark ? "dark" : "light")
  }, [dark])

  useEffect(() => {
    localStorage.setItem("atmos_unit", unit)
  }, [unit])

  useEffect(() => {
    localStorage.setItem("atmos_alerts", showAlerts ? "true" : "false")
  }, [showAlerts])

  useEffect(() => {
    localStorage.setItem(
      "atmos_reduced_motion",
      reducedMotion ? "true" : "false",
    )
  }, [reducedMotion])

  useEffect(() => {
    localStorage.setItem("atmos_saved_locations", JSON.stringify(savedCities))
  }, [savedCities])

  // Centralized Weather Fetcher for selected city
  useEffect(() => {
    let active = true
    setLiveStatus("loading")

    getComprehensiveWeather(city)
      .then((data) => {
        if (!active) return
        setLiveWeather(data.weather)
        setHourlyForecast(data.hourly)
        setDailyForecast(data.daily)
        setHasKey(hasApiKey())
        setLiveStatus("ready")

        // Update city display information if API returned normalized name
        if (data.city && data.city.city) {
          setCity((prev) => ({
            ...prev,
            city: data.city.city,
            country: data.city.country || prev.country,
            temp: data.weather.temperature,
            condition: data.weather.label,
            conditionId: data.weather.id,
            time: data.weather.localTime || prev.time,
          }))
        }
      })
      .catch((err) => {
        console.error("Failed to load weather:", err)
        if (active) setLiveStatus("error")
      })

    return () => {
      active = false
    }
  }, [city.city, city.lat, city.lon])

  // Computed weather (live vs playground preview)
  const weather = useMemo(() => {
    if (mode === "live") return liveWeather
    return createPreviewWeather(weatherConditionMap[selectedId], controls)
  }, [mode, liveWeather, selectedId, controls])

  // Playground handlers
  const selectCondition = (id) => {
    const selected = weatherConditionMap[id]
    const defaultTemperature = Math.round(
      (selected.temperatureRange[0] + selected.temperatureRange[1]) / 2,
    )
    setSelectedId(id)
    setControls((current) => ({
      ...current,
      temperature: defaultTemperature,
      intensity: selected.particleIntensity,
      windSpeed: selected.windSpeed,
    }))
    setMode("preview")
    setView("dashboard")
  }

  const resetPreview = () => {
    const selected = weatherConditionMap[defaultConditionId]
    setSelectedId(defaultConditionId)
    setControls({
      temperature: 22,
      intensity: selected.particleIntensity,
      windSpeed: selected.windSpeed,
      animations: true,
    })
  }

  const updateControl = (key, value) => {
    setControls((current) => ({ ...current, [key]: value }))
    if (key !== "animations") setMode("preview")
  }

  // City selection & Saved Locations handlers
  const handleSelectCity = (nextCity) => {
    setCity(nextCity)
    setMode("live")
    setView("dashboard")
  }

  const handleRemoveSavedCity = (targetCity) => {
    setSavedCities((prev) => prev.filter((c) => c.city !== targetCity.city))
  }

  const handleAddCityToSaved = (newCity) => {
    setSavedCities((prev) => {
      const exists = prev.some(
        (c) => c.city.toLowerCase() === newCity.city.toLowerCase(),
      )
      if (exists) return prev
      return [...prev, newCity]
    })
  }

  // Key updated handler
  const handleKeyUpdated = () => {
    setHasKey(hasApiKey())
    // Trigger refetch by updating city slightly
    setCity((c) => ({ ...c }))
  }

  // Keyboard shortcut for search (⌘ K / Ctrl + K)
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearch(true)
      }
      if (e.key === "Escape") setSearch(false)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])

  // Content switcher
  const content = useMemo(() => {
    if (view === "map") {
      return (
        <InteractiveMap
          city={city}
          weather={weather}
          unit={unit}
          dark={dark}
          onSelectCity={(newCity) => {
            handleSelectCity(newCity)
            handleAddCityToSaved(newCity)
          }}
          onGoToForecast={() => setView("dashboard")}
        />
      )
    }
    if (view === "locations") {
      return (
        <LocationsView
          savedCities={savedCities}
          onSelectCity={handleSelectCity}
          onRemoveCity={handleRemoveSavedCity}
          onOpenSearch={() => setSearch(true)}
          unit={unit}
        />
      )
    }
    if (view === "settings") {
      return (
        <SettingsView
          dark={dark}
          setDark={setDark}
          unit={unit}
          setUnit={setUnit}
          showAlerts={showAlerts}
          setShowAlerts={setShowAlerts}
          reducedMotion={reducedMotion}
          setReducedMotion={setReducedMotion}
          onKeyUpdated={handleKeyUpdated}
        />
      )
    }
    return (
      <Dashboard
        unit={unit}
        city={city}
        weather={weather}
        hourly={hourlyForecast}
        daily={dailyForecast}
        mode={mode}
        animations={controls.animations && !reducedMotion}
        liveStatus={liveStatus}
        showAlerts={showAlerts}
        hasKey={hasKey}
        onOpenSettings={() => setView("settings")}
      />
    )
  }, [
    view,
    dark,
    unit,
    city,
    weather,
    hourlyForecast,
    dailyForecast,
    mode,
    controls.animations,
    reducedMotion,
    liveStatus,
    showAlerts,
    hasKey,
    savedCities,
  ])

  return (
    <div
      className={`app ${dark ? "dark" : "light"} atmosphere-${
        weather.backgroundTheme || "sunny"
      } ${controls.animations && !reducedMotion ? "" : "animations-paused"}`}
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Header
        dark={dark}
        setDark={setDark}
        onSearch={() => setSearch(true)}
        onSettings={() => setView("settings")}
        city={city}
      />
      <Sidebar
        view={view}
        setView={setView}
        weather={weather}
        mode={mode}
        hasKey={hasKey}
      />
      <main>{content}</main>
      <MobileNav view={view} setView={setView} />
      {search && (
        <SearchOverlay
          close={() => setSearch(false)}
          setCity={(chosen) => {
            handleSelectCity(chosen)
            handleAddCityToSaved(chosen)
          }}
        />
      )}
      <WeatherPlayground
        open={playgroundOpen}
        setOpen={setPlaygroundOpen}
        selectedId={selectedId}
        onSelect={selectCondition}
        onReturnLive={() => setMode("live")}
        controls={controls}
        onControl={updateControl}
        onReset={resetPreview}
        mode={mode}
      />
    </div>
  )
}
