import { useMemo, useState } from "react"
import { weatherConditions } from "../data/weatherConditions.js"
import { Button, Icon } from "./ui.jsx"

export default function WeatherPlayground({
  open,
  setOpen,
  selectedId,
  onSelect,
  onReturnLive,
  controls,
  onControl,
  onReset,
  mode,
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const categories = [
    "All",
    ...new Set(weatherConditions.map((item) => item.category)),
  ]
  const results = useMemo(
    () =>
      weatherConditions.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          item.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category],
  )

  return (
    <>
      <Button
        className={`playground-fab ${mode === "preview" ? "active" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Icon name="sun" size={18} />
        <span>Weather playground</span>
        {mode === "preview" && <i />}
      </Button>
      <aside
        className={`playground glass-panel ${open ? "open" : ""}`}
        aria-hidden={!open}
      >
        <div className="playground-head">
          <div>
            <span className="eyebrow">Preview mode</span>
            <h2>Weather playground</h2>
          </div>
          <Button
            className="round-button"
            onClick={() => setOpen(false)}
            label="Close weather playground"
          >
            <Icon name="x" />
          </Button>
        </div>
        <div className="mode-banner">
          <div>
            <i className={mode === "preview" ? "simulated" : ""} />
            <span>
              {mode === "preview" ? "Simulated weather" : "Live weather"}
            </span>
          </div>
          {mode === "preview" && (
            <Button onClick={onReturnLive}>Return to live</Button>
          )}
        </div>
        <label className="condition-search">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a weather condition"
          />
        </label>
        <div className="condition-categories">
          {categories.map((item) => (
            <Button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="condition-list">
          {results.map((item) => (
            <Button
              key={item.id}
              className={
                selectedId === item.id && mode === "preview" ? "active" : ""
              }
              onClick={() => onSelect(item.id)}
            >
              <span className={`condition-icon ${item.timeOfDay}`}>
                <Icon
                  name={item.icon === "moon-cloud" ? "moon" : item.icon}
                  size={19}
                />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>
                  {item.timeOfDay} · {item.category}
                </small>
              </span>
              {selectedId === item.id && mode === "preview" && (
                <i className="selected-dot" />
              )}
            </Button>
          ))}
        </div>
        <div className="playground-controls">
          <div className="control-title">
            <div>
              <span className="eyebrow">Simulation controls</span>
              <h3>Fine tune conditions</h3>
            </div>
            <Button onClick={onReset}>Reset</Button>
          </div>
          <label>
            <span>
              Temperature <b>{controls.temperature}°C</b>
            </span>
            <input
              type="range"
              min="-20"
              max="48"
              value={controls.temperature}
              onChange={(event) =>
                onControl("temperature", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>
              Precipitation intensity <b>{controls.intensity}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={controls.intensity}
              onChange={(event) =>
                onControl("intensity", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>
              Wind speed <b>{controls.windSpeed} km/h</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={controls.windSpeed}
              onChange={(event) =>
                onControl("windSpeed", Number(event.target.value))
              }
            />
          </label>
          <div className="animation-control">
            <span>
              <b>Scene animation</b>
              <small>Ambient motion and particles</small>
            </span>
            <Button
              className={`switch ${controls.animations ? "active" : ""}`}
              onClick={() => onControl("animations", !controls.animations)}
              label="Toggle weather animation"
            >
              <i />
            </Button>
          </div>
        </div>
      </aside>
      {open && (
        <Button
          className="playground-scrim"
          onClick={() => setOpen(false)}
          label="Close weather playground"
        />
      )}
    </>
  )
}
