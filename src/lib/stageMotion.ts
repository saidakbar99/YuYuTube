/**
 * YouTube-style grow/shrink between the inline player and the CSS fullscreen layer.
 *
 * FLIP: record where the stage is on screen, flip the classes, then animate the stage from the
 * recorded pose into its new one. The video is used as the anchor (not the box), because the
 * box changes shape — 4:3 crop inline, full screen with side bars when fullscreen.
 */

const DURATION_MS = 320;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

export type Pose = {
  cx: number; // on-screen centre
  cy: number;
  rotation: number; // degrees, from the stage's own CSS transform
  scale: number;
  tx: number; // translation part of that transform
  ty: number;
  width: number; // untransformed box
  height: number;
  video: number; // height of the 16:9 picture inside the box
};

export function capturePose(stage: HTMLElement): Pose {
  const rect = stage.getBoundingClientRect();
  const transform = getComputedStyle(stage).transform;
  const m = transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
  const frame = stage.querySelector("iframe");
  const frameW = frame?.offsetWidth || stage.offsetWidth;
  const frameH = frame?.offsetHeight || stage.offsetHeight;

  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    rotation: (Math.atan2(m.b, m.a) * 180) / Math.PI,
    scale: Math.hypot(m.a, m.b),
    tx: m.e,
    ty: m.f,
    width: stage.offsetWidth,
    height: stage.offsetHeight,
    video: Math.min(frameH, (frameW * 9) / 16),
  };
}

export function animateStage(stage: HTMLElement, first: Pose) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  for (const running of stage.getAnimations()) running.cancel();
  const last = capturePose(stage);
  if (!first.video || !last.video) return;

  // Centre of the untransformed box: the CSS transform moves the centre by exactly (tx, ty).
  const boxX = last.cx - last.tx;
  const boxY = last.cy - last.ty;
  const startScale = (first.video * first.scale) / last.video;

  // Start clipped to the window the old pose showed. Negative insets are valid and matter on the way
  // back: the inline box is narrower than the fullscreen picture, which would otherwise lose its ends
  // on the first frame.
  const clipX = (last.width - (first.width * first.scale) / startScale) / 2;
  const clipY = (last.height - (first.height * first.scale) / startScale) / 2;

  // Let the iframe spill past the box so clip-path alone decides what shows. Never while the paused
  // cover is up: outside the cover is YouTube's own paused UI.
  const reveal = stage.dataset.covered !== "true";
  if (reveal) stage.style.overflow = "visible";

  // Lift the player above the bottom nav while it shrinks back over the page.
  const host = stage.parentElement;
  if (host) host.style.zIndex = "45";

  const animation = stage.animate(
    [
      {
        transform: `translate(${first.cx - boxX}px, ${first.cy - boxY}px) rotate(${first.rotation}deg) scale(${startScale})`,
        clipPath: `inset(${clipY}px ${clipX}px)`,
      },
      {
        transform: `translate(${last.tx}px, ${last.ty}px) rotate(${last.rotation}deg) scale(${last.scale})`,
        clipPath: "inset(0px 0px)",
      },
    ],
    { duration: DURATION_MS, easing: EASING },
  );

  const restore = () => {
    stage.style.overflow = "";
    if (host) host.style.zIndex = "";
  };
  animation.addEventListener("finish", restore);
  animation.addEventListener("cancel", restore);
}
