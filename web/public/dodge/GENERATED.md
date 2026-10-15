# Generated dodge-game assets

Generated 2026-10-14 with the built-in imagegen tool. No 3D runtime or external model files.

## Luban directional atlas

- File: [luban-directions.webp](luban-directions.webp) (generated as PNG, shipped as WebP)
- 1536 × 1024 RGBA, four columns and two rows: E, SE, S, SW / W, NW, N, NE.
- Identity reference: Tencent's classic 鲁班七号 splash art (not included here; see SOURCES.md).
- Recreated artwork; transparent background verified from alpha values and browser composites.
- The renderer normalizes frame heights and foot baselines and animates the steps.

### Generation prompt

Use case: stylized-concept. Asset type: production transparent directional sprite atlas for an existing 2D top-down MOBA dodge game. Reference image 1 is Tencent's classic Luban No.7 (鲁班七号, 机关造物) splash artwork, used ONLY as a character identity reference. Create an atlas containing EXACTLY EIGHT full-body views of that SAME character in a strict FOUR COLUMNS by TWO ROWS regular grid, equal sized cells. True transparent background, no background scenery, no checkerboard, no captions, no labels, no separators, no UI, no ground plane, no floor shadows. Each character centered inside its cell with generous empty transparent margins, all feet on the same baseline within each cell, all at identical scale, nothing crossing cell borders. Landscape canvas 1536 by 1024. Camera fixed elevated orthographic view looking down about 30 degrees, like a rendered MOBA game unit, never eye-level. The character is a little carved wooden mechanical puppet, oversized pale ivory-green doll face, large burgundy-purple eyes, fine segmented smile and chin seams, dark violet-black hair with two round gold-capped buns, ornate gold forehead diadem, warm amber wooden torso and articulated legs with engraved gold fittings and red-purple spring joints, red tassel, backpack mechanism, two asymmetric chunky bronze wooden weapons: cylindrical hand cannon and dragon-headed gun. Faithfully preserve the reference silhouette and materials, do not invent orange spiky hair. Rich smoothly shaded game-render texture, crisp silhouette and readable delicate details, not flat vector, not pixel art, not hand-drawn black outlines. Neutral ready-to-walk stance with bent knees, weapons carried low, full head and both feet visible. Top row left to right: facing screen RIGHT (east), facing DOWN-RIGHT (southeast), facing DOWN toward camera (south), facing DOWN-LEFT (southwest). Bottom row left to right: facing LEFT (west), facing UP-LEFT (northwest), facing UP away from camera (north; show back of head and backpack, NO face), facing UP-RIGHT (northeast). This is a coherent turntable of a single consistent character, not eight different designs. Keep lighting from upper left consistent and fine material detail, making the 2D sprites appear like small pre-rendered 3D game models.

### Transparency refinement

A second built-in imagegen edit preserved the eight views and removed background/ground shadows, retaining only the characters on true transparency. The refined output is the shipped atlas.

## Canyon scene

- File: [canyon.webp](canyon.webp) (generated as PNG, shipped as WebP)
- Generated 2D training-ground background, inspired by the canyon's visual language.
- This is a recreation, not an extracted original map. Decorative margins are outside the playable arena; water and grass inside remain walkable.

### Generation prompt

Use case: stylized-concept. Asset: a polished 2D top-down MOBA battlefield background texture, 1536x1024 landscape, no characters, no projectiles, no UI, no words. Closely evoke the visual language of Honor of Kings / 王者峡谷: cool blue shallow river, pale weathered limestone paving, gently curved green riverbanks, thick small-leaf emerald grass, warm stone carvings, moss, layered stylized painted textures, muted turquoise water, sunlit natural greenery, small traditional fantasy ruin accents. Fixed orthographic overhead game camera with only slight vertical depth, absolutely no horizon or perspective vanishing point, no cinematic camera. This is a playable dodge-training slice of the mid-lane near the river. Composition constraint: keep the ENTIRE central playable rectangle from x=100 to1436 and y=110 to995 OPEN and WALKABLE with flat paving, short grass and shallow ford water; no walls, rocks, towers, trees, buildings, pits or solid obstacles inside that rectangle. A broad diagonal softly curved shallow river/ford runs from lower-left toward upper-right and crosses a weathered diagonal lane of irregular fitted limestone slabs. There is no giant rectangular platform, no central star or rune circle, no grid, no enclosed courtyard. Stone walls, ruined ornamental pillars, rock outcrops, tall shrubs and canopy detail may appear ONLY in the outermost border outside the playable rectangle, especially top-left and top-right corners. Within the playable rectangle, vegetation is low groundcover and the river is a shallow ford that can be walked across. Give the boundary subtle natural paving seams matching the rectangle, not a bright artificial outline. Top edge has room for an interface overlay. Lighting from upper left, soft ambient occlusion under edge rocks, rich detailed but restrained contrast so colorful skill effects and a tiny player remain legible. This is an in-game map tile painted at actual gameplay camera distance, not concept art showing an entire city.

