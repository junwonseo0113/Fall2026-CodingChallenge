const WEATHER_FETCH_TIMEOUT_MS = 5000;

interface CurrentWeather {
  weatherCode: number;
  tempC: number;
}

/**
 * Best-effort current-weather lookup via Open-Meteo -- free, no API key
 * required, which keeps this feature working out of the box like the rest
 * of the app's zero-config defaults. Returns null on any failure/timeout so
 * a flaky network never blocks the "today's visual" pick, it just falls
 * back to time-of-day only.
 */
export async function fetchWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT_MS);
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("current", "temperature_2m,weather_code");
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    if (typeof data.current?.weather_code !== "number") return null;
    return { weatherCode: data.current.weather_code, tempC: data.current.temperature_2m ?? NaN };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type TimeBucket = "night" | "sunrise" | "morning" | "midday" | "afternoon" | "sunset" | "evening";

const TIME_LABELS: Record<TimeBucket, string> = {
  night: "Late night",
  sunrise: "Sunrise",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  sunset: "Sunset",
  evening: "Evening",
};

const TIME_KEYWORDS: Record<TimeBucket, string> = {
  night: "night sky stars",
  sunrise: "sunrise golden light",
  morning: "cozy morning coffee",
  midday: "bright sunny day",
  afternoon: "golden afternoon light",
  sunset: "sunset golden hour",
  evening: "city lights evening",
};

function timeBucketOf(hour: number): TimeBucket {
  if (hour >= 22 || hour < 5) return "night";
  if (hour < 7) return "sunrise";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 19) return "sunset";
  return "evening";
}

/** Maps an Open-Meteo WMO weather code (https://open-meteo.com/en/docs) to a label + search keyword. */
function weatherLabelOf(code: number): { label: string; keyword: string } | null {
  if (code === 0) return { label: "clear", keyword: "clear blue sky" };
  if (code <= 3) return { label: "cloudy", keyword: "cloudy moody sky" };
  if (code === 45 || code === 48) return { label: "foggy", keyword: "fog mist" };
  if (code >= 51 && code <= 67) return { label: "rainy", keyword: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "snowy", keyword: "snow winter" };
  if (code >= 80 && code <= 82) return { label: "showery", keyword: "rain shower" };
  if (code >= 95) return { label: "stormy", keyword: "thunderstorm dramatic sky" };
  return null; // unrecognized code -- fall back to time-of-day only
}

export interface TodayVisualContext {
  query: string;
  summary: string; // human-readable, e.g. "Rainy evening, 14°C" or "Sunset" when weather is unavailable
}

/** Combines local hour + (optional) current weather into an Unsplash search query and a caption. */
export function buildTodayVisualContext(hour: number, weather: CurrentWeather | null): TodayVisualContext {
  const bucket = timeBucketOf(hour);
  const timeLabel = TIME_LABELS[bucket];
  const timeKeyword = TIME_KEYWORDS[bucket];

  if (!weather) {
    return { query: timeKeyword, summary: timeLabel };
  }
  const weatherInfo = weatherLabelOf(weather.weatherCode);
  if (!weatherInfo) {
    return { query: timeKeyword, summary: timeLabel };
  }

  const temp = Number.isFinite(weather.tempC) ? `, ${Math.round(weather.tempC)}°C` : "";
  return {
    query: `${weatherInfo.keyword} ${timeKeyword}`,
    summary: `${capitalize(weatherInfo.label)} ${timeLabel.toLowerCase()}${temp}`,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
