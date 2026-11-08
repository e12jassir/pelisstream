/** Physical-mass curves shared by every transition (transform + opacity only). */
export const EASE_SPRING = [0.32, 0.72, 0, 1] as const;
export const EASE_GLIDE = [0.22, 1, 0.36, 1] as const;

export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
export const SPRING_SNAP = { type: "spring", stiffness: 520, damping: 34 } as const;
