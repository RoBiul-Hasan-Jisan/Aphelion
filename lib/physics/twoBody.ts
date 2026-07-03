import {
  StateVector,
  IntegratorId,
  explicitEuler,
  semiImplicitEuler,
  velocityVerlet,
  rk4,
  rk45Adaptive,
} from "./integrators";

export interface TwoBodyParams {
  G: number;
  m1: number;
  m2: number;
  softening: number; // Plummer softening length, avoids singular force at r->0
  restitution: number; // 0 = perfectly inelastic merge, 1 = perfectly elastic
  collisionsEnabled: boolean;
  bodyRadius1: number;
  bodyRadius2: number;
}

export interface TwoBodyState {
  t: number;
  y: StateVector; // [x1,y1,vx1,vy1,x2,y2,vx2,vy2]
  merged: boolean;
}

export type OrbitClass =
  | "circular"
  | "elliptical"
  | "parabolic"
  | "hyperbolic"
  | "collision"
  | "unknown";

export interface DerivedQuantities {
  r1: [number, number];
  v1: [number, number];
  r2: [number, number];
  v2: [number, number];
  separation: number;
  relSpeed: number;
  centerOfMass: [number, number];
  comVelocity: [number, number];
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  angularMomentum: number; // scalar (z-component) of relative orbital ang. momentum
  eccentricity: number;
  semiMajorAxis: number;
  orbitalPeriod: number | null; // null if not a closed orbit
  escapeVelocity: number;
  orbitClass: OrbitClass;
  accel1: [number, number];
  accel2: [number, number];
}

export function derivative(params: TwoBodyParams) {
  return (y: StateVector): StateVector => {
    const [x1, y1, vx1, vy1, x2, y2, vx2, vy2] = y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const r2 = dx * dx + dy * dy + params.softening * params.softening;
    const r = Math.sqrt(r2);
    const forceMag = (params.G * params.m1 * params.m2) / r2;
    const fx = (forceMag * dx) / r;
    const fy = (forceMag * dy) / r;
    const ax1 = fx / params.m1;
    const ay1 = fy / params.m1;
    const ax2 = -fx / params.m2;
    const ay2 = -fy / params.m2;
    return [vx1, vy1, ax1, ay1, vx2, vy2, ax2, ay2];
  };
}

export function stepTwoBody(
  state: TwoBodyState,
  params: TwoBodyParams,
  method: IntegratorId,
  dt: number
): { state: TwoBodyState; error?: number; dtUsed: number } {
  const f = derivative(params);
  let result;
  switch (method) {
    case "explicit-euler":
      result = explicitEuler(state.y, f, state.t, dt);
      break;
    case "semi-implicit-euler":
      result = semiImplicitEuler(state.y, f, state.t, dt);
      break;
    case "velocity-verlet":
      result = velocityVerlet(state.y, f, state.t, dt);
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
  let merged = state.merged;

  if (params.collisionsEnabled && !merged) {
    const dx = y[4] - y[0];
    const dy = y[5] - y[1];
    const dist = Math.hypot(dx, dy);
    const minDist = params.bodyRadius1 + params.bodyRadius2;
    if (dist < minDist) {
      if (params.restitution <= 0.001) {
        merged = true;
        const m1 = params.m1;
        const m2 = params.m2;
        const cx = (y[0] * m1 + y[4] * m2) / (m1 + m2);
        const cy = (y[1] * m1 + y[5] * m2) / (m1 + m2);
        const cvx = (y[2] * m1 + y[6] * m2) / (m1 + m2);
        const cvy = (y[3] * m1 + y[7] * m2) / (m1 + m2);
        y = [cx, cy, cvx, cvy, cx, cy, cvx, cvy];
      } else {
        // Reflect relative velocity along the line of centers, scaled by restitution
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        const rvx = y[6] - y[2];
        const rvy = y[7] - y[3];
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const impulse = (-(1 + params.restitution) * vn) / (1 / params.m1 + 1 / params.m2);
          y = y.slice();
          y[2] -= (impulse * nx) / params.m1;
          y[3] -= (impulse * ny) / params.m1;
          y[6] += (impulse * nx) / params.m2;
          y[7] += (impulse * ny) / params.m2;
        }
      }
    }
  }

  return {
    state: { t: state.t + result.dtUsed, y, merged },
    error: result.error,
    dtUsed: result.dtUsed,
  };
}

export function deriveQuantities(state: TwoBodyState, params: TwoBodyParams): DerivedQuantities {
  const [x1, y1, vx1, vy1, x2, y2, vx2, vy2] = state.y;
  const r1: [number, number] = [x1, y1];
  const v1: [number, number] = [vx1, vy1];
  const r2: [number, number] = [x2, y2];
  const v2: [number, number] = [vx2, vy2];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const separation = Math.hypot(dx, dy);
  const relSpeed = Math.hypot(vx2 - vx1, vy2 - vy1);

  const M = params.m1 + params.m2;
  const centerOfMass: [number, number] = [(x1 * params.m1 + x2 * params.m2) / M, (y1 * params.m1 + y2 * params.m2) / M];
  const comVelocity: [number, number] = [(vx1 * params.m1 + vx2 * params.m2) / M, (vy1 * params.m1 + vy2 * params.m2) / M];

  const ke = 0.5 * params.m1 * (vx1 * vx1 + vy1 * vy1) + 0.5 * params.m2 * (vx2 * vx2 + vy2 * vy2);
  const softR = Math.sqrt(dx * dx + dy * dy + params.softening * params.softening);
  const pe = -(params.G * params.m1 * params.m2) / softR;
  const totalEnergy = ke + pe;

  // Relative orbital mechanics (reduced two-body problem)
  const mu = params.G * M;
  const rx = dx, ry = dy;
  const rvx = vx2 - vx1, rvy = vy2 - vy1;
  const r = Math.hypot(rx, ry);
  const angularMomentum = rx * rvy - ry * rvx; // specific relative ang. momentum (scalar z)
  const v2mag = rvx * rvx + rvy * rvy;

  const specificEnergy = 0.5 * v2mag - mu / r;
  let eccentricity = 0;
  let semiMajorAxis = Infinity;
  let orbitClass: OrbitClass = "unknown";
  let orbitalPeriod: number | null = null;

  if (mu > 0) {
    const eVecX = (v2mag - mu / r) * rx / mu - (rx * rvx + ry * rvy) * rvx / mu;
    const eVecY = (v2mag - mu / r) * ry / mu - (rx * rvx + ry * rvy) * rvy / mu;
    eccentricity = Math.hypot(eVecX, eVecY);

    if (Math.abs(specificEnergy) < 1e-9) {
      orbitClass = "parabolic";
      semiMajorAxis = Infinity;
    } else {
      semiMajorAxis = -mu / (2 * specificEnergy);
      if (specificEnergy < 0) {
        orbitClass = eccentricity < 0.02 ? "circular" : "elliptical";
        orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(Math.abs(semiMajorAxis), 3) / mu);
      } else {
        orbitClass = "hyperbolic";
      }
    }
  }

  if (state.merged) orbitClass = "collision";

  const escapeVelocity = Math.sqrt((2 * mu) / Math.max(r, 1e-6));

  const f = derivative(params);
  const dydt = f(state.y);

  return {
    r1,
    v1,
    r2,
    v2,
    separation,
    relSpeed,
    centerOfMass,
    comVelocity,
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy,
    angularMomentum,
    eccentricity,
    semiMajorAxis,
    orbitalPeriod,
    escapeVelocity,
    orbitClass,
    accel1: [dydt[2], dydt[3]],
    accel2: [dydt[6], dydt[7]],
  };
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  params: TwoBodyParams;
  initial: StateVector;
}

export const TWO_BODY_PRESETS: Preset[] = [
  {
    id: "circular",
    label: "Circular Orbit",
    description: "Equal-ish masses on a near-perfect circular orbit around their common center of mass.",
    params: { G: 1, m1: 100, m2: 8, softening: 0.05, restitution: 0.8, collisionsEnabled: true, bodyRadius1: 0.35, bodyRadius2: 0.15 },
    initial: [0, 0, 0, -0.267, 5.5, 0, 0, 4.27],
  },
  {
    id: "elliptical",
    label: "Elliptical Orbit",
    description: "A moderately eccentric ellipse — speeds up sharply at perihelion, the classic Kepler picture.",
    params: { G: 1, m1: 100, m2: 5, softening: 0.05, restitution: 0.8, collisionsEnabled: true, bodyRadius1: 0.35, bodyRadius2: 0.12 },
    initial: [0, 0, 0, -0.12, 6, 0, 0, 4.6],
  },
  {
    id: "hyperbolic",
    label: "Hyperbolic Flyby",
    description: "The smaller body arrives too fast to be captured and slingshots away on an open trajectory.",
    params: { G: 1, m1: 100, m2: 3, softening: 0.05, restitution: 0.8, collisionsEnabled: true, bodyRadius1: 0.35, bodyRadius2: 0.1 },
    initial: [0, 0, 0, 0, 8, 4, -3.4, -0.6],
  },
  {
    id: "binary",
    label: "Comparable-Mass Binary",
    description: "Two similar masses orbiting a shared center of mass well away from either body — a true binary system.",
    params: { G: 1, m1: 40, m2: 34, softening: 0.05, restitution: 0.8, collisionsEnabled: true, bodyRadius1: 0.28, bodyRadius2: 0.26 },
    initial: [-2.7, 0, 0, -1.55, 3.2, 0, 0, 1.82],
  },
  {
    id: "collision",
    label: "Collision Course",
    description: "Aim two bodies directly at each other to watch merging, or elastic bounce, in action.",
    params: { G: 1, m1: 60, m2: 25, softening: 0.05, restitution: 0.3, collisionsEnabled: true, bodyRadius1: 0.32, bodyRadius2: 0.22 },
    initial: [-5, 0.4, 1.6, 0, 5, -0.4, -1.6, 0],
  },
  {
    id: "unstable",
    label: "Unstable Close Approach",
    description: "A grazing, highly eccentric orbit that dips extremely close to the primary — a stress test for every integrator.",
    params: { G: 1, m1: 120, m2: 2, softening: 0.03, restitution: 0.8, collisionsEnabled: false, bodyRadius1: 0.35, bodyRadius2: 0.08 },
    initial: [0, 0, 0, -0.05, 7.5, 0, 0, 5.85],
  },
];
