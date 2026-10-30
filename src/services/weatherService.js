import {
  createPreviewWeather,
  weatherConditionMap,
  weatherConditions,
} from "../data/weatherConditions.js"

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes cache
const cache = new Map()
const inflightRequests = new Map()

/**
 * OpenWeatherMap Condition Code Mapping
 * Maps standard OWM weather condition codes (2xx, 3xx, 5xx, 6xx, 7xx, 800, 80x)
 * to one of the 23 rich atmospheric conditions defined in weatherConditions.js
 */
export function mapOwmCodeToConditionId(code, icon = "", isDay = true) {
  const iconIsNight = icon.includes("n")
  const day = !iconIsNight && isDay

  // Thunderstorm group (2xx)
  if (code >= 200 && code < 300) {
    if ([201, 202, 212, 232].includes(code)) {
      return "thunderstorm-heavy-rain"
    }
    return "thunderstorm"
  }

  // Drizzle group (3xx)
  if (code >= 300 && code < 400) {
    return "drizzle"
  }

  // Rain group (5xx)
  if (code >= 500 && code < 600) {
    if (code === 511) return "sleet" // Freezing rain
    if (code >= 502 && code <= 504) return "heavy-rain"
    return day ? "light-rain" : "rainy-night"
  }

  // Snow group (6xx)
  if (code >= 600 && code < 700) {
    if (code === 602 || code === 622) {
      return day ? "heavy-snow" : "snowy-night"
    }
    if ([611, 612, 613, 615, 616].includes(code)) {
      return "sleet"
    }
    return day ? "snow" : "snowy-night"
  }

  // Atmosphere group (7xx)
  if (code >= 700 && code < 800) {
    if (code === 701 || code === 741) return "fog"
    if (code === 711 || code === 721 || code === 762) return "haze"
    if ([731, 751, 761].includes(code)) return "dust-storm"
    if (code === 771 || code === 781) return "windy"
    return "fog"
  }

  // Clear group (800)
  if (code === 800) {
    return day ? "clear-day" : "clear-night"
  }

  // Clouds group (80x)
  if (code === 801) {
    return day ? "mostly-sunny" : "partly-cloudy-night"
  }
  if (code === 802) {
    return day ? "partly-cloudy" : "partly-cloudy-night"
  }
  if (code === 803) {
    return day ? "cloudy" : "cloudy-night"
  }
  if (code === 804) {
    return day ? "overcast" : "cloudy-night"
  }

  return day ? "partly-cloudy" : "partly-cloudy-night"
}

/**
 * Retrieve active API key: checks localStorage override first, then Vite env var.
 */
export function getApiKey() {
  const localKey =
    typeof window !== "undefined"
      ? localStorage.getItem("atmos_owm_api_key")
      : null
  if (localKey && localKey.trim()) {
    return localKey.trim()
  }
  const envKey = import.meta.env.VITE_OPENWEATHER_API_KEY
  if (envKey && envKey.trim() && envKey !== "your_openweather_api_key_here") {
    return envKey.trim()
  }
  return null
}

export function saveCustomApiKey(key) {
  if (typeof window !== "undefined") {
    if (key && key.trim()) {
      localStorage.setItem("atmos_owm_api_key", key.trim())
    } else {
      localStorage.removeItem("atmos_owm_api_key")
    }
    cache.clear()
  }
}

export function hasApiKey() {
  return Boolean(getApiKey())
}

/**
 * Helper to fetch with caching and request deduplication
 */
async function cachedFetch(url) {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  if (inflightRequests.has(url)) {
    return inflightRequests.get(url)
  }

  const promise = fetch(url).then(async (res) => {
    if (!res.ok) {
      const err = new Error(`OWM API error: ${res.status} ${res.statusText}`)
      err.status = res.status
      try {
        const body = await res.json()
        err.message = body.message || err.message
      } catch (_) {}
      throw err
    }
    return res.json()
  })

  inflightRequests.set(url, promise)

  try {
    const data = await promise
    cache.set(url, { timestamp: Date.now(), data })
    return data
  } finally {
    inflightRequests.delete(url)
  }
}

/**
 * Degrees to Compass Direction String
 */
export function degToCompass(deg) {
  if (deg === undefined || deg === null) return "N"
  const val = Math.floor(deg / 22.5 + 0.5)
  const arr = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  return arr[val % 16]
}

/**
 * Format timestamp given UTC offset in seconds
 */
export function formatLocalTime(timestampSec, timezoneOffsetSec) {
  const targetUtcMs = (timestampSec + timezoneOffsetSec) * 1000
  const date = new Date(targetUtcMs)

  const hours24 = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const hours12 = hours24 % 12 || 12
  const ampm = hours24 >= 12 ? "PM" : "AM"
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayName = daysOfWeek[date.getUTCDay()]
  const monthName = months[date.getUTCMonth()]
  const dayOfMonth = date.getUTCDate()

  return {
    time: `${hours12}:${formattedMinutes} ${ampm}`,
    hours: hours24,
    minutes,
    dateString: `${dayName}, ${dayOfMonth} ${monthName}`,
    dayName,
  }
}

/**
 * Convert AQI number (1 to 5) to descriptive labels
 */
export function interpretAqi(aqiValue) {
  const scale = {
    1: {
      label: "1 · Good",
      text: "Air quality is satisfactory. Perfect for outdoor plans.",
      pct: 15,
    },
    2: {
      label: "2 · Fair",
      text: "Air quality is acceptable for most individuals.",
      pct: 38,
    },
    3: {
      label: "3 · Moderate",
      text: "Sensitive groups may experience minor irritations.",
      pct: 60,
    },
    4: {
      label: "4 · Poor",
      text: "Air pollution is elevated. Limit prolonged exertion.",
      pct: 82,
    },
    5: {
      label: "5 · Very Poor",
      text: "Health alert: severe air quality degradation.",
      pct: 98,
    },
  }
  return scale[aqiValue] || scale[1]
}

/**
 * Generate meteorological advisory alerts based on conditions
 */
function deriveWeatherAlerts(current, baseAlerts = []) {
  const alerts = [...(baseAlerts || [])]
  const windKmh = (current.wind?.speed || 0) * 3.6
  const visibilityKm = (current.visibility || 10000) / 1000
  const temp = current.main?.temp ?? 20

  if (windKmh > 55 && !alerts.includes("Gale wind advisory")) {
    alerts.unshift("Gale wind advisory")
  } else if (windKmh > 40 && !alerts.includes("Strong wind advisory")) {
    alerts.unshift("Strong wind advisory")
  }

  if (visibilityKm < 1.5 && !alerts.includes("Dense fog warning")) {
    alerts.unshift("Dense fog warning")
  } else if (visibilityKm < 3 && !alerts.includes("Low visibility advisory")) {
    alerts.unshift("Low visibility advisory")
  }

  if (temp >= 38 && !alerts.includes("Extreme heat advisory")) {
    alerts.unshift("Extreme heat advisory")
  } else if (temp <= -10 && !alerts.includes("Extreme cold warning")) {
    alerts.unshift("Extreme cold warning")
  }

  return [...new Set(alerts)].slice(0, 2)
}

/**
 * Search locations using Geocoding API
 */
export async function searchLocations(query) {
  if (!query || query.trim().length === 0) return []
  const apiKey = getApiKey()
  if (!apiKey) {
    // Return filtered popular destinations
    const list = [
      {
        name: "San Francisco",
        state: "California",
        country: "US",
        lat: 37.7749,
        lon: -122.4194,
      },
      {
        name: "London",
        state: "England",
        country: "GB",
        lat: 51.5074,
        lon: -0.1278,
      },
      {
        name: "Tokyo",
        state: "Tokyo Prefecture",
        country: "JP",
        lat: 35.6762,
        lon: 139.6503,
      },
      {
        name: "Sydney",
        state: "New South Wales",
        country: "AU",
        lat: -33.8688,
        lon: 151.2093,
      },
      {
        name: "Paris",
        state: "Île-de-France",
        country: "FR",
        lat: 48.8566,
        lon: 2.3522,
      },
      {
        name: "New York",
        state: "New York",
        country: "US",
        lat: 40.7128,
        lon: -74.006,
      },
      {
        name: "Singapore",
        state: "Singapore",
        country: "SG",
        lat: 1.3521,
        lon: 103.8198,
      },
      {
        name: "Berlin",
        state: "Berlin",
        country: "DE",
        lat: 52.52,
        lon: 13.405,
      },
      {
        name: "Dubai",
        state: "Dubai",
        country: "AE",
        lat: 25.2048,
        lon: 55.2708,
      },
      {
        name: "Toronto",
        state: "Ontario",
        country: "CA",
        lat: 43.6532,
        lon: -79.3832,
      },
    ]
    return list.filter((item) =>
      `${item.name} ${item.state || ""} ${item.country}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
  }

  const endpoint = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    query,
  )}&limit=5&appid=${apiKey}`

  try {
    const results = await cachedFetch(endpoint)
    return (results || []).map((item) => ({
      name: item.name,
      state: item.state || "",
      country: item.country,
      lat: item.lat,
      lon: item.lon,
    }))
  } catch (error) {
    console.error("Geocoding search failed:", error)
    return []
  }
}

/**
 * Reverse geocode latitude and longitude
 */
export async function reverseGeocode(lat, lon) {
  const apiKey = getApiKey()
  if (!apiKey) return null
  const endpoint = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
  try {
    const res = await cachedFetch(endpoint)
    if (res && res[0]) {
      return {
        name: res[0].name,
        state: res[0].state || "",
        country: res[0].country,
        lat,
        lon,
      }
    }
  } catch (err) {
    console.warn("Reverse geocode failed:", err)
  }
  return null
}

/**
 * Fetch Current Weather Data from OWM
 */
export async function fetchCurrentWeather({ lat, lon, city }) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("No API key available")
  }
  let query = ""
  if (lat !== undefined && lon !== undefined) {
    query = `lat=${lat}&lon=${lon}`
  } else if (city) {
    query = `q=${encodeURIComponent(city)}`
  } else {
    query = `q=San Francisco`
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?${query}&units=metric&appid=${apiKey}`
  return cachedFetch(url)
}

/**
 * Fetch 5-day / 3-hour forecast from OWM
 */
export async function fetchForecast({ lat, lon, city }) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("No API key available")
  }
  let query = ""
  if (lat !== undefined && lon !== undefined) {
    query = `lat=${lat}&lon=${lon}`
  } else if (city) {
    query = `q=${encodeURIComponent(city)}`
  } else {
    query = `q=San Francisco`
  }
  const url = `https://api.openweathermap.org/data/2.5/forecast?${query}&units=metric&appid=${apiKey}`
  return cachedFetch(url)
}

/**
 * Fetch Air Pollution data from OWM
 */
export async function fetchAirPollution({ lat, lon }) {
  const apiKey = getApiKey()
  if (!apiKey || lat === undefined || lon === undefined) {
    return null
  }
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
  try {
    return await cachedFetch(url)
  } catch (err) {
    console.warn("Air pollution fetch failed:", err)
    return null
  }
}

/**
 * Process Raw OWM Forecast list into next-24h hourly and 5-day extended forecast
 */
function processForecastData(forecastList, timezoneOffsetSec, currentWeather) {
  if (!forecastList || !forecastList.length) {
    return { hourly: [], daily: [] }
  }

  // 1. Process Hourly (next 24 hours: 8 slots of 3 hours)
  const hourlySlots = forecastList.slice(0, 8).map((slot, index) => {
    const isFirst = index === 0
    const local = formatLocalTime(slot.dt, timezoneOffsetSec)
    const timeLabel = isFirst ? "Now" : local.time.replace(":00", "")
    const temp = Math.round(slot.main.temp)
    const iconCode = slot.weather[0]?.icon || "01d"
    const weatherId = slot.weather[0]?.id || 800
    const condId = mapOwmCodeToConditionId(
      weatherId,
      iconCode,
      !iconCode.includes("n"),
    )
    const condition =
      weatherConditionMap[condId] || weatherConditionMap["partly-cloudy"]
    const popPercent = Math.round((slot.pop || 0) * 100)

    let miniIcon = condition.icon
    if (miniIcon === "moon-cloud") miniIcon = "moon"

    return {
      time: timeLabel,
      temp,
      icon: miniIcon,
      rain: `${popPercent}%`,
      condId,
      fullTime: local.time,
    }
  })

  // 2. Process Daily Forecast (group remaining items by day)
  const daysMap = new Map()

  forecastList.forEach((slot) => {
    const local = formatLocalTime(slot.dt, timezoneOffsetSec)
    const dayKey = local.dayName
    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, {
        day: dayKey,
        date: local.dateString,
        temps: [],
        conditions: [],
        icons: [],
      })
    }
    const dayEntry = daysMap.get(dayKey)
    dayEntry.temps.push(slot.main.temp)
    const condId = mapOwmCodeToConditionId(
      slot.weather[0]?.id || 800,
      slot.weather[0]?.icon || "01d",
      true,
    )
    dayEntry.conditions.push(condId)
    dayEntry.icons.push(weatherConditionMap[condId]?.icon || "sun")
  })

  const dailyDays = Array.from(daysMap.values()).slice(0, 6)

  // Overall min and max across all days to calculate range percentage
  const allTemps = dailyDays.flatMap((d) => d.temps)
  const weekMin = Math.min(
    ...allTemps,
    currentWeather?.temperatureRange?.[0] ?? 15,
  )
  const weekMax = Math.max(
    ...allTemps,
    currentWeather?.temperatureRange?.[1] ?? 25,
  )
  const tempSpread = Math.max(1, weekMax - weekMin)

  const daily = dailyDays.map((d, index) => {
    const min = Math.round(Math.min(...d.temps))
    const max = Math.round(Math.max(...d.temps))
    const range = Math.min(
      100,
      Math.max(20, Math.round(((max - min) / tempSpread) * 100)),
    )

    // Select midday or most common condition
    const midIndex = Math.floor(d.conditions.length / 2)
    const condId = d.conditions[midIndex] || d.conditions[0]
    const condObj =
      weatherConditionMap[condId] || weatherConditionMap["partly-cloudy"]

    const isToday = index === 0
    return {
      day: isToday ? "Today" : d.day,
      condition: condObj.label,
      icon: condObj.icon === "moon-cloud" ? "moon" : condObj.icon,
      low: min,
      high: max,
      range,
    }
  })

  return { hourly: hourlySlots, daily }
}

/**
 * Build rich unified live weather data object from OWM API responses
 */
export function buildUnifiedWeatherData(
  currentData,
  forecastData,
  pollutionData,
) {
  const timezoneOffset = currentData.timezone || 0
  const dt = currentData.dt || Math.floor(Date.now() / 1000)
  const sys = currentData.sys || {}
  const weatherArr = currentData.weather || [{}]
  const primaryWeather = weatherArr[0]
  const weatherCode = primaryWeather.id || 800
  const icon = primaryWeather.icon || "01d"

  const sunrise = sys.sunrise || dt - 21600
  const sunset = sys.sunset || dt + 21600
  const isDay = dt >= sunrise && dt < sunset

  const conditionId = mapOwmCodeToConditionId(weatherCode, icon, isDay)
  const baseCondition =
    weatherConditionMap[conditionId] || weatherConditionMap["partly-cloudy"]

  const temp = Math.round(currentData.main.temp)
  const feelsLike = Math.round(currentData.main.feels_like)
  const minTemp = Math.round(currentData.main.temp_min)
  const maxTemp = Math.round(currentData.main.temp_max)

  const windSpeedKmh = Math.round((currentData.wind?.speed || 0) * 3.6)
  const windDeg = currentData.wind?.deg ?? 240
  const windDirection = degToCompass(windDeg)
  const windGustKmh = currentData.wind?.gust
    ? Math.round(currentData.wind.gust * 3.6)
    : Math.round(windSpeedKmh * 1.35)

  const humidity = currentData.main.humidity ?? 60
  const pressure = currentData.main.pressure ?? 1013
  const visibilityKm = Math.round((currentData.visibility || 10000) / 100) / 10
  const clouds = currentData.clouds?.all ?? 20

  // Rain or snow precipitation volume / probability
  let precipProb = 0
  let precipType = "none"
  if (currentData.rain) {
    precipType = "rain"
    precipProb = Math.min(
      100,
      Math.round((currentData.rain["1h"] || currentData.rain["3h"] || 1) * 30),
    )
  } else if (currentData.snow) {
    precipType = "snow"
    precipProb = Math.min(
      100,
      Math.round((currentData.snow["1h"] || currentData.snow["3h"] || 1) * 35),
    )
  } else if (baseCondition.precipitationType !== "none") {
    precipType = baseCondition.precipitationType
    precipProb = baseCondition.precipitationProbability
  }

  // Sunrise / sunset local times
  const sunriseLocal = formatLocalTime(sunrise, timezoneOffset)
  const sunsetLocal = formatLocalTime(sunset, timezoneOffset)
  const currentLocal = formatLocalTime(dt, timezoneOffset)

  // Daylight duration
  const daylightSec = Math.max(0, sunset - sunrise)
  const daylightHours = Math.floor(daylightSec / 3600)
  const daylightMins = Math.floor((daylightSec % 3600) / 60)
  const daylightDuration = `${daylightHours}h ${daylightMins}m daylight`

  // Sun position in arc (0 to 100%)
  let sunProgress = 50
  if (dt >= sunrise && dt <= sunset) {
    sunProgress = Math.min(
      100,
      Math.max(0, Math.round(((dt - sunrise) / daylightSec) * 100)),
    )
  } else if (dt > sunset) {
    sunProgress = 100
  } else {
    sunProgress = 0
  }

  // Air Quality
  let aqiInfo = {
    aqi: 1,
    label: "1 · Good",
    description: "Air quality is satisfactory. Perfect for outdoor plans.",
    percentage: 18,
    components: {
      pm2_5: 8,
      pm10: 14,
      o3: 22,
      no2: 12,
      so2: 4,
      co: 260,
    },
  }
  if (pollutionData && pollutionData.list && pollutionData.list[0]) {
    const p = pollutionData.list[0]
    const val = p.main?.aqi || 1
    const interpreted = interpretAqi(val)
    aqiInfo = {
      aqi: val,
      label: interpreted.label,
      description: interpreted.text,
      percentage: interpreted.pct,
      components: {
        pm2_5: Math.round(p.components?.pm2_5 ?? 10),
        pm10: Math.round(p.components?.pm10 ?? 18),
        o3: Math.round(p.components?.o3 ?? 24),
        no2: Math.round(p.components?.no2 ?? 15),
        so2: Math.round(p.components?.so2 ?? 5),
        co: Math.round(p.components?.co ?? 300),
      },
    }
  }

  // Capitalize condition description
  const rawDesc = primaryWeather.description || baseCondition.description
  const capitalizedDesc = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1)

  const derivedAlerts = deriveWeatherAlerts(currentData, baseCondition.alerts)

  const baseWeather = {
    ...baseCondition,
    temperature: temp,
    feelsLike,
    temperatureRange: [minTemp, maxTemp],
    windSpeed: windSpeedKmh,
    windDeg,
    windDirection,
    windGust: windGustKmh,
    humidity,
    pressure,
    visibility: visibilityKm,
    cloudiness: clouds,
    precipitationType: precipType,
    precipitationProbability: precipProb,
    particleIntensity:
      precipProb > 0 ? precipProb : baseCondition.particleIntensity,
    description: capitalizedDesc,
    alerts: derivedAlerts,
    sunrise: sunriseLocal.time,
    sunset: sunsetLocal.time,
    daylightDuration,
    sunProgress,
    timeOfDay: isDay ? "day" : "night",
    localTime: currentLocal.time,
    localDateString: currentLocal.dateString,
    timezoneOffset,
    aqi: aqiInfo,
    coordinates: {
      lat: currentData.coord?.lat,
      lon: currentData.coord?.lon,
    },
    simulated: false,
    isLive: true,
    updatedAt: new Date(),
  }

  // Process forecast if available
  const { hourly, daily } = processForecastData(
    forecastData?.list || [],
    timezoneOffset,
    baseWeather,
  )

  return {
    weather: baseWeather,
    hourly,
    daily,
    city: {
      city: currentData.name,
      country: sys.country || "",
      lat: currentData.coord?.lat,
      lon: currentData.coord?.lon,
      time: currentLocal.time,
      temp,
      condition: baseCondition.label,
      conditionId,
    },
  }
}

/**
 * High-fidelity fallback / demo weather generator when no API key is set
 */
export function generateDemoWeather(cityInfo) {
  const cityName = cityInfo.city || cityInfo.name || "San Francisco"
  const countryName = cityInfo.country || "United States"
  const condId = cityInfo.conditionId || "partly-cloudy"
  const base =
    weatherConditionMap[condId] || weatherConditionMap["partly-cloudy"]

  const temp = cityInfo.temp ?? 22
  const minTemp = temp - 5
  const maxTemp = temp + 4

  const mockHourly = [
    {
      time: "Now",
      temp: temp,
      icon: base.icon === "moon-cloud" ? "moon" : base.icon,
      rain: "0%",
    },
    { time: "11 AM", temp: temp + 1, icon: "sun", rain: "0%" },
    { time: "12 PM", temp: temp + 2, icon: "cloud", rain: "5%" },
    { time: "1 PM", temp: temp + 2, icon: "cloud", rain: "8%" },
    { time: "2 PM", temp: temp + 1, icon: "rain", rain: "20%" },
    { time: "3 PM", temp: temp, icon: "rain", rain: "30%" },
    { time: "4 PM", temp: temp - 1, icon: "cloud", rain: "15%" },
    { time: "5 PM", temp: temp - 2, icon: "sun", rain: "5%" },
    { time: "6 PM", temp: temp - 3, icon: "moon", rain: "0%" },
  ]

  const mockDaily = [
    {
      day: "Today",
      condition: base.label,
      icon: base.icon === "moon-cloud" ? "moon" : base.icon,
      low: minTemp,
      high: maxTemp,
      range: 68,
    },
    {
      day: "Tuesday",
      condition: "Light rain",
      icon: "rain",
      low: minTemp - 2,
      high: maxTemp - 1,
      range: 54,
    },
    {
      day: "Wednesday",
      condition: "Mostly sunny",
      icon: "sun",
      low: minTemp - 1,
      high: maxTemp + 1,
      range: 62,
    },
    {
      day: "Thursday",
      condition: "Cloudy",
      icon: "cloud",
      low: minTemp - 3,
      high: maxTemp - 2,
      range: 48,
    },
    {
      day: "Friday",
      condition: "Clear",
      icon: "sun",
      low: minTemp,
      high: maxTemp + 2,
      range: 70,
    },
    {
      day: "Saturday",
      condition: "Sunny",
      icon: "sun",
      low: minTemp + 1,
      high: maxTemp + 3,
      range: 75,
    },
    {
      day: "Sunday",
      condition: "Partly cloudy",
      icon: "cloud",
      low: minTemp,
      high: maxTemp + 1,
      range: 65,
    },
  ]

  const weather = {
    ...base,
    temperature: temp,
    feelsLike: temp - 1,
    temperatureRange: [minTemp, maxTemp],
    windSpeed: 16,
    windDeg: 245,
    windDirection: "WSW",
    windGust: 24,
    humidity: 64,
    pressure: 1014,
    visibility: 16,
    cloudiness: 35,
    precipitationType: "none",
    precipitationProbability: 12,
    particleIntensity: 18,
    sunrise: "6:48 AM",
    sunset: "7:12 PM",
    daylightDuration: "12h 24m daylight",
    sunProgress: 62,
    timeOfDay: "day",
    localTime: cityInfo.time || "10:42 AM",
    localDateString: "Monday, 16 September",
    aqi: {
      aqi: 1,
      label: "1 · Good",
      description: "Air quality is satisfactory. Perfect for outdoor plans.",
      percentage: 20,
      components: { pm2_5: 8, pm10: 14, o3: 22, no2: 12, so2: 4, co: 260 },
    },
    coordinates: {
      lat: cityInfo.lat || 37.7749,
      lon: cityInfo.lon || -122.4194,
    },
    simulated: false,
    isLive: false,
    updatedAt: new Date(),
  }

  return {
    weather,
    hourly: mockHourly,
    daily: mockDaily,
    city: {
      city: cityName,
      country: countryName,
      lat: cityInfo.lat || 37.7749,
      lon: cityInfo.lon || -122.4194,
      time: cityInfo.time || "10:42 AM",
      temp,
      condition: base.label,
      conditionId: condId,
    },
  }
}

/**
 * Fetch Comprehensive Weather for a Location
 */
export async function getComprehensiveWeather(location) {
  const apiKey = getApiKey()
  if (!apiKey) {
    return {
      ...generateDemoWeather(location),
      source: "demo",
      requiresApiKey: true,
    }
  }

  try {
    const lat = location.lat
    const lon = location.lon
    const city = location.city || location.name

    const [currentData, forecastData, pollutionData] = await Promise.all([
      fetchCurrentWeather({ lat, lon, city }),
      fetchForecast({ lat, lon, city }),
      lat !== undefined && lon !== undefined
        ? fetchAirPollution({ lat, lon }).catch(() => null)
        : Promise.resolve(null),
    ])

    const unified = buildUnifiedWeatherData(
      currentData,
      forecastData,
      pollutionData,
    )
    return {
      ...unified,
      source: "openweather",
      requiresApiKey: false,
    }
  } catch (err) {
    console.error(
      "OpenWeatherMap fetch failed, falling back to cached/demo:",
      err,
    )
    return {
      ...generateDemoWeather(location),
      source: "demo_fallback",
      error: err.message || "Failed to load live data",
      requiresApiKey: err.status === 401,
    }
  }
}

/**
 * Legacy getLiveWeather export for backward compatibility
 */
export async function getLiveWeather() {
  return getComprehensiveWeather({
    city: "San Francisco",
    country: "United States",
    lat: 37.7749,
    lon: -122.4194,
  })
}
