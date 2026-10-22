import React from 'react';
import {Sun, Moon} from 'lucide-react';
export function ThemeToggle({currentTheme, onChangeTheme}) {
 const light = currentTheme === 'light-bistro';
 const label = light ? 'Switch to Dark Theme' : 'Switch to Light Theme';
 return <button type="button" className="theme-toggle" title={label} aria-label={label} onClick={() => onChangeTheme?.(light ? 'royal-saffron' : 'light-bistro')}>
 {light ? <Moon size={18}/> : <Sun size={18}/>}<span className="theme-toggle-label">{light ? 'Light' : 'Dark'}</span></button>;
}
