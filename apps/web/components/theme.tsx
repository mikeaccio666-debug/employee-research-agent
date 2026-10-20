export const THEME_KEY = 'pv-theme';

// Runs before first paint, at the top of <body>. Adds .light or .dark next to .pv when
// the person picked one; otherwise the system preference applies (see system.css).
// `?theme=light|dark` shows one page view in that theme without saving it (the design
// index uses it to open boards drawn in 夜); `?theme=system` clears a saved choice.
const script = `(function(){try{var b=document.body,s=localStorage,q=new URLSearchParams(location.search).get('theme'),t=s.getItem('${THEME_KEY}');if(q==='light'||q==='dark'){t=q}else if(q==='system'){t=null;s.removeItem('${THEME_KEY}')}if(t==='light'||t==='dark')b.classList.add(t)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
