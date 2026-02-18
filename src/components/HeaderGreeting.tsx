import { useEffect, useState } from 'react';
import './HeaderGreeting.css';

interface HeaderGreetingProps {
  userName?: string;
}

export function HeaderGreeting({ userName = 'User' }: HeaderGreetingProps) {
  const [greeting, setGreeting] = useState('');
  const [dateTime, setDateTime] = useState<{ date: string; time: string }>({ date: '', time: '' });

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let greetingText = '';

      if (hour < 12) {
        greetingText = 'Good morning';
      } else if (hour < 18) {
        greetingText = 'Good afternoon';
      } else {
        greetingText = 'Good evening';
      }

      setGreeting(greetingText);
    };

    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const time = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

      setDateTime({ date, time });
    };

    updateGreeting();
    updateDateTime();

    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="header-greeting">
      <div className="header-greeting-title">
        {greeting}, <span className="header-greeting-name">{userName}</span>
      </div>
      <div className="header-greeting-datetime">
        {dateTime.date} • {dateTime.time}
      </div>
    </div>
  );
}
