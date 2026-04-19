export const SECTION_EXIT_VECTORS: Array<{ x: number; y: number; rotate: number }> = [
  { x: -280, y: -180, rotate: 9  },
  { x: 0,    y: -300, rotate: -5 },
  { x: 300,  y: -100, rotate: -8 },
  { x: -300, y: 160,  rotate: 7  },
  { x: 260,  y: 210,  rotate: -9 },
  { x: 0,    y: 290,  rotate: 6  },
];

export const SECTION_ENTRY_VECTORS: Array<{ x: number; y: number }> = [
  { x: 260,  y: 210  },
  { x: -240, y: 190  },
  { x: -280, y: -120 },
  { x: 290,  y: -140 },
  { x: 0,    y: -250 },
  { x: 0,    y: 260  },
];

export const SCATTER_WRAPPER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

export const SECTION_ENTRY_ROTATIONS = [3, -3, 4, -4, 3, -3];

export const SCATTER_SECTION_ITEM = {
  /* The hero (i === 0) starts fully visible so it paints the instant the
     LandingMotionStage chunk mounts — no opacity/blur fade-in gap between
     the wallpaper and the hero text. Sections below the fold (i >= 1)
     keep the playful scatter entrance, which the user only ever sees
     once they scroll into them. */
  hidden: (i: number) => {
    if (i === 0) {
      return { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' };
    }
    const e = SECTION_ENTRY_VECTORS[i] ?? { x: 0, y: 100 };
    return { opacity: 0, x: e.x, y: e.y, scale: 0.88, rotate: SECTION_ENTRY_ROTATIONS[i] ?? 3, filter: 'blur(10px)' };
  },
  visible: {
    opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
  exit: (i: number) => {
    const e = SECTION_EXIT_VECTORS[i] ?? { x: 0, y: -100, rotate: 0 };
    return {
      opacity: 0, x: e.x, y: e.y, scale: 0.72, rotate: e.rotate, filter: 'blur(12px)',
      transition: { duration: 0.30, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
    };
  },
};

export const REDUCED_MOTION_WRAPPER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const REDUCED_SECTION_ITEM = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const lpContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const lpItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const heroContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const heroItemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } },
};
