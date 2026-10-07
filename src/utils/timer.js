// Utilities for Live Restaurant Clocks & Dining Elapsed Timers

export function parseTimeToSeconds(timeStr, endTimeStr = null) {
  if (!timeStr) return 0;
  try {
    const parseComponents = (str) => {
      const match = str.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : 0;
      const meridian = match[4];
      if (meridian) {
        if (meridian.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (meridian.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      return { hours, minutes, seconds };
    };

    const start = parseComponents(timeStr);
    if (!start) return 0;

    const orderDate = new Date();
    orderDate.setHours(start.hours, start.minutes, start.seconds, 0);

    let targetDate = new Date();
    if (endTimeStr) {
      const end = parseComponents(endTimeStr);
      if (end) {
        targetDate = new Date();
        targetDate.setHours(end.hours, end.minutes, end.seconds, 0);
      }
    }

    let diffSec = Math.floor((targetDate.getTime() - orderDate.getTime()) / 1000);
    if (diffSec < 0) diffSec += 24 * 3600; // handle across midnight wrap
    return Math.max(0, diffSec);
  } catch {
    return 0;
  }
}

export function formatElapsedTimer(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

export function getTimerUrgencyColor(totalSeconds) {
  if (totalSeconds >= 3600) {
    return {
      text: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(239, 68, 68, 0.35)',
      dot: '#ef4444',
      label: 'Long Dining'
    };
  }
  if (totalSeconds >= 1800) {
    return {
      text: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.14)',
      border: 'rgba(245, 158, 11, 0.35)',
      dot: '#f59e0b',
      label: 'Serving'
    };
  }
  return {
    text: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
    label: 'Normal'
  };
}
