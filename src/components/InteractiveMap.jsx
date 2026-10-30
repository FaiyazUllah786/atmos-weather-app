import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button, Icon } from "./ui.jsx"
import {
  getApiKey,
  getComprehensiveWeather,
  reverseGeocode,
} from "../services/weatherService.js"

export default function InteractiveMap({
  city,
  weather,
  unit,
  dark,
  onSelectCity,
  onGoToForecast,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const baseTileLayerRef = useRef(null)
  const markerRef = useRef(null)
  const overlayLayerRef = useRef(null)
  const isMountedRef = useRef(true)

  const [activeLayer, setActiveLayer] = useState("Temperature")
  const [mapLocation, setMapLocation] = useState({
    city: city.city,
    country: city.country,
    lat: city.lat ?? 37.7749,
    lon: city.lon ?? -122.4194,
    temp: weather.temperature,
    condition: weather.label,
    icon: weather.icon === "moon-cloud" ? "moon" : weather.icon,
    rain: `${weather.precipitationProbability}%`,
    wind: `${weather.windSpeed} km/h`,
    humidity: `${weather.humidity}%`,
  })
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [overlayStatus, setOverlayStatus] = useState("idle")
  const [overlayErrorMessage, setOverlayErrorMessage] = useState("")

  const apiKey = getApiKey()
  const lat = city.lat ?? 37.7749
  const lon = city.lon ?? -122.4194

  const convertTemp = (c) =>
    unit === "C" ? Math.round(c) : Math.round((c * 9) / 5 + 32)

  const formatWind = (speedKmh) => {
    if (unit === "C") return `${speedKmh} km/h`
    return `${Math.round(speedKmh * 0.621371)} mph`
  }

  // Create custom Leaflet marker icon
  const createPinIcon = (tempValue) => {
    return L.divIcon({
      className: "custom-map-pin-container",
      html: `
        <div class="map-pin leaflet-interactive-pin">
          <div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
              <circle cx="12" cy="10" r="2.5"/>
            </svg>
            <strong>${convertTemp(tempValue)}°</strong>
          </div>
          <span></span>
        </div>
      `,
      iconSize: [58, 58],
      iconAnchor: [29, 58],
    })
  }

  // 1. Initialize Map Once
  useEffect(() => {
    isMountedRef.current = true
    if (!mapContainerRef.current) return

    // Clean up if instance already exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 10,
      zoomControl: false,
      attributionControl: true,
    })
    mapInstanceRef.current = map

    // OpenStreetMap standard tile provider with custom theme styling
    const baseTileLayer = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        className: dark
          ? "leaflet-dark-base-tiles"
          : "leaflet-light-base-tiles",
      },
    )
    baseTileLayer.addTo(map)
    baseTileLayerRef.current = baseTileLayer

    // Custom Marker Pin
    const marker = L.marker([lat, lon], {
      icon: createPinIcon(weather.temperature),
    }).addTo(map)
    markerRef.current = marker

    // Map Click Handler: Inspect conditions at clicked coordinates
    map.on("click", async (e) => {
      const clickLat = Math.round(e.latlng.lat * 10000) / 10000
      const clickLon = Math.round(e.latlng.lng * 10000) / 10000

      marker.setLatLng([clickLat, clickLon])
      if (isMountedRef.current) setLoadingLocation(true)

      try {
        const rev = await reverseGeocode(clickLat, clickLon)
        const pointWeather = await getComprehensiveWeather({
          lat: clickLat,
          lon: clickLon,
          city: rev?.name || `${clickLat}, ${clickLon}`,
          country: rev?.country || "",
        })

        if (!isMountedRef.current) return

        const w = pointWeather.weather
        const c = pointWeather.city

        setMapLocation({
          city: c.city || rev?.name || "Selected point",
          country: c.country || rev?.country || "Earth",
          lat: clickLat,
          lon: clickLon,
          temp: w.temperature,
          condition: w.label,
          icon: w.icon === "moon-cloud" ? "moon" : w.icon,
          rain: `${w.precipitationProbability}%`,
          wind: formatWind(w.windSpeed),
          humidity: `${w.humidity}%`,
        })

        // Update marker temperature
        marker.setIcon(createPinIcon(w.temperature))
      } catch (err) {
        console.warn("Could not inspect map point:", err)
      } finally {
        if (isMountedRef.current) setLoadingLocation(false)
      }
    })

    // Auto-fit observer
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(mapContainerRef.current)

    // Ensure map computes container bounds after mount
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      isMountedRef.current = false
      clearTimeout(timer)
      resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 2. Update Base Map Theme without destroying map instance
  useEffect(() => {
    if (!baseTileLayerRef.current) return
    const container = baseTileLayerRef.current.getContainer()
    if (container) {
      if (dark) {
        container.classList.add("leaflet-dark-base-tiles")
        container.classList.remove("leaflet-light-base-tiles")
      } else {
        container.classList.remove("leaflet-dark-base-tiles")
        container.classList.add("leaflet-light-base-tiles")
      }
    }
  }, [dark])

  // 3. Update map center and marker when city or unit changes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([lat, lon], 10, { duration: 1.2 })

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon])
      markerRef.current.setIcon(createPinIcon(weather.temperature))
    }

    setMapLocation({
      city: city.city,
      country: city.country,
      lat,
      lon,
      temp: weather.temperature,
      condition: weather.label,
      icon: weather.icon === "moon-cloud" ? "moon" : weather.icon,
      rain: `${weather.precipitationProbability}%`,
      wind: formatWind(weather.windSpeed),
      humidity: `${weather.humidity}%`,
    })
  }, [
    city.city,
    city.country,
    lat,
    lon,
    weather.temperature,
    weather.label,
    weather.windSpeed,
    weather.humidity,
    weather.precipitationProbability,
    unit,
  ])

  // 4. Update Weather Overlay Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Remove existing overlay cleanly
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current)
      overlayLayerRef.current = null
    }

    setOverlayErrorMessage("")

    if (!apiKey) {
      setOverlayStatus("no_key")
      return
    }

    const layerMap = {
      Temperature: "temp_new",
      Precipitation: "precipitation_new",
      Wind: "wind_new",
      Clouds: "clouds_new",
    }
    const owmLayerCode = layerMap[activeLayer] || "temp_new"
    const tileUrl = `https://tile.openweathermap.org/map/${owmLayerCode}/{z}/{x}/{y}.png?appid=${apiKey}`

    setOverlayStatus("loading")

    let successfulTiles = 0
    let failedTiles = 0

    const tileLayer = L.tileLayer(tileUrl, {
      opacity: 0.72,
      maxZoom: 19,
      zIndex: 400,
    })

    tileLayer.on("tileload", () => {
      successfulTiles++
      if (isMountedRef.current) {
        setOverlayStatus("active")
        setOverlayErrorMessage("")
      }
    })

    tileLayer.on("tileerror", () => {
      failedTiles++
      // If no tiles succeeded and multiple failed, surface the error
      if (successfulTiles === 0 && failedTiles >= 2 && isMountedRef.current) {
        setOverlayStatus("error")
        setOverlayErrorMessage(
          "OpenWeatherMap weather overlay unauthorized (HTTP 401). Please check your API key subscription or activation status.",
        )
      }
    })

    tileLayer.on("load", () => {
      if (!isMountedRef.current) return
      if (successfulTiles > 0) {
        setOverlayStatus("active")
      } else if (failedTiles > 0) {
        setOverlayStatus("error")
        setOverlayErrorMessage(
          "OpenWeatherMap weather overlay unauthorized (HTTP 401). Please check your API key subscription or activation status.",
        )
      }
    })

    tileLayer.addTo(map)
    overlayLayerRef.current = tileLayer
  }, [activeLayer, apiKey])

  // Map Controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut()
  }

  const handleRecenter = () => {
    mapInstanceRef.current?.flyTo([lat, lon], 10, { duration: 1 })
  }

  // Legend configuration based on active layer
  const getLegendConfig = () => {
    switch (activeLayer) {
      case "Temperature":
        return {
          min: unit === "C" ? "-15°C" : "5°F",
          max: unit === "C" ? "38°C" : "100°F",
          gradient:
            "linear-gradient(90deg, #3978be, #55bdba, #efb647, #e05244)",
        }
      case "Precipitation":
        return {
          min: "0 mm/h",
          max: "40 mm/h",
          gradient: "linear-gradient(90deg, #5ec3e8, #3b7ac4, #6a44bd)",
        }
      case "Wind":
        return {
          min: unit === "C" ? "0 km/h" : "0 mph",
          max: unit === "C" ? "90 km/h" : "55 mph",
          gradient:
            "linear-gradient(90deg, #55bdba, #83d475, #efb647, #d44d4d)",
        }
      case "Clouds":
        return {
          min: "0%",
          max: "100%",
          gradient:
            "linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.45), rgba(255,255,255,0.9))",
        }
      default:
        return {
          min: "0",
          max: "100",
          gradient: "linear-gradient(90deg, #3978be, #55bdba, #efb647)",
        }
    }
  }
  const legend = getLegendConfig()

  return (
    <div className="page-view">
      <div className="page-title">
        <div>
          <span className="eyebrow">Interactive radar & satellites</span>
          <h1>Weather map</h1>
          <p>
            Explore live atmospheric conditions across {city.city} and around
            the world.
          </p>
        </div>
        <span className="status-chip">
          <i />
          {apiKey && overlayStatus === "active"
            ? `${activeLayer} radar active`
            : apiKey && overlayStatus === "loading"
              ? "Loading radar…"
              : apiKey && overlayStatus === "error"
                ? "Radar authorization error"
                : "Base map active"}
        </span>
      </div>

      <div className="map-layout">
        <section className="glass-panel map-card">
          <div className="map-canvas" style={{ position: "relative" }}>
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "19px",
                overflow: "hidden",
                zIndex: 1,
              }}
            />

            {/* Real Status and Error Overlays */}
            {overlayStatus === "error" && (
              <div className="map-overlay-banner error">
                <Icon name="cloud" size={16} />
                <span>{overlayErrorMessage}</span>
              </div>
            )}

            {overlayStatus === "no_key" && (
              <div className="map-overlay-banner info">
                <Icon name="cloud" size={16} />
                <span>
                  Base map active · Configure OpenWeatherMap API key in Settings
                  to activate live weather overlays
                </span>
              </div>
            )}

            {overlayStatus === "loading" && (
              <div className="map-overlay-banner loading">
                <span className="spinner" />
                <span>Loading live {activeLayer} overlay…</span>
              </div>
            )}

            <div className="map-controls" style={{ zIndex: 10 }}>
              <Button onClick={handleZoomIn} label="Zoom in">
                +
              </Button>
              <Button onClick={handleZoomOut} label="Zoom out">
                −
              </Button>
              <Button onClick={handleRecenter} label="Recenter on current city">
                <Icon name="location" size={18} />
              </Button>
            </div>

            <div className="map-legend" style={{ zIndex: 10 }}>
              <span>{legend.min}</span>
              <i style={{ background: legend.gradient }} />
              <span>{legend.max}</span>
            </div>
          </div>

          <div className="layer-tabs">
            {["Temperature", "Precipitation", "Wind", "Clouds"].map(
              (layerName) => (
                <Button
                  key={layerName}
                  className={activeLayer === layerName ? "active" : ""}
                  onClick={() => setActiveLayer(layerName)}
                >
                  {layerName}
                </Button>
              ),
            )}
          </div>
        </section>

        <aside className="glass-panel map-summary">
          <span className="eyebrow">
            {loadingLocation ? "Inspecting coordinates…" : "Selected location"}
          </span>
          <div className="place-title">
            <div>
              <h2>{mapLocation.city}</h2>
              <p>{mapLocation.country}</p>
            </div>
            <Icon name={mapLocation.icon} size={32} />
          </div>

          <strong className="map-temp">{convertTemp(mapLocation.temp)}°</strong>
          <p>{mapLocation.condition}</p>

          <div className="map-facts">
            <span>
              <b>{mapLocation.rain}</b> Rain chance
            </span>
            <span>
              <b>{mapLocation.wind}</b> Wind speed
            </span>
            <span>
              <b>{mapLocation.humidity}</b> Humidity
            </span>
          </div>

          <Button
            className="primary-button"
            onClick={() => {
              if (onSelectCity) {
                onSelectCity({
                  city: mapLocation.city,
                  country: mapLocation.country,
                  lat: mapLocation.lat,
                  lon: mapLocation.lon,
                  temp: mapLocation.temp,
                  condition: mapLocation.condition,
                  conditionId: weather.id,
                })
              }
              if (onGoToForecast) {
                onGoToForecast()
              }
            }}
          >
            View full forecast <Icon name="arrow" />
          </Button>
        </aside>
      </div>
    </div>
  )
}
