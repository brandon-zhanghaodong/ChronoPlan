
import { WeatherInfo, DailyForecast } from '../types';

// WMO Weather interpretation codes (WW)
const getWeatherDescription = (code: number): string => {
  if (code === 0) return '晴朗';
  if (code >= 1 && code <= 3) return '多云';
  if (code >= 45 && code <= 48) return '有雾';
  if (code >= 51 && code <= 55) return '毛毛雨';
  if (code >= 61 && code <= 65) return '下雨';
  if (code >= 66 && code <= 67) return '雨夹雪';
  if (code >= 71 && code <= 77) return '下雪';
  if (code >= 80 && code <= 82) return '阵雨';
  if (code >= 85 && code <= 86) return '阵雪';
  if (code >= 95) return '雷雨';
  return '多云';
};

const getClothingAdvice = (temp: number, code: number): string => {
  let advice = "";
  
  // Rain/Snow Logic
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) {
    advice += "记得带伞。";
  } else if (code >= 71 || code >= 85) {
    advice += "雪天路滑，注意保暖。";
  } else if (code === 0 && temp > 25) {
    advice += "注意防晒。";
  }

  // Temperature Logic
  if (temp >= 30) {
    advice += " 天气炎热，建议穿着短袖、薄款透气衣物。";
  } else if (temp >= 24) {
    advice += " 温暖舒适，建议T恤或薄衬衫。";
  } else if (temp >= 18) {
    advice += " 稍有凉意，建议长袖衬衫或薄外套。";
  } else if (temp >= 10) {
    advice += " 气温较低，建议夹克、风衣或毛衣。";
  } else if (temp >= 0) {
    advice += " 天气寒冷，请穿着棉服或羽绒服。";
  } else {
    advice += " 严寒天气，请穿着厚羽绒服，注意防寒。";
  }

  return advice;
};

export const fetchLocalWeather = async (): Promise<WeatherInfo> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Using Open-Meteo Free API (No key required)
          // Added daily params for forecast
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
          );
          
          if (!response.ok) throw new Error('Weather fetch failed');
          
          const data = await response.json();
          const current = data.current;
          const daily = data.daily;

          const dailyForecasts: DailyForecast[] = [];
          if (daily && daily.time) {
              for(let i = 0; i < daily.time.length; i++) {
                  dailyForecasts.push({
                      date: daily.time[i],
                      maxTemp: Math.round(daily.temperature_2m_max[i]),
                      minTemp: Math.round(daily.temperature_2m_min[i]),
                      weatherCode: daily.weather_code[i]
                  });
              }
          }
          
          const info: WeatherInfo = {
            loading: false,
            temperature: Math.round(current.temperature_2m),
            weatherCode: current.weather_code,
            weatherText: getWeatherDescription(current.weather_code),
            clothingAdvice: getClothingAdvice(current.temperature_2m, current.weather_code),
            daily: dailyForecasts
          };
          
          resolve(info);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error.message);
      }
    );
  });
};
