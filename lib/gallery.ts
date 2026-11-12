// Every photo on the site, split by the section that shows it. Each photo
// appears in exactly one place, and its file lives in the matching folder:
//
//   /public/photos/auto-carousel/  curved band of team photos, after "About"  
//   /public/photos/carousel/       match-day slideshow, after "Book a slot"
//   /public/photos/gallery/        the main gallery grid
//
// Files are 2000px-wide WebP made from the camera originals in /public/images
// (git-ignored) and named after what they show, which helps image search. To
// add a photo, put it in the right folder and add an entry to that list.
// `blur` is a tiny preview shown while the photo loads.

export type Photo = {
  src: string;
  width: number;
  height: number;
  alt: string;
  blur: `data:image/${string}`;
};

export type GalleryCategory = "field" | "sidelines" | "celebrations" | "ceremony";

export type GalleryPhoto = Photo & { category: GalleryCategory };

export const galleryCategories: { id: GalleryCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "field", label: "On the field" },
  { id: "sidelines", label: "Off the field" },
  { id: "celebrations", label: "Celebrations" },
  { id: "ceremony", label: "Team & awards" },
];

export const categoryLabel = Object.fromEntries(
  galleryCategories.map((c) => [c.id, c.label]),
) as Record<GalleryCategory, string>;

// Team photos for the curved auto-carousel. Landscape only: the wide tiles
// would crop portrait shots badly.
export const autoCarouselPhotos: Photo[] = [
  {
    src: "/photos/auto-carousel/champions-celebrating-in-front-of-the-ccs-academy-backdrop.webp",
    width: 2000,
    height: 1335,
    alt: "Champions celebrating in front of the CCS Academy backdrop",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAAAwAgCdASoMAAgAAsBMJbACdGuAAsOyXrUQAAD+530NcvKIuky/lav2HzL5di4FOgja2CoBEkr9Le3TwoujhH6lNAAAAA==",
  },
  {
    src: "/photos/auto-carousel/squad-photo-after-the-tournament-final.webp",
    width: 2000,
    height: 1335,
    alt: "Squad photo after the tournament final",
    blur: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAAAQAgCdASoMAAgAA4BaJbACdAYpvjCSn1doAP6x37TaB+W+eywy1LT0pVKtS5ZY4tghkDf8Po0vWZS2YYzWb/De4i8I1RLftgi1AAAA",
  },
  {
    src: "/photos/auto-carousel/team-in-green-kits-lined-up-on-the-outfield.webp",
    width: 2000,
    height: 1335,
    alt: "Team in green kits lined up on the outfield",
    blur: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAQCdASoMAAgAAsBMJaACdAD0gHbX2QAA/vCNmrxrGUF0xTGsldpunvix+BwLuz67RHtnEYAM+6HrpcXqsYndh9VuNnEAAAA=",
  },
  {
    src: "/photos/auto-carousel/team-and-coaches-together-on-stage.webp",
    width: 2000,
    height: 1335,
    alt: "Team and coaches together on stage",
    blur: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAADQAQCdASoMAAgAA4BaJagCdAELMSQg4AD+r/HJLiYZGKBFGk904HbLPS8MSR9JHfiS68x0quyydzydqBgbySWw4dNnjKykNPr5QAAA",
  },
  {
    src: "/photos/auto-carousel/match-officials-at-the-ccs-academy-tournament-stage.webp",
    width: 2000,
    height: 1335,
    alt: "Match officials at the CCS Academy tournament stage",
    blur: "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADwAQCdASoMAAgAAsBMJbACdADdhwYJeAAA/vH+BoF2dmd+nP8ifWWvWDWPxNqnoIW8HEp5dpcQOQDp0iK2D8N3lkWEU4ZDutVZADVQu6In6kn4AAA=",
  },
  {
    src: "/photos/auto-carousel/full-squad-lined-up-for-the-team-photo.webp",
    width: 2000,
    height: 1335,
    alt: "Full squad lined up for the team photo",
    blur: "data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAAAQAgCdASoMAAgAA4BaJbACdGuAApQuVphgAP6T1AmoQ0xuUpd6NhG2BPg0ofvqillTkUTJakts3z7FJiKt3EsQwyZv2TLiNy0U35f2Qsz0QAAA",
  },
  {
    src: "/photos/auto-carousel/green-team-standing-with-their-names-on-their-backs.webp",
    width: 2000,
    height: 1335,
    alt: "Green team standing with their names on their backs",
    blur: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAAAQAgCdASoMAAgAAsBMJZgCdAEPBYR1e8wAAP7wTXog312OkZ93VcEz4o9ga1ch5NX4mQ6UCkrPei6zURnUOjkh5LDYLOdcAAA=",
  },
  {
    src: "/photos/auto-carousel/teams-posing-together-at-the-ceremony.webp",
    width: 2000,
    height: 1335,
    alt: "Teams posing together at the ceremony",
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADwAQCdASoMAAgAA4BaJaACdAYtBBR0uAAA/ta+obdcD6PWSJzDH2Ro+ovOmvhYVQAPR/BVw6BdmexD8JG5sM6A9eQ4fTZ4yspDT2Y4AAA=",
  },
  {
    src: "/photos/auto-carousel/group-photo-in-front-of-the-ccs-academy-backdrop.webp",
    width: 2000,
    height: 1335,
    alt: "Group photo in front of the CCS Academy backdrop",
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoMAAgAA4BaJagCdAD0Vq/O8AD+xvQOJDsJPQ17lC1dVqxpfr/2mrCJf9tLLxlatCSRNb4jzP/HSdBjWdUt7uLYEu33bbAAAAA=",
  },
  {
    src: "/photos/auto-carousel/players-and-organisers-in-a-group-photo.webp",
    width: 2000,
    height: 1335,
    alt: "Players and organisers in a group photo",
    blur: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAABQAgCdASoMAAgAA4BaJagCdGuADz3tVLDuCgAA/rU20+hmFeldANDOGgjTzP81ZnphcMLrhL4012EC/E8n5A2MOnnPIclIUXofIAAA",
  },
  {
    src: "/photos/auto-carousel/team-in-blue-kits-posing-for-their-photo.webp",
    width: 2000,
    height: 1335,
    alt: "Team in blue kits posing for their photo",
    blur: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAQCdASoMAAgAA4BaJbACdGuAApVcBtAA/sUcKO4xMaBkYjDqHecX4uAZnQLog6V9a0X3stU8Ez5AgbLNtJ8LkBLtX3GKAAA=",
  },
];

// The match-day slideshow, in the order it plays. Landscape only, since the
// slideshow frame is wide.
export const carouselPhotos: GalleryPhoto[] = [
  {
    src: "/photos/carousel/match-in-progress-on-the-turf-pitch.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Match in progress on the turf pitch",
    blur: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADQAQCdASoMAAgAA4BaJagCdAEPOZ4EAAD+1Q1v0o2IJTjfL8NTNTq5b+7W9ew+q3G8SQAA",
  },
  {
    src: "/photos/carousel/view-from-behind-the-stumps-as-the-bowler-runs-in.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "View from behind the stumps as the bowler runs in",
    blur: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAACwAQCdASoMAAgAAsBMJQBOgBtnz+mwAP6aJdoRSHtdt1nLROjG+k+SEMji/+94vcSmPfVJHOT9H0qDwAA=",
  },
  {
    src: "/photos/carousel/bowler-delivering-to-a-batter-on-the-full-size-ground.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Bowler delivering to a batter on the full-size ground",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAACQAQCdASoMAAgAAsBMJaACdADb1QAA/rd3tlIOm49MEhQnLicFEqoepCza9N4Ka+1473b+LjU4Zerwyt9iV7epXlcAAA==",
  },
  {
    src: "/photos/carousel/fielding-side-spread-across-the-ground.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Fielding side spread across the ground",
    blur: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADQAQCdASoMAAgAA4BaJagCdAEOPPC9AAD+1RdcPWkZkxTkmtElkI6vM+95R2xEPHSgKwCDCMWrCSexK9vUryuAAAA=",
  },
  {
    src: "/photos/carousel/bowler-releasing-the-ball-to-a-waiting-batter.webp",
    width: 2000,
    height: 1335,
    category: "field",
    alt: "Bowler releasing the ball to a waiting batter",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADQAQCdASoMAAgAAsBMJYgCdADdK4qCYAD+yXdAryA5XUvLlxlZSpRsXoBNB1x3nk6FSwfruNDaHhj0WxDdV7IFmwgAAA==",
  },
  {
    src: "/photos/carousel/spinner-delivering-the-ball-on-the-main-pitch.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Spinner delivering the ball on the main pitch",
    blur: "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAACwAQCdASoMAAgAAsBMJZgCdAELSB4AAP7XPWxLBijovR4rgUrBLDIkz7uFAxrogJqeKBrfDR5/4nA2cGqsgAAA",
  },
  {
    src: "/photos/carousel/batters-running-between-the-wickets.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Batters running between the wickets",
    blur: "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoMAAgAA4BaJagCdAELVc9NIAD+yPS2duFa7wOf1/brKP4K1zf9oophGIdG1cnEwFnmEgAA",
  },
  {
    src: "/photos/carousel/confetti-falling-on-the-winning-team.webp",
    width: 2000,
    height: 1335,
    category: "ceremony",
    alt: "Confetti falling on the winning team",
    blur: "data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAAAQAgCdASoMAAgAA4BaJbACdAD0sRD8EO8AAP6zsgjYHg74Fp2DiBQK4zBHT2crdTtwioiJvZJb3QrX6suc6uxu4CHAMsbXyFihhIAz3fsLIPAA",
  },
];

// The main gallery grid.
export const galleryPhotos: GalleryPhoto[] = [
  {
    src: "/photos/gallery/batters-walking-out-to-the-middle.webp",
    width: 2000,
    height: 2996,
    category: "field",
    alt: "Batters walking out to the middle",
    blur: "data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAACQAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JQBdgBDtJB89oeijAAP7qdsnWYM9OKJu0CsfOSGk3PR7Xu3RNyPVGGyVbI9oDr0Kd4jmum8xuELPVNqMk0Y/1Ud6gAA==",
  },
  {
    src: "/photos/gallery/bowler-waiting-at-the-top-of-his-run-up.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Bowler waiting at the top of his run-up",
    blur: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAAAQAgCdASoMAAgAA4BaJaACdH8AGCDosaIAAP6yMDPECxNECchsA2HSwufYIRsqpr1qMN7fyIcf0QfJIAA=",
  },
  {
    src: "/photos/gallery/batter-taking-guard-at-the-crease.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter taking guard at the crease",
    blur: "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAwCdASoMABIAPu1iqU2ppaOsMAgBgB2JQBdgA2jNIQAA/sphS/TypQZEqDqj3iac44FJ3hzqfxr6/VU4Fg3N3fAtmB1SAOP8J//4nKHlS2sOAAA=",
  },
  {
    src: "/photos/gallery/wicketkeeper-crouched-behind-the-stumps.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Wicketkeeper crouched behind the stumps",
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAABwAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JQAALle8ljRb32AAA/vHbyiL3rEw+PHA8cboR5QWNH7Y3oGQsSDA/qU8Id8teunh4fgwgAAA=",
  },
  {
    src: "/photos/gallery/bowler-in-his-delivery-stride.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Bowler in his delivery stride",
    blur: "data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAADQAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JYgC7AB6WbY3DLvZGD4AA/sdlV4ksCffGCGlR+eVyt8ySUiXma/xFD8nzIDVAgG7CiH+uB0QhWSrEZ5UBUWth/91y9+inX7L/RAAA",
  },
  {
    src: "/photos/gallery/batter-settled-in-his-stance.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Batter settled in his stance",
    blur: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADQAQCdASoMAAgAA4BaJYwCdADcSBOBwAD417P3wyzfynvv+nYDOr3mQszgwQTmKQniFCe66KzetB1iFzAAAA==",
  },
  {
    src: "/photos/gallery/batter-ready-to-face-the-next-ball.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter ready to face the next ball",
    blur: "data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAACQAwCdASoMABIAPu1iqU2ppaQiMAgBMB2JQAALd3/bfZ8F+joAAP7J5eHAJeo1N4F95BfCEfvBb1FsQUd/s4wGZ4whN9jfRAJpUAePKcFbt0khwWhGRS5JOhJz8ynlcAA=",
  },
  {
    src: "/photos/gallery/batter-watching-the-bowler-run-in.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter watching the bowler run in",
    blur: "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAADwAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JQBdgBH/5jwhMvQ48QlQgAP7J5eIcwmU69imlFpMikfuxRA2etmcBkFCGWdXVU+6APNuAwWRlBDAQbSFmvgLNlP1ZByAA",
  },
  {
    src: "/photos/gallery/batter-adjusting-his-gloves-between-deliveries.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter adjusting his gloves between deliveries",
    blur: "data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAACQAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JQBhQBDwoc+uJgSqgAP7rakafX+Bm7cXYLtbeAc7i8vS/lNXdFbQwAYy7kWbzp82hF5b2+It2Ir76Rr7rx+7BAAA=",
  },
  {
    src: "/photos/gallery/batter-walking-out-with-his-bat.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter walking out with his bat",
    blur: "data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAACQAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JZgCdMoADTIjGNp0gAP7T6XOf1v/y7AqzrRa/3m5HDSDKq7fyxnLhz0agNyh2l58jE1DAEVkiOSf3+3Lp00w14FGWBATMeyAAAA==",
  },
  {
    src: "/photos/gallery/batting-partners-meeting-mid-pitch.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batting partners meeting mid-pitch",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAAAwAwCdASoMABIAPu1iqU2ppaOmMAgBMB2JYgC7ABsyWt4AAPxyFZd7pLhX6lhw+d+2z3rmSgrjrxm1fFT3Qnnt9ItAAA==",
  },
  {
    src: "/photos/gallery/batter-raising-his-bat-to-the-dressing-room.webp",
    width: 2000,
    height: 3000,
    category: "field",
    alt: "Batter raising his bat to the dressing room",
    blur: "data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAABQAwCdASoMABIAPu1iqU2ppaOiMAgBMB2JYgAAXKVZcaBgoAD+xgO1edATx9qUZGcjSvz4OHc0CIs54ShIKhiLQaIlZNibzjTlP+qkE+VZE7IYi8TI/oLRCRcAAA==",
  },
  {
    src: "/photos/gallery/players-celebrating-a-big-moment-in-the-match.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Players celebrating a big moment in the match",
    blur: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAACwAQCdASoMAAgAA4BaJagCdAEOO27gAP7VFnUWUksZAYoZuShrkLvNhEMithcJeTERt/fJ8b3XtgvQQcgAAA==",
  },
  {
    src: "/photos/gallery/captain-celebrating-with-arms-wide-open.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Captain celebrating with arms wide open",
    blur: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADQAQCdASoMAAgAA4BaJagCdAEO7M5dQAD+1Ramnj/cdUVoNnmNHEk3AbjwEiVXxjU7RDCMWq/Iscrzp2JAAA==",
  },
  {
    src: "/photos/gallery/players-shaking-hands-after-the-match.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Players shaking hands after the match",
    blur: "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAADwAQCdASoMAAgAA4BaJagCdAD0ZsSz9cAA/fBh7CuO0PpuYJ8SnzhIu6nACREUEQAAVW9j+cYlYbcXraqO3J5kjuTMHAAA",
  },
  {
    src: "/photos/gallery/winners-celebrating-under-a-shower-of-confetti.webp",
    width: 2000,
    height: 1335,
    category: "ceremony",
    alt: "Winners celebrating under a shower of confetti",
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoMAAgAA4BaJbACdAELG2oQAAD+lEp6jDjkQKuqyy/Ssvmseq4OYgkfpxKDBN8cWaADJ76JkK5YMFkceLkbuWG2mml0HmUwAAA=",
  },
  {
    src: "/photos/gallery/award-moment-at-the-presentation-ceremony.webp",
    width: 2000,
    height: 1335,
    category: "ceremony",
    alt: "Award moment at the presentation ceremony",
    blur: "data:image/webp;base64,UklGRl4AAABXRUJQVlA4IFIAAACQAQCdASoMAAgAA4BaJbACdACCOhAA/uu7Xs93o7xKi3vyN53OxFMwbE+072fJok29c4nsw7Ldg6cegaysB0RIwMy9FMr4gQN0ACoUN33lIQgA",
  },
  {
    src: "/photos/gallery/blue-team-celebrating-at-the-presentation-stage.webp",
    width: 2000,
    height: 1335,
    category: "ceremony",
    alt: "Blue team celebrating at the presentation stage",
    blur: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAAAQAgCdASoMAAgAA4BaJbACdGuAAobPAZRAAP7FHP4QAmhDa6U5W3w4JSLflwGKRsaLKIZ2EkyLHzmPfAon2P3JJkt5778AAAA=",
  },
  {
    src: "/photos/gallery/bowler-in-his-follow-through-on-the-academy-ground.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Bowler in his follow-through on the academy ground",
    blur: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADQAQCdASoMAAgAAsBMJbACdAEVule4AAD+06QgVBNtHNs6en+1C74LDWYjNQ+k+ipeWpe67eMCStWjgAA=",
  },
  {
    src: "/photos/gallery/players-watching-the-match-from-the-pavilion-tent.webp",
    width: 2000,
    height: 1333,
    category: "sidelines",
    alt: "Players watching the match from the pavilion tent",
    blur: "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAADwAQCdASoMAAgAAsBMJbACdAELhdIUnYAA/u3qLsLaJ8sazI0cw63RXGe5X8bxGFZsM/x4S/N409qIS47aAAAA",
  },
  {
    src: "/photos/gallery/teammates-cheering-from-the-tent-as-a-fielder-chases-the-ball.webp",
    width: 2000,
    height: 1333,
    category: "sidelines",
    alt: "Teammates cheering from the tent as a fielder chases the ball",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoMAAgAAsBMJbACdAELZHlVCgAA/uuLAtY/QiDnXnA9pQ9+xadeV/WTLaZNk8vcvnYmDVf6tJp5N7ILSlgAAA==",
  },
  {
    src: "/photos/gallery/batter-and-wicketkeeper-at-the-crease-between-overs.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Batter and wicketkeeper at the crease between overs",
    blur: "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAADQAQCdASoMAAgAAsBMJagCdADcRR7gAAD+j5GSFGwzL3ErCLoeggX2vvRBc6sFUNlupXTsF6YV/rfDR5/7hoabjeNPAAAA",
  },
  {
    src: "/photos/gallery/team-and-supporters-watching-from-the-sideline-tent.webp",
    width: 2000,
    height: 1335,
    category: "sidelines",
    alt: "Team and supporters watching from the sideline tent",
    blur: "data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAwAgCdASoMAAgAAsBMJaACdAYpvn1Jt90gAAD+aFVx8d6WOTNpCEr0a4aZXKjTvtxGntyLCPa7px2kjRJnoWntk8nT6tbiEMPdfg+P5FRkNCrTO2gAAA==",
  },
  {
    src: "/photos/gallery/players-relaxing-in-the-pavilion-between-matches.webp",
    width: 2000,
    height: 1333,
    category: "sidelines",
    alt: "Players relaxing in the pavilion between matches",
    blur: "data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAAAwAgCdASoMAAgAAsBMJagCdG1/DxkNJY9UAAD89YuBo5Pe3UBuz1RWaX6oIjmt+mf4feES5tsd8KPKM1NerVDd+B7r/qfBVz10rdxnA1MC7bLLk5AAAA==",
  },
  {
    src: "/photos/gallery/two-young-players-waiting-in-the-pavilion-tent.webp",
    width: 2000,
    height: 1335,
    category: "sidelines",
    alt: "Two young players waiting in the pavilion tent",
    blur: "data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAAAQAgCdASoMAAgAAsBMJbACdAELZVWHYXkAAP7rqJDsNmuqbqwbJs87P3oyuAMqWfmAzBn02GZoZEDWHcIKD5Cx4MLgdx1vUDbf1LloKJ4CmXdHKvf+HiMAAAA=",
  },
  {
    src: "/photos/gallery/team-in-blue-kits-watching-from-the-sideline-tent.webp",
    width: 2000,
    height: 1335,
    category: "sidelines",
    alt: "Team in blue kits watching from the sideline tent",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADQAQCdASoMAAgAAsBMJbACdAEOzDgozAD+7e70QUjHiOo/tWVa9y8wVkQUscngq8Z4iLPIUWpm6pFPnaBepWEN2CAAAA==",
  },
  {
    src: "/photos/gallery/batter-walking-out-past-the-pavilion-to-bat.webp",
    width: 2000,
    height: 1335,
    category: "field",
    alt: "Batter walking out past the pavilion to bat",
    blur: "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADwAQCdASoMAAgAAsBMJbACdADz4SxH/gAA/sktlrZhtlM030jw6kuczXq4eHCzyPW8D9yc2b3cv7i5x6OqOZ8RjTbKRNt9dgAAAA==",
  },
  {
    src: "/photos/gallery/batter-in-his-stance-with-the-keeper-behind-him.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Batter in his stance with the keeper behind him",
    blur: "data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAACwAQCdASoMAAgAAsBMJaACdADbLR8AAPlA95BtXnewL4FvtOjI5JG5VsrQlqH5mJJJaPpzvGsvv+IuQvREvNAA",
  },
  {
    src: "/photos/gallery/batter-holding-his-bat-high-after-his-innings.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Batter holding his bat high after his innings",
    blur: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAACwAQCdASoMAAgAAsBMJbACdADx5DDAAP5gGJiU5aP6IS329+zr0tzLxD0tAfTFHqGpydykm2PvIvnjrunhRfIlbeEgAA==",
  },
  {
    src: "/photos/gallery/young-batter-walking-back-to-the-pavilion.webp",
    width: 2000,
    height: 1333,
    category: "field",
    alt: "Young batter walking back to the pavilion",
    blur: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAACwAQCdASoMAAgAAsBMJbACdADx9FgAAP7GAnqQx13PWcvg5nxw5tE4xg3DlIQofdm70ND4Nfznatj8AAAAAA==",
  },
  {
    src: "/photos/gallery/winning-team-celebrating-in-confetti-on-stage.webp",
    width: 2000,
    height: 1335,
    category: "ceremony",
    alt: "Winning team celebrating in confetti on stage",
    blur: "data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAADwAQCdASoMAAgAAsBMJbACdAD0DB76QwAA/u3uMbWQbCokGS6G3rA3avq1GbyHHAjEuBcwqlAdkkmcpKVCPtLVDEAHvqw1+ztjFBuCGgAAAA==",
  },
  {
    src: "/photos/gallery/batter-walking-off-the-field-after-his-knock.webp",
    width: 2000,
    height: 1335,
    category: "field",
    alt: "Batter walking off the field after his knock",
    blur: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAACwAQCdASoMAAgAAsBMJbACdAEOLUgAAPjH/p19emVqKHUMOePDgS7jAxwahDisJYJ1nZXf2nxA8qeuHd0DnK4AAAA=",
  },
  {
    src: "/photos/gallery/batter-stepping-onto-the-ground-from-the-pavilion.webp",
    width: 2000,
    height: 1335,
    category: "field",
    alt: "Batter stepping onto the ground from the pavilion",
    blur: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADwAQCdASoMAAgAAsBMJbACdAEO6oKmjwAA/mAq6MPD+13jjOFK+64cDKUnuRgJxOEP7G9g5VEn4NfznSU0/QuQAAA=",
  },
  {
    src: "/photos/gallery/batter-adjusting-his-gloves-before-taking-guard.webp",
    width: 2000,
    height: 1335,
    category: "field",
    alt: "Batter adjusting his gloves before taking guard",
    blur: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoMAAgAAsBMJagCdAEQ/WADlIAA/tUXaTkP4Na2Ki78HrpJ3pv8Q/DxfZ7ElXdq0+AQsWoklAAAAA==",
  },
  {
    src: "/photos/gallery/blue-team-celebrating-as-their-batter-walks-off.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Blue team celebrating as their batter walks off",
    blur: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAADQAQCdASoMAAgAAsBMJbACdAD57YJKAAD2rWnRUxk9CeM+rVvHy4RZs9XfHjO92aniTxZT5kDLE33GGl95HjU/EXIZaIrFSilJAAAA",
  },
  {
    src: "/photos/gallery/blue-team-high-fiving-after-the-win.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Blue team high-fiving after the win",
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAAAQAgCdASoMAAgAAsBMJZgCdAELW0CCmPMAAP7Hg9+M1C+zUJESapE8cN3bEwMJXD3XEGrjPwNvVlroVfaXtqHwjmQu+OMRAlqz7FgAAAA=",
  },
  {
    src: "/photos/gallery/blue-team-walking-off-the-ground-together-after-the-win.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Blue team walking off the ground together after the win",
    blur: "data:image/webp;base64,UklGRlwAAABXRUJQVlA4IFAAAAAQAgCdASoMAAgAAsBMJbACdAYs3uJ02+wgAP7olH/vhg2Li/DFFXIXD6On8QEWhBc/qB6pm7Btql0ALiAwxNwkE7EOsQfPot6o+KUjjX0AAA==",
  },
  {
    src: "/photos/gallery/players-celebrating-in-a-shower-of-confetti.webp",
    width: 2000,
    height: 1335,
    category: "celebrations",
    alt: "Players celebrating in a shower of confetti",
    blur: "data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAAAQAgCdASoMAAgAAsBMJZgCdAYtLbLN7D0AAP6YXnQHggsAzvL1tBrMeXc+cOv+p78vV0YbIioGekZcSoim03XFbwemR+OQnpPkN0vQBVrytKaUI7jQZHQIOAA=",
  },
];

export const allPhotos: Photo[] = [
  ...autoCarouselPhotos,
  ...carouselPhotos,
  ...galleryPhotos,
];
