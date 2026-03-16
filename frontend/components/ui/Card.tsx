"use client";

import "./card.css";
import React from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Card({ title, children, className = "" }: Props) {
  return (
    <div className={`card-container ${className}`}>
      {title && (
        <h3 className="card-title">{title}</h3>
      )}
      {children}
    </div>
  );
}