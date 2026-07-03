import { StateVector, IntegratorId, explicitEuler, improvedEuler, rk4, rk45Adaptive } from "./integrators";

export type DragModel = "vacuum" | "linear" | "quadratic";

export interface ProjectileParams {
  v0: number; // launch speed, m/s
  angleDeg: number; // launch angle above horizontal
  mass: number; // kg
  gravity: number; // m/s^2 (positive, points down)
  launchHeight: number; // m
  airDensity: number; // kg/m^3, used by quadratic drag
  dragCoefficient: number; // Cd for quadratic; linear coefficient (k, N·s/m) for linear model
  crossSection: number; // m^2, used by quadratic drag
  dragModel: DragModel;
  windSpeed: number; // m/s, horizontal, along launch direction
  windDeg: number; // direction wind blows toward, deg from +x axis
}

// State layout: [x, y, vx, vy]
export function derivative(params: ProjectileParams) {
  return (y: StateVector): StateVector => {
    const [, , vx, vy] = y;
    const windX = params.windSpeed * Math.cos((params.windDeg * Math.PI) / 180);
    const windY = params.windSpeed * Math.sin((params.windDeg * Math.PI) / 180);
    const relVx = vx - windX;
    const relVy = vy - windY;
    const speed = Math.hypot(relVx, relVy);

    let dragAx = 0;
    let dragAy = 0;
    if (params.dragModel === "linear" && speed > 0) {
      const k = params.dragCoefficient;
      dragAx = -(k * relVx) / params.mass;
      dragAy = -(k * relVy) / params.mass;
    } else if (params.dragModel === "quadratic" && speed > 0) {
      const k = 0.5 * params.airDensity * params.dragCoefficient * params.crossSection;
      dragAx = -(k * speed * relVx) / params.mass;
      dragAy = -(k * speed * relVy) / params.mass;
    }

    const ax = dragAx;
    const ay = -params.gravity + dragAy;
    return [vx, vy, ax, ay];
  };
}

export interface ProjectileState {
  t: number;
  y: StateVector;
  landed: boolean;
}

export function stepProjectile(
  state: ProjectileState,
  params: ProjectileParams,
  method: IntegratorId,
  dt: number
): { state: ProjectileState; error?: number; dtUsed: number } {
  const f = derivative(params);
  let result;
  switch (method) {
    case "explicit-euler":
      result = explicitEuler(state.y, f, state.t, dt);
      break;
    case "improved-euler":
      result = improvedEuler(state.y, f, state.t, dt);
      break;
    case "rk45":
      result = rk45Adaptive(state.y, f, state.t, dt);
      break;
    case "rk4":
    default:
      result = rk4(state.y, f, state.t, dt);
      break;
  }
  let y = result.y;
  let landed = state.landed;
  if (y[1] <= 0 && !landed) {
    // Linear-interpolate the landing point rather than letting it plunge below ground
    const y0 = state.y[1];
    const y1 = y[1];
    const frac = y0 <= 0 ? 0 : y0 / (y0 - y1);
    y = state.y.map((v, i) => v + (y[i] - v) * frac);
    y[1] = 0;
    landed = true;
  }
  return { state: { t: state.t + result.dtUsed, y, landed }, error: result.error, dtUsed: result.dtUsed };
}

export interface ProjectileDerived {
  position: [number, number];
  velocity: [number, number];
  acceleration: [number, number];
  speed: number;
  dragForce: [number, number];
  dragMag: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  height: number;
  range: number;
}

export function deriveProjectile(state: ProjectileState, params: ProjectileParams): ProjectileDerived {
  const [x, y, vx, vy] = state.y;
  const f = derivative(params);
  const dydt = f(state.y);
  const ax = dydt[2];
  const ay = dydt[3];
  const dragAx = ax;
  const dragAy = ay + params.gravity;
  const speed = Math.hypot(vx, vy);
  return {
    position: [x, y],
    velocity: [vx, vy],
    acceleration: [ax, ay],
    speed,
    dragForce: [dragAx * params.mass, dragAy * params.mass],
    dragMag: Math.hypot(dragAx, dragAy) * params.mass,
    kineticEnergy: 0.5 * params.mass * speed * speed,
    potentialEnergy: params.mass * params.gravity * y,
    totalEnergy: 0.5 * params.mass * speed * speed + params.mass * params.gravity * y,
    height: y,
    range: x,
  };
}

/** Closed-form vacuum solution, used as an analytic reference overlay. */
export function vacuumTrajectory(params: ProjectileParams, samples = 200) {
  const angle = (params.angleDeg * Math.PI) / 180;
  const vx0 = params.v0 * Math.cos(angle);
  const vy0 = params.v0 * Math.sin(angle);
  const g = params.gravity;
  const h0 = params.launchHeight;
  const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  const pts: { x: number; y: number; t: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (tFlight * i) / samples;
    pts.push({ x: vx0 * t, y: h0 + vy0 * t - 0.5 * g * t * t, t });
  }
  return { points: pts, flightTime: tFlight, range: vx0 * tFlight, maxHeight: h0 + (vy0 * vy0) / (2 * g) };
}

export interface ProjectilePreset {
  id: string;
  label: string;
  description: string;
  params: ProjectileParams;
}

export const PROJECTILE_PRESETS: ProjectilePreset[] = [
  {
    id: "vacuum-classic",
    label: "Textbook Vacuum",
    description: "No drag, no wind — the parabola every physics course starts with.",
    params: { v0: 45, angleDeg: 50, mass: 2, gravity: 9.81, launchHeight: 0, airDensity: 1.225, dragCoefficient: 0.47, crossSection: 0.045, dragModel: "vacuum", windSpeed: 0, windDeg: 0 },
  },
  {
    id: "cannonball",
    label: "Cannonball with Quadratic Drag",
    description: "A dense sphere through real air — drag noticeably shortens the range versus the vacuum case.",
    params: { v0: 60, angleDeg: 42, mass: 6, gravity: 9.81, launchHeight: 0, airDensity: 1.225, dragCoefficient: 0.47, crossSection: 0.07, dragModel: "quadratic", windSpeed: 0, windDeg: 0 },
  },
  {
    id: "windy-shot",
    label: "Crosswind Shot",
    description: "A lighter projectile in a steady crosswind — watch the trajectory curve away from the vacuum parabola.",
    params: { v0: 38, angleDeg: 35, mass: 0.6, gravity: 9.81, launchHeight: 1.5, airDensity: 1.225, dragCoefficient: 0.55, crossSection: 0.012, dragModel: "quadratic", windSpeed: 8, windDeg: 200 },
  },
  {
    id: "cliff-launch",
    label: "Cliff Launch, Linear Drag",
    description: "Launched from elevation with a viscous (linear) drag model, appropriate for a slow, light object.",
    params: { v0: 25, angleDeg: 20, mass: 0.15, gravity: 9.81, launchHeight: 40, airDensity: 1.225, dragCoefficient: 0.4, crossSection: 0.01, dragModel: "linear", windSpeed: 0, windDeg: 0 },
  },
];
