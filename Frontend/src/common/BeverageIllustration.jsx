import React from "react";
import "./BeverageIllustration.css";
import { selectBeverageAnimation } from "./BeverageAnimationRegistry";

function BeerMug() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-beer-liquid" d="M50 33h48v49H56l-6-49Z" />
    <path className="bev-beer-foam" d="M49 34c-8-1-9-10-2-13 0-8 11-10 16-4 5-8 19-5 19 3 8-5 17 2 14 9 8 0 9 8 3 11H52c-7 0-9-4-3-6Z" />
    <path className="bev-glass-outline" d="M50 32h49v51H57L50 32Zm49 10h8c8 0 11 6 10 14l-2 12c-1 7-5 10-12 10h-4" />
    <circle className="bev-bubble bubble-one" cx="66" cy="66" r="2.3"/><circle className="bev-bubble bubble-two" cx="82" cy="55" r="1.8"/><circle className="bev-bubble bubble-three" cx="72" cy="47" r="1.4"/>
    <path className="bev-glass-shine" d="m59 42 4 32" />
  </svg>;
}

function CoffeeCup() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-steam steam-one" d="M62 38c-9-8 8-10 0-20"/><path className="bev-steam steam-two" d="M78 36c-8-8 8-11 1-21"/><path className="bev-steam steam-three" d="M94 38c-8-8 7-11 0-20"/>
    <path className="bev-coffee" d="M48 43h58l-5 34c-1 7-7 11-14 11H66c-7 0-12-4-13-11l-5-34Z" />
    <path className="bev-cup-rim" d="M46 42h62v8H47z"/><path className="bev-cup-handle" d="M106 49h8c10 0 11 20 0 22h-11"/><path className="bev-glass-shine" d="m59 55 3 21"/>
    <path className="bev-cup-saucer" d="M42 89c8 6 58 6 69 0"/>
  </svg>;
}

function MojitoGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-straw" d="m91 22 8 57"/><path className="bev-mojito-liquid" d="m50 37h54l-7 46H57l-7-46Z"/>
    <path className="bev-glass-outline" d="m48 35 8 51h45l8-51"/><circle className="bev-lime" cx="94" cy="42" r="11"/><circle className="bev-lime-center" cx="94" cy="42" r="5"/>
    <path className="bev-mint mint-one" d="M59 37c-12-13 3-18 12-8 2-12 16-9 12 2-3 7-13 11-24 6Z"/><path className="bev-mint-vein" d="m60 36 19-8"/>
    <circle className="bev-bubble bubble-one" cx="66" cy="68" r="2"/><circle className="bev-bubble bubble-two" cx="82" cy="58" r="1.7"/><circle className="bev-bubble bubble-three" cx="73" cy="48" r="1.3"/>
  </svg>;
}

function VodkaGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-vodka-liquid" d="M48 54c13-4 24 4 36 0s20-3 30 0l-6 30H54l-6-30Z"/>
    <path className="bev-glass-outline" d="m46 38 9 49h53l9-49H46Z"/><path className="bev-vodka-wave" d="M49 55c13-5 24 5 36 0s19-4 28 0"/>
    <rect className="bev-ice ice-one" x="60" y="45" width="18" height="15" rx="3" transform="rotate(-12 69 52)"/><rect className="bev-ice ice-two" x="87" y="46" width="17" height="14" rx="3" transform="rotate(13 95 53)"/>
    <path className="bev-glass-shine" d="m56 46 6 34"/>
  </svg>;
}

function JuiceGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-straw" d="m91 22 7 58"/><path className="bev-juice" d="m51 39h55l-7 45H58l-7-45Z"/>
    <path className="bev-glass-outline" d="m49 37 8 51h44l8-51"/><path className="bev-glass-shine" d="m59 46 5 33"/>
    <circle className="bev-bubble bubble-one" cx="70" cy="72" r="2.1"/><circle className="bev-bubble bubble-two" cx="88" cy="62" r="1.7"/><circle className="bev-bubble bubble-three" cx="75" cy="51" r="1.4"/>
    <path className="bev-citrus" d="M102 40a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/><path className="bev-citrus-line" d="m92 31v18m-9-9h18m-16-7 13 13m0-13L85 46"/>
  </svg>;
}

function CocktailGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-cocktail-liquid" d="M45 28h70L82 65v17h15v5H63v-5h15V65L45 28Z" />
    <path className="bev-cocktail-glass" d="M44 27h72L82 65v18h16m-35 4h38" />
    <path className="bev-cocktail-pick" d="m77 42 26-23"/><circle className="bev-cocktail-cherry" cx="104" cy="20" r="5"/><circle className="bev-cocktail-cherry-stem" cx="104" cy="20" r="2"/>
    <path className="bev-cocktail-citrus" d="M63 38a10 10 0 1 0 20 0"/><path className="bev-cocktail-citrus-line" d="M73 28v20m-10-10h20"/>
    <circle className="bev-bubble bubble-one" cx="75" cy="55" r="1.8"/><circle className="bev-bubble bubble-two" cx="87" cy="48" r="1.5"/>
  </svg>;
}

function MocktailGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-mocktail-base" d="m48 38 8 48h48l8-48H48Z"/><path className="bev-mocktail-layer" d="m50 50 4 32h52l5-32c-18 7-39-7-61 0Z"/>
    <path className="bev-glass-outline" d="m47 36 9 52h49l9-52H47Z"/><path className="bev-straw" d="m91 19 7 48"/>
    <circle className="bev-mocktail-orange" cx="103" cy="39" r="9"/><path className="bev-mocktail-orange-line" d="M103 31v16m-8-8h16"/>
    <path className="bev-mocktail-leaf" d="M59 37c-3-13 9-17 15-7 7-10 18-4 12 5-6 8-18 8-27 2Z"/>
    <circle className="bev-bubble bubble-one" cx="68" cy="71" r="2"/><circle className="bev-bubble bubble-two" cx="88" cy="61" r="1.5"/>
  </svg>;
}

function SoftDrinkCan() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-can-body" d="M57 25h46l5 9v48l-5 8H57l-5-8V34l5-9Z"/><path className="bev-can-top" d="M57 25c2-5 44-5 46 0l-1 5H58l-1-5Z"/>
    <path className="bev-can-bottom" d="M57 86c2 5 44 5 46 0"/><path className="bev-can-tab" d="M73 27c0-3 13-3 14 0l-2 3h-10l-2-3Z"/>
    <path className="bev-can-label" d="M58 43h44v24H58z"/><path className="bev-can-swoosh" d="M60 61c12-17 28 12 41-8"/>
    <circle className="bev-fizz fizz-one" cx="47" cy="70" r="2"/><circle className="bev-fizz fizz-two" cx="111" cy="59" r="2.2"/><circle className="bev-fizz fizz-three" cx="48" cy="43" r="1.5"/><circle className="bev-fizz fizz-four" cx="113" cy="35" r="1.4"/>
  </svg>;
}

function WineGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-wine-liquid" d="M54 28h52c0 22-8 36-26 39-18-3-26-17-26-39Z"/><path className="bev-wine-glass" d="M52 26h56c0 25-8 40-28 44-20-4-28-19-28-44Zm28 44v15m-18 2h36"/>
    <path className="bev-glass-shine" d="M60 33c1 12 4 18 9 22"/><circle className="bev-wine-glint" cx="97" cy="39" r="2"/>
  </svg>;
}

function SpiritsTumbler() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-spirit-liquid" d="M49 56h62l-6 30H55l-6-30Z"/><path className="bev-spirit-glass" d="m46 35 9 53h50l9-53"/><path className="bev-spirit-wave" d="M50 57c13-4 23 4 35 0s18-3 25 0"/>
    <rect className="bev-spirit-ice ice-one" x="61" y="45" width="18" height="15" rx="3" transform="rotate(-12 70 52)"/><rect className="bev-spirit-ice ice-two" x="86" y="46" width="16" height="14" rx="3" transform="rotate(10 94 53)"/>
    <path className="bev-glass-shine" d="m56 43 5 37"/>
  </svg>;
}

function WaterGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-water-liquid" d="m51 40h58l-7 45H58l-7-45Z"/><path className="bev-water-glass" d="m49 37 8 51h46l8-51"/>
    <path className="bev-water-ripple ripple-one" d="M63 57c9-4 23-4 34 0"/><path className="bev-water-ripple ripple-two" d="M67 66c7-3 18-3 26 0"/>
    <path className="bev-water-drop" d="M79 24c-5 7-7 10-7 13a7 7 0 0 0 14 0c0-3-2-6-7-13Z"/><path className="bev-glass-shine" d="m59 47 5 33"/>
  </svg>;
}

function OtherBeverageGlass() {
  return <svg viewBox="0 0 160 100" focusable="false">
    <path className="bev-other-liquid" d="m51 39h56l-7 46H58l-7-46Z"/><path className="bev-glass-outline" d="m49 36 8 52h45l8-52"/>
    <path className="bev-other-straw" d="m91 18 8 48"/><circle className="bev-bubble bubble-one" cx="69" cy="71" r="2"/><circle className="bev-bubble bubble-two" cx="87" cy="60" r="1.7"/><circle className="bev-bubble bubble-three" cx="75" cy="49" r="1.3"/>
    <path className="bev-other-star" d="m64 28 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Zm35 10 1.5 3.5L104 43l-3.5 1.5L99 48l-1.5-3.5L94 43l3.5-1.5L99 38Z"/>
  </svg>;
}

const illustrations = {
  beer: BeerMug,
  "hot-drink": CoffeeCup,
  mojito: MojitoGlass,
  cocktail: CocktailGlass,
  mocktail: MocktailGlass,
  "soft-drink": SoftDrinkCan,
  juice: JuiceGlass,
  wine: WineGlass,
  vodka: VodkaGlass,
  spirits: SpiritsTumbler,
  water: WaterGlass,
  other: OtherBeverageGlass,
};

export function BeverageIllustration({ item }) {
  const selected = selectBeverageAnimation(item);
  const kind = ({
    "cold-coffee": "hot-drink", coffee: "hot-drink", tea: "hot-drink", "hot-chocolate": "hot-drink",
    "vodka-gin": "vodka", whiskey: "spirits", "rum-brandy": "spirits", shot: "spirits",
    "iced-tea": "juice", lemonade: "juice", dairy: "juice", coconut: "juice",
    milkshake: "juice", smoothie: "juice", energy: "soft-drink", sports: "soft-drink",
    slushie: "soft-drink", generic: "other",
  })[selected] || selected;
  const Illustration = illustrations[kind] || OtherBeverageGlass;

  return <div className={`beverage-illustration beverage-illustration-${kind} beverage-animation-${selected}`} aria-hidden="true">
    <Illustration />
  </div>;
}
