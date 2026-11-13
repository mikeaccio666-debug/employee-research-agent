/** The saved colour theme. Absent = the neutral default; `morning` = 晨光, the earlier blue wall and cream trim. */
export const THEME_KEY = 'skystep-theme';

/** Runs before first paint (see the root layout) so a saved 晨光 never flashes neutral. */
export const THEME_BOOT = `try{if(localStorage.getItem('${THEME_KEY}')==='morning')document.body.classList.add('morning')}catch(e){}`;
