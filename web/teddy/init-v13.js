// CSP-safe boot sequence. Do not statically import app.js: ES modules evaluate
// dependencies BEFORE this module body, which would recreate the old race.
import {installCinematicV11} from './cinematic-v11.js';
import {installTeddyRefinement} from './refinement-v7.js';
import {installMovementEngine} from './movement-v8.js';
import {installCanvasMotionV13} from './canvas-motion-v13.js';
import {installMotionTelemetryBridge} from './motion-wire-v8.js';
import {installWorldScene} from './world-v8.js';

installCinematicV11();
installTeddyRefinement();
installMovementEngine();
installCanvasMotionV13();
installMotionTelemetryBridge();
installWorldScene();

// Only mount the application after motion methods and the live render path exist.
await import('../app.js');
