'use client';

import { useTranslation } from '@/lib/i18n';
import { CloudRain } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WeatherAndDate() {
  const { language } = useTranslation();
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      // Format: SO., 9. NOV.
      const formattedDate = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
        .format(now)
        .toUpperCase()
        .replace('.', '.,'); // Add comma after day name for German
      setDateString(formattedDate);
    };

    updateDate();
    const timerId = setInterval(updateDate, 60000); // Update every minute

    return () => clearInterval(timerId);
  }, [language]);

  return (
    <div className="flex items-center gap-2 text-white font-medium" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
      <CloudRain size={24} className="drop-shadow-lg" />
      <span>7°</span>
      <span>|</span>
      <span>{dateString}</span>
    </div>
  );
}
