import { useState, useEffect } from "react";
import api from "../api/client";

function WeatherIcon({ iconUrl, condition, imgSize = 64 }) {
  if (iconUrl) {
    return <img src={iconUrl} alt={condition} width={imgSize} height={imgSize} className="drop-shadow-sm" />;
  }
  return <div className="rounded-xl flex items-center justify-center" style={{ width: imgSize, height: imgSize, background: "#F1F5F9", color: "#94A3B8", fontSize: 12 }}>{condition}</div>;
}

export default function WeatherWidget({ zipCode, lat, lon }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zipCode) return;
    const params = (lat && lon) ? { lat, lon } : {};
    api.get(`/weather/${zipCode}`, { params })
      .then(r => setWeather(r.data))
      .finally(() => setLoading(false));
  }, [zipCode, lat, lon]);

  if (loading) return <div className="animate-pulse rounded-xl h-40" style={{ background: "#F1F5F9" }} />;
  if (!weather) return null;

  const forecast = weather.forecast_7day || [];
  const annual = weather.annual || {};

  return (
    <div className="space-y-4">
      <h3 style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>Current Weather</h3>

      {/* Current */}
      <div className="flex items-center justify-between">
        <div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#0F172A" }}>{weather.temp_f}°F</div>
          <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{weather.condition}</div>
          <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
            Feels like {weather.feels_like_f}°F · Humidity {weather.humidity_pct}% · Wind {weather.wind_mph} mph
          </div>
        </div>
        <WeatherIcon iconUrl={weather.icon_url} condition={weather.condition} imgSize={64} />
      </div>

      {/* 7-day forecast */}
      {forecast.length > 0 && (
        <div>
          <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>7-Day Forecast</div>
          <div className="grid grid-cols-7 gap-1">
            {forecast.slice(0, 7).map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 rounded-lg py-2 px-1" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <span style={{ color: "#94A3B8", fontSize: 11 }}>{d.day}</span>
                {d.icon_url
                  ? <img src={d.icon_url} alt={d.condition} width={28} height={28} />
                  : <div className="w-7 h-7 rounded" style={{ background: "#F1F5F9" }} />
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{d.hi}°</span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{d.lo}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual stats */}
      {annual.sunny_days && (
        <div className="grid grid-cols-4 gap-2 text-center" style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
          <div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>Sunny Days</div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{annual.sunny_days}</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>Annual Rain</div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{annual.rain_in}"</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>Snow</div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{annual.snow_in}"</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>Heat Days</div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{annual.heat_days}</div>
          </div>
        </div>
      )}
    </div>
  );
}
