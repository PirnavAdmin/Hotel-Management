import React, { useEffect, useState } from "react";
import { BeverageIllustration } from "./BeverageIllustration";
import { MENU_ITEM_IMAGE_PLACEHOLDER, resolveMenuImageUrl, withAssetVersion } from "../utils/menuImageHelper";

const isPlaceholder = (value) => String(value || "").split("?")[0].replace(/\\/g, "/").toLowerCase() === MENU_ITEM_IMAGE_PLACEHOLDER.toLowerCase();

export default function MenuItemVisual({ item, className = "", style }) {
  const source = [item?.imageUrl, item?.image_url, item?.image, item?.ImageUrl]
    .find((value) => typeof value === "string" && value.trim() && !isPlaceholder(value.trim()));
  const src = source ? withAssetVersion(resolveMenuImageUrl(source.trim())) : "";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return <span className={`menu-item-visual ${className}`.trim()} style={style}>
    <BeverageIllustration item={item} />
    {src && !failed && <img className="menu-item-visual-image" src={src} alt="" onError={() => setFailed(true)} />}
  </span>;
}
