# Teddy V22 — Side-profile facial anatomy and actual 3D muzzle integration

Base `main`: `877db4c68a6d6cda797820fb9cc8b4f63ed1a51e` (V21 independently closed anatomical pelts already integrated, no open PR).

## Real user-screenshot defects (evidence vs inference)
User-provided side/three-quarter image shows a forehead and skull occupying a broad plausible volume, then a cream oval *stuck on the front*; from the side, the muzzle is a spherical button with no graded transition to the cheek/jaw. Nose and narrow mouth sit too far forward of the base facial surface. Blush ovals remain as independent beads and the head's underside reads as a sharp break over the neck. These observations are supported by the screenshot. Material thickness, depth ordering and shader are supported by runtime source; human aesthetic assessment remains a distinct gate.

## Backward-designed desired geometry
A teddy-bear skull should carry a **soft convex rostrum**: broad posterior cheek/jaw support, narrowing forward to the nose, slight forward nose tip, and lower mouth centered on/near the snout skin. The color of the beige muzzle is **a material region on the same head surface**, not a stack of independent cream ellipsoids. From a three-quarter view, the tip rolls continuously back to the lateral cheek without a dark contour line at the base of an artificial ball. Preserve V17 jaw and voice micro-motion and V21 independent closed head/arm/trunk pelts.

## Semantic runtime slices
1. **Actual head SDF**: insert `snoutRoot` and left/right `jawFill` as three smooth implicit **fur** volumes in the V21 **head region only**. No extra membrane, no globally merged arms. Their bounds overlap the skull and support the lateral profile of snout and mandible. The existing six anatomical pelts remain individually closed, with no arm→trunk triangles.
2. **Anatomy of nose/mouth and fallback**: reduce stand-alone muzzle pad/lobes and nose bridge; retreat nose stem, lip, jaw mount; retain independent small nose and articulated lips; reduce 2D fallback muzzle sizes to match proportions.
3. **Material belongs to geometry**: allocate one bind-pose `aFace` vertex stream with **head-local coordinates** only on head region. The fragment shader samples a smooth symmetric elliptical cream-blaze gradient, changing `plushPigment` without creating transparent overlays or reuploading topology. Suppress `muzzlePad`, `muzzleL/R`, `noseBridge`, `cheekDimpleL/R` draws **only when** the fused V21 body actually drew. Legacy/fallback geometric detail still exists.
4. **Existing V17 motion**: expand locally supported snout skin in the same morph pass in response to voice; no new facial rig.
5. **Physical and browser proof**: verify actual face SDF fills points formerly outside cheek/jaw, head-local material coordinates touch only head vertices, 6 region topology stays closed, nose/mouth overhang bounded, 3 named motions remain finite. Chromium must prove the face geometry receipt and archive neutral plus an angled head screenshot; mutation seed probes cover material-mask boundedness and symmetry.

## Atomic measurable DoD and falsifiers
| ID | Predicate on real Teddy | Threshold |
|---|---|---|
| F22-01 | Face adds tissue to side/front jaw in actual SDF | real sample delta < −0.008, at least 2 former air samples become solid |
| F22-02 | Snout integrates inside head V21 pelt, no new loose mesh component | six closed regions, zero open/nonmanifold edges |
| F22-03 | Forward profile correct | snout front ≥head shell front+0.075, ≤head shell front+0.19 |
| F22-04 | Nose remains visible but not a long projecting disk | nose overhang (tip-front vs snout-front) in (0.015,0.11) world units |
| F22-05 | Mouth belongs to muzzle | direct lip front offset <0.06 vs snout-front |
| F22-06 | Blush / cream stacks not separately shown in WebGL2 V21 | zero separate muzzlePad/L/R/noseBridge/dimple draws when welded; fallback preserved |
| F22-07 | Bilateral skin pigment | left/right mirrored mask diff <1e-9, nearest step under .018 |
| F22-08 | Pigment cannot paint torso/arms | zero non-head color coordinates, >65 real head vertices in cream mask |
| F22-09 | Voice/motions intact | 32 V17 motifs maintained, Greet/Dance/Lightning Bolt valid |
| F22-10 | Runtime genuinely supplies new GPU attribute | `aFace` static bind stream, no per-frame rest-coordinate upload |
| F22-11 | One million preseeded local material-coordinate mutation checks | 1,000,000 probes, zero violations |
| F22-12 | CI and production WebGL2 | real head receipt, CSP, changed compositor pixels and screenshot archive, inherited V16–V21 suites green on exact PR SHA |

## Deliberate boundary
This is **actual 3D** profile anatomy with gradient-colored face and a shallower nose, not a generated mock image or editable design only. CI cannot prove subjective cuteness or naturalness over all camera azimuths; Chrome captures an additional angled-head frame, but full 360° human aesthetic approval remains open. The construction does not solve global inverse kinematics, foot contacts, every self-intersection or photographic subsurface scattering. V21 anatomy regions intentionally remain independently closed. No claim of global one-connected-body topology.
