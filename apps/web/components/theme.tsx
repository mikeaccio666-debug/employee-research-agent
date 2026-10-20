import { InlineScript } from './InlineScript';

export const THEME_KEY = 'pv-theme';

// Runs in <head> before first paint. Adds .light or .dark to <html> when the person picked
// one; otherwise the system preference applies (see system.css). `?theme=light|dark` shows
// one page view in that theme without saving it (the design index uses it to open boards
// drawn in 夜); `?theme=system` clears a saved choice.
const script = `(function(){try{var d=document.documentElement,s=localStorage,q=new URLSearchParams(location.search).get('theme'),t=s.getItem('${THEME_KEY}');if(q==='light'||q==='dark'){t=q}else if(q==='system'){t=null;s.removeItem('${THEME_KEY}')}if(t==='light'||t==='dark')d.classList.add(t)}catch(e){}})()`;

export function ThemeScript() {
  return <InlineScript html={script} />;
}
