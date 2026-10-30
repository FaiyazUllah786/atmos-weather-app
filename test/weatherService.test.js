import test from "node:test"
import assert from "node:assert/strict"
import {
  degToCompass,
  formatLocalTime,
  interpretAqi,
  mapOwmCodeToConditionId,
  buildUnifiedWeatherData,
  generateDemoWeather,
} from "../src/services/weatherService.js"

test("mapOwmCodeToConditionId maps standard OWM codes accurately", () => {
  // Thunderstorm
  assert.equal(mapOwmCodeToConditionId(200, "11d", true), "thunderstorm")
  assert.equal(
    mapOwmCodeToConditionId(202, "11d", true),
    "thunderstorm-heavy-rain",
  )

  // Drizzle
  assert.equal(mapOwmCodeToConditionId(300, "09d", true), "drizzle")

  // Rain
  assert.equal(mapOwmCodeToConditionId(500, "10d", true), "light-rain")
  assert.equal(mapOwmCodeToConditionId(500, "10n", false), "rainy-night")
  assert.equal(mapOwmCodeToConditionId(502, "10d", true), "heavy-rain")
  assert.equal(mapOwmCodeToConditionId(511, "13d", true), "sleet") // Freezing rain

  // Snow
  assert.equal(mapOwmCodeToConditionId(600, "13d", true), "snow")
  assert.equal(mapOwmCodeToConditionId(600, "13n", false), "snowy-night")
  assert.equal(mapOwmCodeToConditionId(602, "13d", true), "heavy-snow")
  assert.equal(mapOwmCodeToConditionId(611, "13d", true), "sleet")

  // Atmosphere
  assert.equal(mapOwmCodeToConditionId(701, "50d", true), "fog")
  assert.equal(mapOwmCodeToConditionId(711, "50d", true), "haze")
  assert.equal(mapOwmCodeToConditionId(731, "50d", true), "dust-storm")
  assert.equal(mapOwmCodeToConditionId(771, "50d", true), "windy")

  // Clear
  assert.equal(mapOwmCodeToConditionId(800, "01d", true), "clear-day")
  assert.equal(mapOwmCodeToConditionId(800, "01n", false), "clear-night")

  // Clouds
  assert.equal(mapOwmCodeToConditionId(801, "02d", true), "mostly-sunny")
  assert.equal(mapOwmCodeToConditionId(802, "03d", true), "partly-cloudy")
  assert.equal(mapOwmCodeToConditionId(803, "04d", true), "cloudy")
  assert.equal(mapOwmCodeToConditionId(804, "04d", true), "overcast")
})

test("degToCompass converts wind degrees to 16-point compass directions", () => {
  assert.equal(degToCompass(0), "N")
  assert.equal(degToCompass(360), "N")
  assert.equal(degToCompass(90), "E")
  assert.equal(degToCompass(180), "S")
  assert.equal(degToCompass(270), "W")
  assert.equal(degToCompass(247.5), "WSW")
  assert.equal(degToCompass(45), "NE")
})

test("formatLocalTime calculates local time with timezone shift without UTC drift", () => {
  // Epoch: 1700000000 = 2023-11-14 22:13:20 UTC
  // Timezone shift: +3600 (London/Paris CET) -> 23:13
  const res = formatLocalTime(1700000000, 3600)
  assert.equal(res.hours, 23)
  assert.equal(res.minutes, 13)
  assert.equal(res.time, "11:13 PM")
})

test("interpretAqi returns proper European/OWM AQI labels", () => {
  assert.equal(interpretAqi(1).label, "1 · Good")
  assert.equal(interpretAqi(2).label, "2 · Fair")
  assert.equal(interpretAqi(3).label, "3 · Moderate")
  assert.equal(interpretAqi(4).label, "4 · Poor")
  assert.equal(interpretAqi(5).label, "5 · Very Poor")
})

test("buildUnifiedWeatherData normalizes OWM responses correctly", () => {
  const currentMock = {
    coord: { lat: 37.7749, lon: -122.4194 },
    weather: [
      { id: 802, main: "Clouds", description: "scattered clouds", icon: "03d" },
    ],
    main: {
      temp: 21.4,
      feels_like: 20.8,
      temp_min: 18.2,
      temp_max: 23.5,
      pressure: 1012,
      humidity: 65,
    },
    visibility: 10000,
    wind: { speed: 4.5, deg: 230 },
    clouds: { all: 40 },
    dt: 1700000000,
    sys: { country: "US", sunrise: 1699980000, sunset: 1700020000 },
    timezone: -28800,
    name: "San Francisco",
  }

  const forecastMock = {
    list: [
      {
        dt: 1700000000,
        main: { temp: 21 },
        weather: [{ id: 802, icon: "03d" }],
        pop: 0.1,
      },
      {
        dt: 1700010800,
        main: { temp: 22 },
        weather: [{ id: 801, icon: "02d" }],
        pop: 0.05,
      },
    ],
  }

  const pollutionMock = {
    list: [
      {
        main: { aqi: 1 },
        components: {
          pm2_5: 5.2,
          pm10: 9.8,
          o3: 30.1,
          no2: 8.5,
          so2: 2.1,
          co: 220,
        },
      },
    ],
  }

  const result = buildUnifiedWeatherData(
    currentMock,
    forecastMock,
    pollutionMock,
  )
  assert.equal(result.city.city, "San Francisco")
  assert.equal(result.city.country, "US")
  assert.equal(result.weather.temperature, 21)
  assert.equal(result.weather.humidity, 65)
  assert.equal(result.weather.windSpeed, 16) // 4.5 m/s * 3.6 = 16.2 -> 16 km/h
  assert.equal(result.weather.aqi.aqi, 1)
  assert.equal(result.hourly.length, 2)
})

test("generateDemoWeather returns complete fallback object without throwing", () => {
  const fallback = generateDemoWeather({
    city: "Tokyo",
    country: "Japan",
    temp: 18,
    conditionId: "clear-night",
  })
  assert.equal(fallback.city.city, "Tokyo")
  assert.equal(fallback.city.country, "Japan")
  assert.equal(fallback.weather.temperature, 18)
  assert.ok(fallback.hourly.length > 0)
  assert.ok(fallback.daily.length > 0)
  assert.ok(fallback.weather.aqi)
})
