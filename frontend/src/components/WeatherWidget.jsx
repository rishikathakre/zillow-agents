import { useState, useEffect } from "react";
import api from "../api/client";

const WI = {
  Clear: "☀️", Sunny: "☀️", "Partly Cloudy": "⛅", Cloudy: "☁️",
  Overcast: "☁️", Rain: "🌧️", "Light Rain": "🌦️", "Heavy Rain": "🌧️",
  Snow: "❄️", "Light Snow": "🌨️", Thunderstorm: "⛈️", Fog: "🌫️", Windy: "💨",
};

function icon(cond) { return WI[cond] || "🌤️"; }

// Renders either an OWM icon image or an emoji fallback
function WeatherIcon({ iconUrl, condition, size = "text-6xl", imgSize = 64 }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={condition}
        width={imgSize}
        height={imgSize}
        className="drop-shadow-sm"
      />
    );
  }
  return <span className={size}>{icon(condition)}</span>;
}

export default function WeatherWidget({ zipCode, lat, lon }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zipCode) return;
    // Pass lat/lon as query params for more accurate weather lookup
    const params = (lat && lon) ? { lat, lon } : {};
    api.get(`/weather/${zipCode}`, { params })
      .then(r => setWeather(r.data))
      .finally(() => setLoading(false));
  }, [zipCode, lat, lon]);

  if (loading) return <div className="animate-pulse bg-gray-100 rounded-2xl h-40" />;
  if (!weather) return null;

  const forecast = weather.forecast_7day || [];
  const annual = weather.annual || {};

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl text-white p-5 space-y-4">
      <h3 className="font-bold text-lg">Current Weather</h3>

      {/* Current */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-5xl font-bold">{weather.temp_f}°F</div>
          <div className="text-blue-200 mt-1">{weather.condition}</div>
          <div className="text-blue-300 text-sm mt-1">
            Feels like {weather.feels_like_f}°F · Humidity {weather.humidity_pct}% · Wind {weather.wind_mph} mph
          </div>
        </div>
        <WeatherIcon iconUrl={weather.icon_url} condition={weather.condition} imgSize={80} />
      </div>

      {/* 7-day forecast */}
      {forecast.length > 0 && (
        <div>
          <div className="text-blue-200 text-xs uppercase font-semibold mb-2">7-Day Forecast</div>
          <div className="grid grid-cols-7 gap-1">
            {forecast.slice(0, 7).map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 bg-blue-700/40 rounded-xl py-2 px-1">
                <span className="text-blue-200 text-xs">{d.day}</span>
                {d.icon_url
                  ? <img src={d.icon_url} alt={d.condition} width={28} height={28} />
                  : <span className="text-lg">{icon(d.condition)}</span>
                }
                <span className="text-xs font-semibold">{d.hi}°</span>
                <span className="text-xs text-blue-300">{d.lo}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual stats */}
      {annual.sunny_days && (
        <div className="border-t border-blue-500/40 pt-3 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-blue-200 text-xs">Sunny Days</div>
            <div className="font-bold">{annual.sunny_days}</div>
          </div>
          <div>
            <div className="text-blue-200 text-xs">Annual Rain</div>
            <div className="font-bold">{annual.rain_in}"</div>
          </div>
          <div>
            <div className="text-blue-200 text-xs">Snow</div>
            <div className="font-bold">{annual.snow_in}"</div>
          </div>
          <div>
            <div className="text-blue-200 text-xs">Heat Days</div>
            <div className="font-bold">{annual.heat_days}</div>
          </div>
        </div>
      )}
    </div>
  );
}
