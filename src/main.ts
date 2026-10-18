import { mount } from 'svelte';
import App from './App.svelte';
import './styles/base.css';

/**
 * Dynamic Type follows the iOS text size up to "xxxLarge" (23 pt). The accessibility sizes
 * (up to 53 pt) would push the fixed-height workout screen off the display.
 */
const MAX_ROOT_FONT_PX = 23;

function capTextSize() {
  const root = document.documentElement;
  root.style.removeProperty('font-size');
  if (parseFloat(getComputedStyle(root).fontSize) > MAX_ROOT_FONT_PX) root.style.fontSize = `${MAX_ROOT_FONT_PX}px`;
}

capTextSize();
// The text size can change in Settings or Control Center while the app is in the background.
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && capTextSize());

export default mount(App, { target: document.getElementById('app')! });
