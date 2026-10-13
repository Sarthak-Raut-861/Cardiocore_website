/* ═══════════════════════════════════════════════════════════
   CardioCore · Main Entry Point (ES Modules & Vite)
   ═══════════════════════════════════════════════════════════ */

// Import modular application scripts in dependency order
import './60_core.js';
import './70_extras.js';
import './80_motion.js';
import './81_charts.js';
import './82_files.js';
import './83_messages.js';
import './84_sim.js';
import './86_emergency.js';
import './87_booking.js';
import './88_shell.js';

// Publish all layer APIs on window.CC for HTML inline actions and templates
if (typeof window !== 'undefined') {
  window.CC = window.CC || {};
  Object.assign(
    window.CC,
    window.Motion || {},
    window.Files || {},
    window.Messages || {},
    window.Units || {},
    window.ChartFX || {},
    window.Sim || {},
    window.Emergency || {},
    window.Booking || {},
    window.Shell || {}
  );
}

export default window.CC;
