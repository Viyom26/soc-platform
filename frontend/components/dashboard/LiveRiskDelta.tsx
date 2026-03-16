"use client";

type Props = {
  delta: number;
};

export default function LiveRiskDelta({ delta }: Props) {
  return (
    <span className={delta > 0 ? "text-red-500" : "text-green-500"}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}