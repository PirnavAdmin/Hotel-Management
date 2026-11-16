import React from "react";
import { Clock, Flame, Minus, Plus, Sparkles, Utensils } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { getMenuItemImage, handleDishImageError } from "../utils/menuImageHelper";
import MenuItemVisual from "./MenuItemVisual";
import "./MenuItemCard.css";

/** Shared menu card used by both Dine In and Takeaway. Cart actions stay owned by each screen. */
export function MenuItemCard({
  item,
  quantity = 0,
  onAdd,
  onQuantityChange,
  onOpen,
  orderMode = "food",
  descriptionProps = {},
}) {
  const isAvailable = item?.isAvailable !== false;
  const isVeg = item?.dietaryType?.toUpperCase() === "VEG" || item?.isVeg;
  const isSpecial = item?.isChefSpecial || item?.isChefsSpecial || item?.isSpecial;
  const prepTime = item?.prepTime || `${item?.prepTimeMinutes || 15} min`;

  const stopCardClick = (event) => event.stopPropagation();

  return (
    <article
      className={`pos-menu-card ${quantity > 0 ? "has-qty" : ""} ${!isAvailable ? "is-unavailable" : ""}`}
      onClick={isAvailable && onOpen ? () => onOpen(item) : undefined}
      style={{ cursor: !isAvailable ? "not-allowed" : onOpen ? "pointer" : undefined }}
    >
      <div className="pos-menu-card-image">
        {orderMode === "bar" ? (
          <MenuItemVisual item={item} className="pos-menu-card-image-img" />
        ) : (
          <img
            src={getMenuItemImage(item)}
            alt={item?.name || "Menu item"}
            loading="lazy"
            className="pos-menu-card-image-img"
            onError={(event) => handleDishImageError(event, item)}
          />
        )}
        {orderMode !== "bar" && (
          <div className="pos-menu-card-image-fallback" aria-hidden="true">
            <Utensils size={36} color="var(--accent-amber)" />
          </div>
        )}
        {!isAvailable && (
          <div className="pos-menu-card-unavailable-overlay">
            <span>Unavailable</span>
          </div>
        )}
        <div className="pos-menu-badge">
          <span className={`pos-menu-dietary-dot ${isVeg ? "is-veg" : "is-non-veg"}`} />
          <span>{isVeg ? "VEG" : "NON-VEG"}</span>
        </div>
        {isSpecial && (
          <div className="pos-menu-chef" title="Chef's Pick">
            <Sparkles size={11} />
          </div>
        )}
        <div className="pos-menu-time">
          <Clock size={10} />
          <span>{prepTime}</span>
        </div>
      </div>

      <div className="pos-menu-card-content">
        <div className="pos-menu-card-information">
          <div className="pos-menu-card-title-row">
            <h4 className="pos-menu-card-title">{item?.name}</h4>
            {Number(item?.spiceLevel) > 0 && (
              <span className="pos-menu-card-spice" title={`Spicy Level: ${item.spiceLevel}`}>
                {[...Array(Math.min(5, Number(item.spiceLevel)))].map((_, index) => (
                  <Flame key={index} size={11} fill="#ef4444" />
                ))}
              </span>
            )}
          </div>
          <p className="pos-menu-card-description" {...descriptionProps}>
            {item?.description || " "}
          </p>
        </div>

        <div className="pos-menu-card-footer">
          <span className="font-mono pos-menu-card-price">{formatCurrency(item?.price)}</span>
          {!isAvailable ? (
            <span className="pos-menu-unavailable-label">Unavailable</span>
          ) : quantity === 0 ? (
            <button
              type="button"
              className="pos-menu-add"
              title="Add to Cart"
              onClick={(event) => {
                stopCardClick(event);
                onAdd?.(item);
              }}
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          ) : (
            <div className="pos-menu-qty" onClick={stopCardClick}>
              <button
                type="button"
                aria-label={`Remove one ${item?.name}`}
                onClick={() => onQuantityChange?.(item, quantity - 1)}
              >
                <Minus size={12} />
              </button>
              <span className="font-mono pos-menu-qty-count" aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label={`Add one ${item?.name}`}
                onClick={() => onQuantityChange?.(item, quantity + 1)}
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default MenuItemCard;
