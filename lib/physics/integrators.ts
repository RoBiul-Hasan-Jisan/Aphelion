// Generic numerical integrators operating on flat state vectors (number[]).
// Every method takes: state y, derivative function dydt(y) -> number[], and dt.
// Position/velocity-split methods (Verlet, Semi-Implicit Euler) additionally
// need an acceleration-only function accel(positions) -> accelerations, since
// they exploit the second-order structure y'' = a(y) for symplecticity.

export type StateVector = number[];
export type DerivativeFn = (y: StateVector, t: number) => StateVector;

export interface StepResult {
  y: StateVector;
  dtUsed: number;
  error?: number;
  rejected?: boolean;
}

const addScaled = (a: StateVector, b: StateVector, scale: number): StateVector =>
  a.map((v, i) => v + b[i] * scale);

const combine = (base: StateVector, terms: [StateVector, number][]): StateVector => {
  const out = base.slice();
  for (const [term, coeff] of terms) {
    for (let i = 0; i < out.length; i++) out[i] += term[i] * coeff;
  }
  return out;
};

/** Explicit (forward) Euler — first order, included for comparison only. */
export function explicitEuler(y: StateVector, f: DerivativeFn, t: number, dt: number): StepResult {
  const k1 = f(y, t);
  return { y: addScaled(y, k1, dt), dtUsed: dt };
}

/**
 * Semi-implicit (symplectic) Euler. Updates velocities with the current
 * acceleration, then updates positions with the *new* velocities. Requires
 * the state to be laid out as repeating [x, y, vx, vy, ...] blocks of 4.
 */
export function semiImplicitEuler(
  y: StateVector,
  f: DerivativeFn,
  t: number,
  dt: number
): StepResult {
  const dydt = f(y, t);
  const out = y.slice();
  for (let i = 0; i < y.length; i += 4) {
    // velocities first (indices i+2, i+3 use accelerations from dydt)
    out[i + 2] = y[i + 2] + dydt[i + 2] * dt;
    out[i + 3] = y[i + 3] + dydt[i + 3] * dt;
    // positions using the updated velocities
    out[i] = y[i] + out[i + 2] * dt;
    out[i + 1] = y[i + 1] + out[i + 3] * dt;
  }
  return { y: out, dtUsed: dt };
}

/**
 * Velocity Verlet. Symplectic, time-reversible, excellent energy behavior
 * for conservative forces. Same [x, y, vx, vy] block layout requirement.
 */
export function velocityVerlet(
  y: StateVector,
  f: DerivativeFn,
  t: number,
  dt: number
): StepResult {
  const a0 = f(y, t); // accelerations at t (velocity slots of dydt)
  const half = y.slice();
  for (let i = 0; i < y.length; i += 4) {
    half[i] = y[i] + y[i + 2] * dt + 0.5 * a0[i + 2] * dt * dt;
    half[i + 1] = y[i + 1] + y[i + 3] * dt + 0.5 * a0[i + 3] * dt * dt;
    // velocities left unchanged for now
    half[i + 2] = y[i + 2];
    half[i + 3] = y[i + 3];
  }
  const a1 = f(half, t + dt); // accelerations at t+dt using new positions
  const out = half.slice();
  for (let i = 0; i < y.length; i += 4) {
    out[i + 2] = y[i + 2] + 0.5 * (a0[i + 2] + a1[i + 2]) * dt;
    out[i + 3] = y[i + 3] + 0.5 * (a0[i + 3] + a1[i + 3]) * dt;
  }
  return { y: out, dtUsed: dt };
}

/** Classical fourth-order Runge-Kutta — fixed step, not symplectic. */
export function rk4(y: StateVector, f: DerivativeFn, t: number, dt: number): StepResult {
  const k1 = f(y, t);
  const k2 = f(addScaled(y, k1, dt / 2), t + dt / 2);
  const k3 = f(addScaled(y, k2, dt / 2), t + dt / 2);
  const k4 = f(addScaled(y, k3, dt), t + dt);
  const out = combine(y, [
    [k1, dt / 6],
    [k2, dt / 3],
    [k3, dt / 3],
    [k4, dt / 6],
  ]);
  return { y: out, dtUsed: dt };
}

// Dormand-Prince (RK45) Butcher tableau
const DP = {
  c: [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1],
  a: [
    [],
    [1 / 5],
    [3 / 40, 9 / 40],
    [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
    [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
  ],
  b5: [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0],
  b4: [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40],
};

/**
 * Adaptive RK45 (Dormand-Prince). Takes one embedded step, estimates local
 * error against a tolerance, and reports the error so the caller can adapt
 * the next dt. Always returns a result (the step is accepted) — callers
 * that want strict rejection can check `error` against their tolerance.
 */
export function rk45Adaptive(
  y: StateVector,
  f: DerivativeFn,
  t: number,
  dt: number,
  tol = 1e-6
): StepResult {
  const k: StateVector[] = [];
  for (let s = 0; s < 7; s++) {
    let ys = y.slice();
    for (let j = 0; j < s; j++) {
      ys = addScaled(ys, k[j], dt * DP.a[s][j]);
    }
    k.push(f(ys, t + DP.c[s] * dt));
  }
  const y5 = combine(
    y,
    k.map((ki, i) => [ki, dt * DP.b5[i]] as [StateVector, number])
  );
  const y4 = combine(
    y,
    k.map((ki, i) => [ki, dt * DP.b4[i]] as [StateVector, number])
  );
  let errSq = 0;
  for (let i = 0; i < y.length; i++) {
    const scale = tol * (1 + Math.abs(y5[i]));
    const e = (y5[i] - y4[i]) / scale;
    errSq += e * e;
  }
  const error = Math.sqrt(errSq / y.length);
  // Suggest a new dt for the *next* call (PI-ish controller, simple version)
  const safety = 0.9;
  const factor = error > 0 ? safety * Math.pow(1 / error, 0.2) : 2;
  const clamped = Math.min(4, Math.max(0.2, factor));
  return { y: y5, dtUsed: dt, error, rejected: error > 1 };
}

/** Improved Euler / Heun's method — second order predictor-corrector. */
export function improvedEuler(y: StateVector, f: DerivativeFn, t: number, dt: number): StepResult {
  const k1 = f(y, t);
  const predictor = addScaled(y, k1, dt);
  const k2 = f(predictor, t + dt);
  const out = combine(y, [
    [k1, dt / 2],
    [k2, dt / 2],
  ]);
  return { y: out, dtUsed: dt };
}

export type IntegratorId =
  | "explicit-euler"
  | "semi-implicit-euler"
  | "velocity-verlet"
  | "rk4"
  | "rk45"
  | "improved-euler";

export const INTEGRATOR_META: Record<
  IntegratorId,
  { label: string; order: number; symplectic: boolean; adaptive: boolean; description: string }
> = {
  "explicit-euler": {
    label: "Explicit Euler",
    order: 1,
    symplectic: false,
    adaptive: false,
    description: "First-order, simplest possible method. Included as a cautionary baseline — energy drifts visibly within a few orbits.",
  },
  "semi-implicit-euler": {
    label: "Semi-Implicit Euler",
    order: 1,
    symplectic: true,
    adaptive: false,
    description: "First-order but symplectic: updates velocity before position. Energy oscillates but does not drift, making it far better than explicit Euler for long runs.",
  },
  "velocity-verlet": {
    label: "Velocity Verlet",
    order: 2,
    symplectic: true,
    adaptive: false,
    description: "Second-order, symplectic and time-reversible. The standard choice for N-body gravitational integration.",
  },
  rk4: {
    label: "Classical RK4",
    order: 4,
    symplectic: false,
    adaptive: false,
    description: "Fourth-order accuracy per fixed step. Very precise short-term, but not symplectic — slow secular energy drift appears over long integrations.",
  },
  rk45: {
    label: "Adaptive RK45",
    order: 5,
    symplectic: false,
    adaptive: true,
    description: "Dormand-Prince embedded pair. Automatically shrinks the step near closest approach and grows it far away, trading a variable step for tight error control.",
  },
  "improved-euler": {
    label: "Improved Euler (Heun)",
    order: 2,
    symplectic: false,
    adaptive: false,
    description: "Predictor-corrector second-order method. A reasonable middle ground for projectile motion where trajectories are short-lived.",
  },
};
