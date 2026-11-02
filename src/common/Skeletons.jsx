import React from "react";
import "./Skeletons.css";

export function SkeletonText({ width = "100%", height = "0.8rem", className = "" }) {
  return <span aria-hidden="true" className={`app-skeleton ${className}`} style={{ width, height }} />;
}

export function SkeletonTitle({ width = "48%" }) {
  return <SkeletonText width={width} height="1.35rem" className="app-skeleton-title" />;
}

export function SkeletonAvatar({ size = 40 }) {
  return <span aria-hidden="true" className="app-skeleton app-skeleton-avatar" style={{ width: size, height: size }} />;
}

export function SkeletonImage({ height = 120, className = "" }) {
  return <span aria-hidden="true" className={`app-skeleton app-skeleton-image ${className}`} style={{ height }} />;
}

export function SkeletonInput() {
  return <span aria-hidden="true" className="app-skeleton app-skeleton-input" />;
}

export function SkeletonDropdown() {
  return <span aria-hidden="true" className="app-skeleton app-skeleton-input app-skeleton-dropdown" />;
}

export function SkeletonButton({ width = 96 }) {
  return <span aria-hidden="true" className="app-skeleton app-skeleton-button" style={{ width }} />;
}

export function SkeletonCard({ lines = 3, className = "" }) {
  return <div aria-hidden="true" className={`app-skeleton-card ${className}`}>
    <SkeletonTitle />
    {Array.from({ length: lines }, (_, index) => <SkeletonText key={index} width={index === lines - 1 ? "65%" : "88%"} />)}
  </div>;
}

export function SkeletonOrderTicket({ className = "" }) {
  return <article className={`app-skeleton-order-ticket ${className}`} aria-hidden="true">
    <header><SkeletonAvatar size={42} /><div><SkeletonText width="6rem" /><SkeletonText width="4rem" /></div><SkeletonButton width={72} /></header>
    <div className="app-skeleton-order-ticket-meta"><SkeletonText width="42%" /><SkeletonText width="32%" /></div>
    <div className="app-skeleton-order-ticket-items">{Array.from({ length: 3 }, (_, index) => <div key={index}><SkeletonText width="65%" /><SkeletonText width="24%" /></div>)}</div>
    <footer><SkeletonButton width="48%" /><SkeletonButton width="48%" /></footer>
  </article>;
}

export function SkeletonMenuCard({ className = "" }) {
  return <div className={`app-skeleton-menu-card ${className}`} aria-hidden="true">
    <SkeletonImage height={150} />
    <SkeletonTitle width="72%" />
    <SkeletonText width="90%" />
    <SkeletonText width="42%" />
  </div>;
}

export function SkeletonTableRow({ columns = 5 }) {
  return <div aria-hidden="true" className="app-skeleton-row" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {Array.from({ length: columns }, (_, index) => <SkeletonText key={index} width={index === 0 ? "72%" : "56%"} />)}
  </div>;
}

export function SkeletonTable({ rows = 5, columns = 5, className = "" }) {
  return <div className={`app-skeleton-table ${className}`} role="status" aria-label="Loading data">
    <div aria-hidden="true" className="app-skeleton-row app-skeleton-table-head" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, index) => <SkeletonText key={index} width="48%" />)}
    </div>
    {Array.from({ length: rows }, (_, index) => <SkeletonTableRow key={index} columns={columns} />)}
  </div>;
}

export function SkeletonList({ count = 4, className = "" }) {
  return <div className={`app-skeleton-list ${className}`} role="status" aria-label="Loading list">
    {Array.from({ length: count }, (_, index) => <div className="app-skeleton-list-item" key={index}><SkeletonAvatar /><div><SkeletonText width="9rem" /><SkeletonText width="6rem" /></div></div>)}
  </div>;
}

export function SkeletonDashboard({ cards = 4, className = "" }) {
  return <div className={`app-skeleton-dashboard ${className}`} role="status" aria-label="Loading dashboard">
    <div className="app-skeleton-dashboard-cards">{Array.from({ length: cards }, (_, index) => <SkeletonCard key={index} lines={2} />)}</div>
    <SkeletonCard lines={5} />
  </div>;
}

export function SkeletonForm({ fields = 4, className = "" }) {
  return <div className={`app-skeleton-form ${className}`} role="status" aria-label="Loading form">
    {Array.from({ length: fields }, (_, index) => <div key={index}><SkeletonText width="6rem" /><SkeletonInput /></div>)}
    <SkeletonButton />
  </div>;
}

export function SkeletonChart({ height = 220, className = "" }) {
  return <div aria-hidden="true" className={`app-skeleton-chart ${className}`} style={{ height }}>
    {Array.from({ length: 8 }, (_, index) => <SkeletonText key={index} width="7%" height={`${28 + ((index * 31) % 65)}%`} />)}
  </div>;
}

export function SkeletonModal({ lines = 4, className = "" }) {
  return <div aria-hidden="true" className={`app-skeleton-modal ${className}`}>
    <SkeletonTitle width="55%" />
    {Array.from({ length: lines }, (_, index) => <SkeletonText key={index} width={index === lines - 1 ? "62%" : "100%"} />)}
    <div><SkeletonButton /><SkeletonButton /></div>
  </div>;
}

export function SkeletonDetail({ className = "" }) {
  return <div className={`app-skeleton-detail ${className}`} role="status" aria-label="Loading details">
    <SkeletonImage height={210} />
    <SkeletonTitle width="62%" />
    <SkeletonText width="92%" />
    <SkeletonText width="78%" />
    <SkeletonText width="45%" />
  </div>;
}
